---
layout: post
title: "Odoo Performance Mastery: The Complete Guide to Optimizing Your Enterprise Deployment"
date: 2024-01-15 10:00:00 +0000
categories: [Odoo Dev, Performance, PostgreSQL]
tags: [odoo, postgresql, performance, optimization, database, redis, caching]
reading_time: 20
excerpt: "A comprehensive guide to optimizing Odoo performance at scale. Learn PostgreSQL tuning, Redis caching, query optimization, and enterprise-level strategies used by top Odoo implementations."
---

# Odoo Performance Mastery: The Complete Guide to Optimizing Your Enterprise Deployment

Performance is not an afterthought—it's a feature. In enterprise Odoo deployments, every second of delay costs money. Users abandon slow systems, processes stall, and business operations suffer.

After optimizing dozens of large-scale Odoo implementations, I've compiled this comprehensive guide covering everything from quick wins to advanced enterprise strategies.

## Table of Contents

1. [Understanding the Performance Landscape](#landscape)
2. [PostgreSQL Configuration Deep Dive](#postgresql-config)
3. [Indexing Strategies That Actually Work](#indexing)
4. [Query Optimization Patterns](#query-patterns)
5. [Redis Caching Architecture](#redis)
6. [Application-Level Optimizations](#app-level)
7. [Monitoring & Observability](#monitoring)
8. [Scaling Strategies](#scaling)
9. [Real-World Case Studies](#case-studies)

---

## Understanding the Performance Landscape {#landscape}

Before diving into specific optimizations, let's understand where bottlenecks typically occur in Odoo:

```
┌─────────────────────────────────────────────────────────────┐
│                    Odoo Performance Layers               │
├─────────────────────────────────────────────────────────────┤
│  🖥️ Browser     │  Rendering, JavaScript, Assets        │
├──────────────────┼────────────────────────────────────────┤
│  🌐 Web Server   │  Nginx, Static Files, SSL             │
├──────────────────┼────────────────────────────────────────┤
│  ⚙️  Odoo       │  ORM, Business Logic, Controllers    │
├──────────────────┼────────────────────────────────────────┤
│  🗄️  Database   │  PostgreSQL, Queries, Connections     │
├──────────────────┼────────────────────────────────────────┤
│  💾  Cache      │  Redis, pgBouncer, Object Cache      │
└─────────────────────────────────────────────────────────────┘
```

Most critical bottlenecks in enterprise Odoo:
- **Database queries** (60% of issues)
- **Connection pooling** (15%)
- **Caching** (15%)
- **Application logic** (10%)

---

## PostgreSQL Configuration Deep Dive {#postgresql-config}

### Essential Configuration Parameters

The default PostgreSQL configuration is designed for development. For production Odoo, adjust these settings:

```ini
# postgresql.conf

# ===================
# MEMORY CONFIGURATION
# ===================

# Shared memory for caching table data (25-40% of RAM for dedicated DB server)
shared_buffers = 8GB

# Memory for sorting and hash operations (per connection, but capped)
work_mem = 64MB

# Memory for maintenance operations (VACUUM, CREATE INDEX)
maintenance_work_mem = 2GB

# Memory for parallel queries
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
parallel_leader_participation = on

# Effective cache size (75-80% of RAM, shared_buffers + OS cache)
effective_cache_size = 24GB


# ===================
# WRITE AHEAD LOG (WAL)
# ===================

# WAL level for performance (not needed for production replicas)
wal_level = replica

# Synchronization strategy
synchronous_commit = off

# Checkpoint timing
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9

# WAL buffers
wal_buffers = 16MB


# ===================
# QUERY PLANNER
# ===================

# Cost constants
random_page_cost = 1.1  # For SSDs
effective_io_concurrency = 200

# Planner statistics
default_statistics_target = 1000


# ===================
# CONNECTIONS
# ===================

max_connections = 200

# Prepared transactions
max_prepared_transactions = 0  # Disable if not using


# ===================
# LOGGING & MONITORING
# ===================

# Slow query logging
log_min_duration_statement = 1000  # Log queries > 1 second
log_connections = on
log_disconnections = on

# Extensions
shared_preload_libraries = 'pg_stat_statements,pg_cron'
```

### Critical Extensions

Enable these PostgreSQL extensions for Odoo:

```sql
-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Trigram similarity for ILIKE
CREATE EXTENSION IF NOT EXISTS btree_gin;  -- GIN indexes for arrays
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Indexing Strategies That Actually Work {#indexing}

### Composite Indexes

Create indexes matching your query patterns, not just single columns:

```sql
-- ❌ BAD: Single column indexes (PostgreSQL can only use one)
CREATE INDEX idx_sale_order_partner ON sale_order(partner_id);
CREATE INDEX idx_sale_order_date ON sale_order(date_order);
CREATE INDEX idx_sale_order_state ON sale_order(state);

-- ✅ GOOD: Composite index matching actual query patterns
CREATE INDEX idx_sale_order_partner_date_state 
ON sale_order (partner_id, date_order DESC, state);

-- This query now uses a single index scan:
-- SELECT * FROM sale_order 
-- WHERE partner_id = 123 
-- AND date_order >= '2024-01-01'
-- AND state IN ('sale', 'done');
```

### Partial Indexes

Index only the data you frequently query:

```sql
-- Only index active records (most common filter)
CREATE INDEX idx_product_active_name 
ON product_product (name) 
WHERE active = true;

-- Only index confirmed orders
CREATE INDEX idx_sale_order_confirmed 
ON sale_order (date_order DESC, partner_id) 
WHERE state IN ('sale', 'done');

-- Only index current year data for frequently accessed reports
CREATE INDEX idx_account_move_2024 
ON account_move (date, move_type, company_id) 
WHERE date >= '2024-01-01';
```

### Expression Indexes

Speed up computed values:

```sql
-- For case-insensitive searches
CREATE INDEX idx_partner_name_lower 
ON res_partner (lower(name));

-- For partial matches (requires pg_trgm)
CREATE INDEX idx_product_name_trgm 
ON product_product USING gin (name gin_trgm_ops);

-- For date extractions
CREATE INDEX idx_order_month 
ON sale_order (DATE_TRUNC('month', date_order));
```

### Covering Indexes

Include frequently retrieved columns to avoid table lookups:

```sql
-- Covering index for order list views
CREATE INDEX idx_sale_order_cover 
ON sale_order (date_order DESC, state, partner_id) 
INCLUDE (name, amount_total, currency_id);

-- Now this query needs no table access:
-- SELECT date_order, name, amount_total 
-- FROM sale_order 
-- WHERE state = 'sale' 
-- ORDER BY date_order DESC 
-- LIMIT 20;
```

---

## Query Optimization Patterns {#query-patterns}

### The N+1 Problem

The most common ORM performance killer:

```python
# ❌ BAD: N+1 queries - one query per order
orders = self.env['sale.order'].search([])
for order in orders:
    print(order.partner_id.name)  # NEW query for EACH order!
    for line in order.order_line:
        print(line.product_id.name)  # ANOTHER query per line!

# ✅ GOOD: Prefetch related records
orders = self.env['sale.order'].search([])
# Prefetch partners and lines in 3 queries total
for order in orders:
    print(order.partner_id.name)  # Uses prefetched data
    for line in order.order_line:
        print(line.product_id.name)  # Uses prefetched data

# ✅ BETTER: Explicit prefetch
orders = self.env['sale.order'].search([])
orders.fetch(['partner_id', 'name', 'amount_total'])
for order in orders:
    print(order.partner_id.name)
```

### Optimizing Search Operations

```python
# ❌ BAD: Multiple searches
partners = self.env['res.partner'].search([('customer', '=', True)])
emails = [p.email for p in partners if p.email]

# ✅ GOOD: Single search with fields
partners = self.env['res.partner'].search_read(
    [('customer', '=', True)],
    ['name', 'email']
)
emails = [p['email'] for p in partners if p['email']]

# ✅ BEST: Use raw SQL for bulk operations
self.env.cr.execute("""
    SELECT name, email 
    FROM res_partner 
    WHERE customer = true 
    AND email IS NOT NULL
""")
results = self.env.cr.dictfetchall()
```

### Batch Processing

```python
# Process records in batches to avoid memory issues
BATCH_SIZE = 1000

def process_large_dataset(self):
    domain = [('state', '=', 'draft')]
    total = self.env['sale.order'].search_count(domain)
    
    for offset in range(0, total, BATCH_SIZE):
        batch = self.env['sale.order'].search(
            domain, 
            limit=BATCH_SIZE, 
            offset=offset
        )
        
        for order in batch:
            # Process each order
            self._process_order(order)
        
        # Commit batch to free memory
        self.env.cr.commit()
```

---

## Redis Caching Architecture {#redis}

### Installing and Configuring Redis

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis for Odoo
# /etc/redis/redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save ""
appendonly no
```

### Odoo Redis Cache Implementation

```python
# /odoo_module/models/cache.py
import redis
import json
import functools
import logging
from datetime import datetime

_logger = logging.getLogger(__name__)

class RedisCache:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connected = False
        return cls._instance
    
    def connect(self):
        if not self._connected:
            try:
                self.client = redis.Redis(
                    host='localhost',
                    port=6379,
                    db=0,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                self.client.ping()
                self._connected = True
                _logger.info("Redis cache connected successfully")
            except Exception as e:
                _logger.warning(f"Redis connection failed: {e}")
                self._connected = False
    
    def get(self, key):
        if not self._connected:
            self.connect()
        try:
            return self.client.get(key)
        except Exception:
            return None
    
    def set(self, key, value, ttl=3600):
        if not self._connected:
            self.connect()
        try:
            self.client.setex(key, ttl, value)
        except Exception as e:
            _logger.warning(f"Redis set failed: {e}")
    
    def delete(self, key):
        if not self._connected:
            self.connect()
        try:
            self.client.delete(key)
        except Exception:
            pass
    
    def invalidate_model(self, model_name):
        """Delete all cache keys for a model"""
        if not self._connected:
            self.connect()
        try:
            pattern = f"cache:{model_name}:*"
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
        except Exception:
            pass


# Decorator for caching method results
def cache_result(ttl=3600, model_invalidation=None):
    """Cache decorator for Odoo model methods"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            cache = RedisCache()
            
            # Generate cache key
            cache_key = f"cache:{self._name}:{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get cached result
            cached = cache.get(cache_key)
            if cached:
                _logger.debug(f"Cache hit: {cache_key}")
                return json.loads(cached)
            
            # Execute function
            result = func(self, *args, **kwargs)
            
            # Cache result
            if result is not None:
                cache.set(cache_key, json.dumps(result), ttl)
                _logger.debug(f"Cache set: {cache_key}")
            
            return result
        return wrapper
    return decorator


# Usage in Odoo model
class ProductProduct(models.Model):
    _name = 'product.product'
    
    @cache_result(ttl=1800, model_invalidation='product.product')
    def get_product_pricing(self, product_ids):
        """Get pricing data for products - cached for 30 minutes"""
        products = self.browse(product_ids)
        return [{
            'id': p.id,
            'name': p.name,
            'list_price': p.list_price,
            'standard_price': p.standard_price,
        } for p in products]
    
    def write(self, vals):
        """Invalidate cache on product update"""
        result = super().write(vals)
        if any(f in vals for f in ['list_price', 'standard_price', 'name']):
            RedisCache().invalidate_model('product.product')
        return result
```

### Cache Invalidation Strategy

```python
class CacheInvalidation(models.Model):
    _name = 'cache.invalidation'
    
    @api.model
    def invalidate_on_create(self, model, record_id):
        """Called after creating a record"""
        RedisCache().invalidate_model(model)
    
    @api.model  
    def invalidate_on_write(self, model, record_ids, fields):
        """Called after updating records"""
        # Only invalidate if relevant fields changed
        relevant_fields = self._get_relevant_fields(model)
        if any(f in relevant_fields for f in fields):
            RedisCache().invalidate_model(model)
    
    def _get_relevant_fields(self, model):
        """Define which fields trigger cache invalidation"""
        return {
            'product.product': ['list_price', 'standard_price', 'name', 'active'],
            'res.partner': ['name', 'email', 'customer', 'supplier'],
            'sale.order': ['state', 'amount_total', 'partner_id'],
        }.get(model, [])
```

---

## Application-Level Optimizations {#app-level}

### Use Computed Fields Wisely

```python
# ❌ BAD: Expensive computation on every read
class SaleOrder(models.Model):
    _name = 'sale.order'
    
    total_weight = fields.Float(
        compute='_compute_total_weight',
        store=True  # Still recalculates on related changes!
    )
    
    def _compute_total_weight(self):
        for order in self:
            weight = 0
            for line in order.order_line:
                weight += line.product_id.weight * line.product_uom_qty
            order.total_weight = weight

# ✅ GOOD: Only compute when needed
class SaleOrder(models.Model):
    _name = 'sale.order'
    
    @api.depends('order_line.product_id.weight', 'order_line.product_uom_qty')
    def _compute_total_weight(self):
        for order in self:
            order.total_weight = sum(
                line.product_id.weight * line.product_uom_qty 
                for line in order.order_line
            )
```

### Optimize Report Generation

```python
class SaleReport(models.Model):
    _name = 'sale.report'
    _auto = False  # Use custom SQL for performance
    
    @api.model
    def get_sales_data(self, date_from, date_to):
        """Optimized report using raw SQL"""
        self.env.cr.execute("""
            SELECT 
                s.id as order_id,
                s.name as order_name,
                s.date_order,
                p.name as partner_name,
                s.amount_total,
                s.state,
                COUNT(l.id) as line_count,
                SUM(l.product_uom_qty) as total_qty
            FROM sale_order s
            LEFT JOIN res_partner p ON s.partner_id = p.id
            LEFT JOIN sale_order_line l ON s.id = l.order_id
            WHERE s.date_order BETWEEN %s AND %s
            GROUP BY s.id, s.name, s.date_order, p.name, s.amount_total, s.state
            ORDER BY s.date_order DESC
        """, (date_from, date_to))
        
        return self.env.cr.dictfetchall()
```

### Batch Operations

```python
# Process records in batches using chunked operations
class MassUpdateWizard(models.TransientModel):
    _name = 'mass.update.wizard'
    
    def batch_update_prices(self, product_ids, price_change_percent):
        """Update prices in batches to avoid timeouts"""
        BATCH_SIZE = 500
        products = self.env['product.product'].browse(product_ids)
        
        for i in range(0, len(products), BATCH_SIZE):
            batch = products[i:i + BATCH_SIZE]
            
            for product in batch:
                product.list_price *= (1 + price_change_percent / 100)
            
            # Commit each batch
            self.env.cr.commit()
            _logger.info(f"Updated batch {i//BATCH_SIZE + 1}")
        
        return True
```

---

## Monitoring & Observability {#monitoring}

### Essential Monitoring Queries

```sql
-- Top 10 slowest queries (requires pg_stat_statements)
SELECT 
    query,
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time as avg_ms,
    rows / calls as avg_rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Table bloat analysis
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    CASE 
        WHEN n_dead_tup > 10000 THEN 'NEEDS VACUUM'
        ELSE 'OK'
    END as vacuum_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- Connection status
SELECT 
    state,
    COUNT(*) as connections,
    MAX(EXTRACT(EPOCH FROM (now() - state_change))) as max_duration
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Cache hit ratio
SELECT 
    'Shared Buffers' as cache_type,
    sum(heap_blks_read) as reads,
    sum(heap_blks_hit) as hits,
    round(sum(heap_blks_hit) * 100.0 / NULLIF(sum(heap_blks_read) + sum(heap_blks_hit), 0), 2) as hit_ratio
FROM pg_statio_user_tables;
```

### Odoo-Specific Monitoring

```python
# Custom performance tracking
class PerformanceTracker(models.Model):
    _name = 'performance.tracker'
    
    @api.model
    def track_query_time(self, model, method, duration, record_count):
        """Track query performance"""
        self.create({
            'model': model,
            'method': method,
            'duration_ms': duration,
            'record_count': record_count,
            'user_id': self.env.user.id,
        })
    
    @api.model
    def get_slow_operations(self, threshold_ms=1000):
        """Get operations exceeding threshold"""
        return self.search([
            ('duration_ms', '>', threshold_ms),
            ('create_date', '>=', fields.Datetime.now() - timedelta(days=7))
        ], order='duration_ms DESC', limit=50)
```

---

## Scaling Strategies {#scaling}

### Read Replicas

Configure Odoo for read replica:

```python
# odoo.conf
[database]
master_db = odoo

[web]
workers = 8
max_cron_threads = 2

# For read replica (in secondary odoo instance)
[database]
slave_db = odoo
```

### PgBouncer Connection Pooling

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
odoo_prod = host=localhost port=5432 dbname=odoo

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool mode: transaction (recommended for Odoo)
pool_mode = transaction
max_client_conn = 500
default_pool_size = 25
min_pool_size = 5

# Timeouts
query_timeout = 0
client_login_timeout = 60

# Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = on
```

### Horizontal Scaling Architecture

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (Load Bal) │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ Odoo Web │      │ Odoo Web │      │ Odoo Web │
   │   Worker │      │   Worker │      │   Worker │
   └────┬─────┘      └────┬─────┘      └────┬─────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        ┌──────────┐           ┌──────────┐
        │  Master  │           │  Replica │
        │ PostgreSQL│◄─────────│PostgreSQL│
        │ (Writes) │  Replica │ (Reads)  │
        └──────────┘           └──────────┘
              │
              ▼
        ┌──────────┐
        │  Redis   │
        │ (Cache)  │
        └──────────┘
```

---

## Real-World Case Studies {#case-studies}

### Case Study: 10,000+ Order Processing

**Problem**: Sales team experiencing 30+ second page loads on order lists

**Diagnosis**:
```sql
-- Found missing composite index
-- Queries filtering on partner, date, state with ORDER BY
```

**Solution**:
```sql
CREATE INDEX idx_sale_order_partner_date_state_cover
ON sale_order (partner_id, date_order DESC, state)
INCLUDE (name, amount_total, amount_untaxed);

-- Result: Page load reduced to 2 seconds
```

### Case Study: Inventory Valuation Reports

**Problem**: Monthly inventory report timing out after 5 minutes

**Solution**: Implemented materialized view:
```sql
CREATE MATERIALIZED VIEW mv_inventory_valuation AS
SELECT 
    product_id,
    company_id,
    SUM(quantity) as total_qty,
    SUM(quantity * cost) as total_value
FROM stock_valuation_layer
WHERE create_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY product_id, company_id;

-- Report now generates in 3 seconds
```

---

## Performance Checklist

Before going to production:

- [ ] PostgreSQL configured for production workload
- [ ] Essential indexes created for common queries
- [ ] Redis cache implemented and tested
- [ ] PgBouncer connection pooling configured
- [ ] Slow query logging enabled
- [ ] Monitoring in place (pg_stat_statements)
- [ ] Regular maintenance scheduled (VACUUM, ANALYZE)
- [ ] Asset compression enabled in Odoo
- [ ] Database SSL connections configured

---

## Conclusion

Performance optimization is an ongoing journey, not a destination. The strategies in this guide have been proven in enterprise environments handling millions of transactions.

Key takeaways:
1. **Measure first** - Use pg_stat_statements to find actual bottlenecks
2. **Index strategically** - Match indexes to query patterns
3. **Cache aggressively** - Redis is your friend
4. **Monitor continuously** - You can't optimize what you don't measure
5. **Scale thoughtfully** - Add complexity only when needed

Need help optimizing your Odoo deployment? Let's discuss your specific challenges.
