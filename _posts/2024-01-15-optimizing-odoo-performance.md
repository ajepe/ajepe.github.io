---
layout: post
title: "PostgreSQL for Odoo: Things I Wish I Knew Earlier"
date: 2024-01-15 10:00:00 +0000
categories: [Odoo Dev, PostgreSQL]
tags: [odoo, postgresql, database, performance]
reading_time: 10
excerpt: "After years of debugging slow Odoo installations, here are the PostgreSQL lessons that actually made a difference - the hard-won kind."
---

# PostgreSQL for Odoo: Things I Wish I Knew Earlier

I learned PostgreSQL the hard way - through emergencies at 2 AM, clients asking why their system is "just slow," and lots of head-scratching. Here's what actually helped.

## The Day PostgreSQL Stopped Working

I'll never forget the day a client's Odoo just... stopped. The database had crashed and wouldn't restart. Turns out they had:

- 0 bytes of memory allocated to PostgreSQL in the config (it was using default!)
- max_connections set to 200 but only 5 actual connections were possible
- No idea what any of this meant

That day I learned: PostgreSQL defaults are for development, not production.

## The Config That Actually Works

After many iterations, here's what I use for a production Odoo server (16GB RAM, PostgreSQL on separate server):

```ini
# postgresql.conf

# Memory - the big one
shared_buffers = 4GB              # 25% of RAM
effective_cache_size = 12GB       # 75% of RAM
work_mem = 256MB                  # Per connection, be careful
maintenance_work_mem = 512MB     # For VACUUM, indexes

# Connections
max_connections = 100             # Lower is fine with PgBouncer
superuser_reserved_connections = 3

# WAL
wal_buffers = 16MB
checkpoint_completion_target = 0.9
min_wal_size = 1GB
max_wal_size = 4GB

# Query planner
random_page_cost = 1.1           # For SSDs!
effective_io_concurrency = 200
```

The biggest win? `random_page_cost`. If you're on SSDs (which you should be), set this to 1.1. PostgreSQL defaults to 4.0, which assumes spinning disks and leads to terrible query plans.

## The Index Story

I used to think "more indexes = faster queries." I was wrong. Too many indexes slow down writes and use disk space.

Here's what I actually index now:

```sql
-- For the common "find orders by customer and date" query
CREATE INDEX idx_sale_order_partner_date 
ON sale_order (partner_id, date_order DESC);

-- For the "show me all confirmed orders" query
CREATE INDEX idx_sale_order_state_date
ON sale_order (state, date_order DESC)
WHERE state IN ('sale', 'done');
```

The second one is a **partial index** - it only indexes confirmed orders, which is what users actually query most.

## The Query That Wouldn't Finish

We had a report that took 45 minutes to generate. FORTY FIVE MINUTES. Users complained, management complained, I debugged.

The query looked innocent:
```sql
SELECT * FROM sale_order_line 
WHERE order_id IN (
    SELECT id FROM sale_order 
    WHERE partner_id = 123
)
```

But PostgreSQL executed the subquery for EVERY row. The fix was simple:

```sql
-- Use a JOIN instead
SELECT sol.* 
FROM sale_order_line sol
JOIN sale_order so ON sol.order_id = so.id
WHERE so.partner_id = 123
```

Same results, 50ms instead of 45 minutes. The lesson: in PostgreSQL, always prefer JOINs over IN (subqueries) when possible.

## Monitoring That Actually Helps

I don't use fancy tools. I use queries that tell me what's wrong:

```sql
-- What's slow right now?
SELECT 
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 5;

-- Missing indexes (tables being scanned seqentially)
SELECT schemaname, relname, seq_scan, seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 5;

-- Connection status
SELECT state, COUNT(*) 
FROM pg_stat_activity 
WHERE datname = current_database() 
GROUP BY state;
```

Run these before you reach for expensive monitoring tools.

## The Caching Mistake

I once implemented Redis caching and... it returned stale data for 3 days. The client called asking why their product prices weren't updating.

Lesson: cache invalidation is hard. My approach now:

1. Don't cache user-specific data
2. Keep cache TTLs short (15-30 minutes)
3. Clear specific caches on relevant writes:
```python
def write(self, vals):
    result = super().write(vals)
    if 'list_price' in vals:
        # Clear product price cache
        redis_client.delete(f"prices:{self.id}")
    return result
```

## What I'd Tell My Past Self

1. **Test with realistic data** - A query on 100 records tells you nothing about production with 10 million

2. **pg_stat_statements is your friend** - Enable it, look at the slow queries, fix those first:
```sql
CREATE EXTENSION pg_stat_statements;
-- Then query:
SELECT query, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

3. **VACUUM matters** - Set up autovacuum or run VACUUM ANALYZE manually after big data loads

4. **Connection pooling is essential** - PgBouncer is easy to set up and prevents connection exhaustion

## The Real Truth

Most Odoo performance issues aren't that complicated. Usually it's:

1. Missing indexes on commonly-queried fields
2. PostgreSQL using default config
3. One slow query blocking everything

Start simple. Check your slow queries. Add indexes. Optimize config. That's 90% of what you'll ever need.

What's your PostgreSQL horror story? Share in the comments - we all have them.
