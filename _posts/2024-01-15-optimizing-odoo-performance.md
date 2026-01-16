---
layout: post
title: "Optimizing Odoo Performance: Advanced PostgreSQL Techniques"
date: 2024-01-15 10:00:00 +0000
categories: [Odoo Dev, Performance, PostgreSQL]
tags: [odoo, postgresql, performance, optimization, database]
reading_time: 8
excerpt: "Learn advanced PostgreSQL optimization techniques specifically for Odoo deployments, including query tuning, indexing strategies, and caching implementations."
---

As Odoo deployments scale and data volumes grow, database performance becomes critical for maintaining user experience and system responsiveness. In this comprehensive guide, I'll share advanced PostgreSQL optimization techniques that I've successfully implemented in enterprise Odoo environments.

## Understanding Odoo's Database Architecture

Before diving into optimization techniques, it's essential to understand how Odoo interacts with PostgreSQL:

```python
# Example of a typical Odoo ORM query
products = self.env['product.product'].search([
    ('active', '=', True),
    ('company_id', '=', self.env.company.id)
])
```

This simple query translates to complex SQL that can benefit significantly from optimization.

## 1. Strategic Indexing

### Composite Indexes for Multi-Column Queries

Odoo frequently queries on multiple columns simultaneously. Create composite indexes that match your common query patterns:

```sql
-- For product searches with company and active status
CREATE INDEX idx_product_company_active 
ON product_product (company_id, active, id);

-- For sales orders with customer and date
CREATE INDEX idx_sale_order_partner_date 
ON sale_order (partner_id, date_order DESC, state);
```

### Partial Indexes for Filtered Data

When queries consistently filter on specific conditions, partial indexes can be more efficient:

```sql
-- Only index active products
CREATE INDEX idx_product_active_name 
ON product_product (name) 
WHERE active = true;

-- Index only draft/pending orders
CREATE INDEX idx_order_state_date 
ON sale_order (date_order) 
WHERE state IN ('draft', 'sent');
```

## 2. Query Optimization Techniques

### Analyze Slow Queries

Use PostgreSQL's query analysis to identify bottlenecks:

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Analyze specific queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM sale_order 
WHERE partner_id = 1234 
AND date_order >= '2024-01-01';
```

### Optimize Common Odoo Patterns

**Pattern 1: Many-to-Many Relationships**

```sql
-- Instead of this slow query:
SELECT * FROM sale_order_line 
WHERE order_id IN (
    SELECT id FROM sale_order 
    WHERE partner_id = 1234
);

-- Use JOIN optimization:
SELECT sol.* FROM sale_order_line sol
JOIN sale_order so ON sol.order_id = so.id
WHERE so.partner_id = 1234;
```

**Pattern 2: Hierarchical Data**

```sql
-- Optimize parent-child relationships with recursive CTEs:
WITH RECURSIVE category_tree AS (
    SELECT id, parent_id, name 
    FROM product_category 
    WHERE id = :category_id
    
    UNION ALL
    
    SELECT c.id, c.parent_id, c.name 
    FROM product_category c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree;
```

## 3. Connection Pooling and Configuration

### Optimize PostgreSQL Configuration

```ini
# postgresql.conf optimizations for Odoo

# Memory settings
shared_buffers = 25% of RAM
effective_cache_size = 75% of RAM
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
```

### Implement PgBouncer for Connection Pooling

```ini
# pgbouncer.ini
[databases]
odoo_db = host=localhost port=5432 dbname=odoo

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
logfile = /var/log/pgbouncer/pgbouncer.log
admin_users = postgres
stats_users = stats, postgres

# Pool settings
pool_mode = transaction
max_client_conn = 200
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
max_db_connections = 50
max_user_connections = 50
```

## 4. Caching Strategies

### Redis Integration for Odoo

Implement Redis caching for frequently accessed data:

```python
# Custom caching decorator
import redis
import functools
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_result(expiration=3600):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            # Generate cache key
            cache_key = f"{self._name}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Execute function and cache result
            result = func(self, *args, **kwargs)
            redis_client.setex(cache_key, expiration, json.dumps(result))
            return result
        return wrapper
    return decorator

# Usage in Odoo model
class ProductProduct(models.Model):
    _name = 'product.product'
    
    @cache_result(expiration=1800)
    def get_product_stats(self, product_ids):
        # Expensive computation
        return self.compute_statistics(product_ids)
```

## 5. Partitioning for Large Tables

### Time-Based Partitioning

For tables with high data volume like stock moves or audit logs:

```sql
-- Create partitioned table
CREATE TABLE stock_move (
    id SERIAL,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    location_dest_id INTEGER NOT NULL,
    create_date TIMESTAMP NOT NULL,
    state VARCHAR(20) NOT NULL,
    -- other fields
) PARTITION BY RANGE (create_date);

-- Create monthly partitions
CREATE TABLE stock_move_2024_01 
PARTITION OF stock_move 
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE stock_move_2024_02 
PARTITION OF stock_move 
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### Automatic Partition Management

```sql
-- Function to create new partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    start_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

## 6. Monitoring and Maintenance

### Essential Monitoring Queries

```sql
-- Monitor slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Monitor table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Automated Maintenance

```python
# Odoo scheduled action for database maintenance
from odoo import api, models

class DatabaseMaintenance(models.Model):
    _name = 'database.maintenance'
    
    @api.model
    def weekly_maintenance(self):
        """Perform weekly database maintenance tasks"""
        with self.env.cr._cnx.cursor() as new_cr:
            # Update table statistics
            new_cr.execute("ANALYZE;")
            
            # Reindex frequently used tables
            tables_to_reindex = ['sale_order', 'purchase_order', 'stock_move']
            for table in tables_to_reindex:
                new_cr.execute(f"REINDEX TABLE {table};")
            
            # Clean up old sessions
            new_cr.execute("""
                DELETE FROM ir_session 
                WHERE create_date < NOW() - INTERVAL '7 days'
            """)
```

## 7. Advanced Performance Tips

### Use Materialized Views for Complex Reports

```sql
-- Create materialized view for sales analytics
CREATE MATERIALIZED VIEW mv_sales_analytics AS
SELECT 
    DATE_TRUNC('month', so.date_order) as month,
    so.company_id,
    so.partner_id,
    SUM(sol.price_total) as total_sales,
    COUNT(sol.id) as line_count
FROM sale_order so
JOIN sale_order_line sol ON so.id = sol.order_id
WHERE so.state IN ('sale', 'done')
GROUP BY DATE_TRUNC('month', so.date_order), so.company_id, so.partner_id;

-- Create unique index for fast refresh
CREATE UNIQUE INDEX idx_sales_analytics_month_company_partner 
ON mv_sales_analytics (month, company_id, partner_id);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_sales_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_analytics;
END;
$$ LANGUAGE plpgsql;
```

### Optimize Odoo ORM Usage

```python
# Bad: N+1 query problem
orders = self.env['sale.order'].search([])
for order in orders:
    print(order.partner_id.name)  # Separate query for each partner

# Good: Prefetch related records
orders = self.env['sale.order'].search([])
orders.read(['partner_id', 'amount_total'])  # Single query

# Even better: Use specific fields and limit
orders = self.env['sale.order'].search(
    [('state', '=', 'sale')],
    limit=100
)
orders.mapped('partner_id.name')  # Optimized access
```

## Conclusion

Implementing these PostgreSQL optimization techniques can significantly improve your Odoo deployment's performance. Remember that:

1. **Monitor first** - Always identify actual bottlenecks before optimizing
2. **Test thoroughly** - Validate optimizations in a staging environment
3. **Measure results** - Use performance metrics to verify improvements
4. **Maintain regularly** - Database optimization is an ongoing process

The key is finding the right balance between query performance, storage efficiency, and maintenance overhead for your specific use case.

Have you implemented any of these techniques? Share your experiences and additional tips in the comments!