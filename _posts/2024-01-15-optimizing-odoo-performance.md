---
layout: post
title: "PostgreSQL for Odoo: Things I Wish I Knew Earlier"
date: 2024-01-15 10:00:00 +0000
categories: [Odoo Dev, PostgreSQL]
tags: [odoo, postgresql, database, performance, odoo optimization, odoo specialist, odoo consultant, speed up odoo]
reading_time: 9
excerpt: "Most slow Odoo systems I get called in to fix have the same few PostgreSQL problems. Here's what I check first, and what actually made a difference."
---

Most of what I know about PostgreSQL I learned the hard way: emergencies at 2 AM, clients telling me the system is "just slow", and a lot of staring at query plans. This is the stuff that actually helped.

## The day Odoo just stopped

I still remember the first time a client's Odoo stopped responding completely. Pages hung, then failed. The Odoo log was full of:

```text
FATAL:  sorry, too many clients already
```

Postgres was still running with the config it shipped with: 128MB of `shared_buffers` on a 16GB server, and the default `max_connections = 100`. Meanwhile Odoo had been scaled up to more workers, and every worker keeps its own pool of connections (up to `db_maxconn`, default 64). Add the cron threads and the longpolling process, and Odoo was asking for far more connections than Postgres would hand out.

That's when I learned that PostgreSQL's defaults are built to start on anything, not to run a busy ERP. You have to tune them.

## The config I start from

This is my starting point for a dedicated database server with 16GB RAM. Adjust to your hardware, but it's a lot better than the defaults:

```ini
# postgresql.conf

# Memory
shared_buffers = 4GB                # ~25% of RAM
effective_cache_size = 12GB         # ~75% of RAM; a planner hint, not an allocation
work_mem = 64MB                     # per sort/hash operation, not per connection
maintenance_work_mem = 1GB          # VACUUM, CREATE INDEX

# Connections
max_connections = 200               # must cover Odoo workers x db_maxconn, or use PgBouncer

# WAL / checkpoints
wal_buffers = 16MB
checkpoint_completion_target = 0.9
min_wal_size = 1GB
max_wal_size = 4GB

# Planner, for SSD storage
random_page_cost = 1.1
effective_io_concurrency = 200
```

A word on `work_mem`. It's per operation, and one complex query can run several sorts and hashes at once. 64MB times a few operations times 100 busy connections can eat your RAM fast. I've seen configs online with 256MB, and that's how you meet the OOM killer.

On the Odoo side, set `db_maxconn` in `odoo.conf` deliberately. It's per worker, so `workers × db_maxconn` (plus a few for crons and longpolling) has to fit under `max_connections`. I usually bring it down to 16–32.

The single biggest win in that config is usually `random_page_cost`. The default of 4.0 assumes spinning disks, where random reads are expensive. On SSDs that assumption makes Postgres avoid indexes it should be using. Set it to 1.1 and watch some queries drop from seconds to milliseconds.

## Indexes: more isn't better

I used to think every slow query needed a new index. It doesn't. Each index slows down writes and takes disk space, and Odoo tables like `stock_move` and `account_move_line` get written to constantly.

These days I add an index only when a specific slow query needs it:

```sql
-- "Orders for this customer, newest first", which the sales team runs all day
CREATE INDEX idx_sale_order_partner_date
ON sale_order (partner_id, date_order DESC);

-- Confirmed orders only, since that's what the reports filter on
CREATE INDEX idx_sale_order_confirmed_date
ON sale_order (date_order DESC)
WHERE state = 'sale';
```

The second one is a partial index. It only covers confirmed orders, so it's smaller and faster than indexing the whole table.

One Odoo-specific tip: if the index is part of a custom module, don't leave it as a manual SQL script someone has to remember to run. Put `index=True` on the field, or create the index in the model's `init()` method, so it's there after every install and upgrade.

## The report that took 45 minutes

We had a report that took 45 minutes to run. Users complained, management complained, and I went looking.

The query that caused it was meant to find order lines that hadn't been invoiced yet:

```sql
SELECT sol.id, sol.name
FROM sale_order_line sol
WHERE sol.id NOT IN (
    SELECT order_line_id FROM sale_order_line_invoice_rel
);
```

It looks innocent. The problem is `NOT IN`. Because of how `NOT IN` treats NULLs, Postgres can't turn it into an anti-join. It can only build a hash of the subquery result, and only if that hash fits in `work_mem`. This one didn't, so Postgres fell back to scanning the subquery's result once for every single order line.

The fix was `NOT EXISTS`, which Postgres can plan as a proper anti-join:

```sql
SELECT sol.id, sol.name
FROM sale_order_line sol
WHERE NOT EXISTS (
    SELECT 1
    FROM sale_order_line_invoice_rel rel
    WHERE rel.order_line_id = sol.id
);
```

Same result here (that column is never NULL), and the report went from 45 minutes to a few seconds.

The lesson isn't "never use subqueries". Plain `IN (SELECT ...)` is fine in modern Postgres, which rewrites it as a join. It's `NOT IN` with a big subquery that bites. And whenever something's slow, run `EXPLAIN (ANALYZE, BUFFERS)` on it before guessing.

## The queries I run first

I don't start with fancy monitoring tools. These few queries usually tell me what's wrong:

```sql
-- What's running right now, longest first
SELECT now() - query_start AS duration, state, wait_event_type, left(query, 120) AS query
FROM pg_stat_activity
WHERE state <> 'idle' AND datname = current_database()
ORDER BY duration DESC
LIMIT 10;

-- Tables that get read sequentially a lot (index candidates)
SELECT relname, seq_scan, seq_tup_read, idx_scan, n_live_tup
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC
LIMIT 10;

-- Connections by state
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
```

A large table with a high `seq_tup_read` and a low `idx_scan` is usually missing an index. Lots of `idle in transaction` connections usually means something is holding transactions open, often a long-running cron.

## The caching mistake

Once I added Redis caching for product prices and it served stale prices for three days before the client noticed. They called to ask why their price changes weren't showing up.

Cache invalidation really is as hard as people say. My rules now:

1. Don't cache anything user-specific.
2. Keep TTLs short (15–30 minutes), so a missed invalidation fixes itself.
3. Clear the exact keys when the underlying data changes:

```python
def write(self, vals):
    result = super().write(vals)
    if 'list_price' in vals and self.ids:
        redis_client.delete(*[f"prices:{product_id}" for product_id in self.ids])
    return result
```

Note it's `self.ids`, not `self.id`. `self.id` crashes the moment someone updates several products at once from the list view. Odoo methods can always receive more than one record, so write them that way.

## What I'd tell my past self

**Test with realistic data.** A query that's fast on 100 rows tells you nothing about 10 million. Restore a copy of production on staging and test against that.

**Turn on `pg_stat_statements`.** It shows which queries take the most total time, and that's where to start. It has to be preloaded, which means a restart:

```ini
# postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
```

```sql
CREATE EXTENSION pg_stat_statements;

-- PostgreSQL 13+ (older versions call these total_time / mean_time)
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time) AS mean_ms, left(query, 100)
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

**Don't fight autovacuum.** Leave it on. After a big import or data migration, run `VACUUM ANALYZE` yourself, so the planner isn't working from stale statistics.

**Use a connection pooler when connections become the bottleneck.** PgBouncer is easy to set up. One Odoo-specific catch: the longpolling/websocket worker uses `LISTEN/NOTIFY`, which doesn't work through PgBouncer's transaction pooling. Use session pooling, or point that worker straight at Postgres.

## Most of the time it's simple

Most Odoo performance problems I get called in for come down to the same few things:

1. Postgres still running on default settings
2. A missing index on something users filter by all day
3. One bad query (or one runaway cron) holding everything else up

Check the config, find the slowest queries, fix those, measure again. That covers most of it.

If you've got a slow Odoo system and can't figure out why, [get in touch](/contact/). It's my favourite kind of problem.
