---
layout: post
title: "My Journey Building REST APIs in Odoo"
date: 2024-10-10 10:00:00 +0000
categories: [Odoo Dev, API]
tags: [odoo, api, rest, python, integration]
reading_time: 10
excerpt: "After building APIs for dozens of Odoo projects, here's what actually works - the hard lessons, the patterns that stuck, and the mistakes I won't make again."
---

# My Journey Building REST APIs in Odoo

I've built a lot of custom APIs in Odoo. Some were elegant, some were... let's say "learning experiences." Here's everything I wish I knew before that first API project.

## The API That Nearly Got Me Fired

My first Odoo API was for a client who needed to sync their e-commerce store with Odoo. How hard could it be?

Very hard, as it turns out.

Within a week, I had created:
- Zero authentication (oops)
- No rate limiting (they hammered my server)
- No error handling (when things broke, I had no idea why)
- No logging (debugging was... creative)

The client called at 11 PM because the API had crashed their production server. Not my finest moment.

That project taught me more than any documentation could. Here's what I've learned since.

## The Foundation: Clean Controller Structure

Every API controller I write now follows this pattern:

```python
from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class PartnerAPI(http.Controller):
    
    @http.route('/api/v1/partners', type='json', auth='none', methods=['GET'], csrf=False)
    def list_partners(self, **kwargs):
        """
        List partners with pagination
        
        Args:
            page: Page number (default: 1)
            limit: Items per page (max: 100)
        
        Returns:
            Dict with partners array and pagination info
        """
        # Always validate auth first
        user = self._authenticate()
        if not user:
            return {'error': 'Unauthorized'}, 401
        
        # Log every request
        _logger.info(f"API: {request.httprequest.method} {request.httprequest.path}")
        
        # Parse and validate params
        page = int(kwargs.get('page', 1))
        limit = min(int(kwargs.get('limit', 20)), 100)
        
        try:
            partners = self._get_partners(page, limit)
            return partners
        except Exception as e:
            _logger.exception("Error fetching partners")
            return {'error': 'Internal error'}, 500
```

The key lessons here:
1. Authenticate before doing anything
2. Log everything - you'll thank yourself later
3. Always wrap in try/except
4. Return proper HTTP status codes

## Authentication That Actually Works

Here's what I use in production:

```python
class APIBase(http.Controller):
    
    def _authenticate(self):
        """Validate API key from Authorization header"""
        auth_header = request.httprequest.headers.get('Authorization', '')
        
        if not auth_header.startswith('ApiKey '):
            return None
            
        api_key = auth_header[7:]  # Remove 'ApiKey ' prefix
        
        # Look up the key
        key_record = request.env['api.key'].sudo().search([
            ('key', '=', api_key),
            ('active', '=', True)
        ], limit=1)
        
        if not key_record:
            _logger.warning(f"Invalid API key attempt from {request.httprequest.remote_addr}")
            return None
            
        # Update last used
        key_record.sudo().write({'last_used': fields.Datetime.now()})
        
        return key_record.user_id
```

And the model to store keys:

```python
class APIKey(models.Model):
    _name = 'api.key'
    _description = 'API Keys'
    
    name = fields.Char('Description', required=True)
    key = fields.Char('API Key', required=True)
    user_id = fields.Many2one('res.users', 'User', required=True)
    active = fields.Boolean('Active', default=True)
    last_used = fields.Datetime('Last Used')
    
    _sql_constraints = [
        ('key_unique', 'unique(key)', 'API key must be unique!')
    ]
```

Pro tips:
- Store a hash of the key, not the key itself
- Add `last_used` so you can spot inactive keys
- Give each integration its own key (easier to revoke)

## Pagination That Doesn't Crash

My first API returned ALL records. For a client with 50,000 partners. You can imagine.

Here's the pattern I use now:

```python
@http.route('/api/v1/partners', type='json', auth='none', csrf=False)
def list_partners(self, **kwargs):
    user = self._authenticate()
    if not user:
        return {'error': 'Unauthorized'}, 401
    
    # Parse params
    page = max(1, int(kwargs.get('page', 1)))
    limit = min(max(1, int(kwargs.get('limit', 20))), 100)
    offset = (page - 1) * limit
    
    # Get total count
    domain = self._build_domain(kwargs)
    total = request.env['res.partner'].search_count(domain)
    
    # Get records
    partners = request.env['res.partner'].search_read(
        domain,
        ['id', 'name', 'email', 'phone'],
        limit=limit,
        offset=offset,
        order='name'
    )
    
    return {
        'data': partners,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total + limit - 1) // limit
        }
    }
```

## Error Handling That Helps Debug

When something goes wrong (and it will), you need to know what happened:

```python
class APIError(Exception):
    """Base API error"""
    def __init__(self, message, status=400):
        self.message = message
        self.status = status
        super().__init__(message)

class ValidationError(APIError):
    def __init__(self, message):
        super().__init__(message, 400)

class NotFoundError(APIError):
    def __init__(self, message="Resource not found"):
        super().__init__(message, 404)

class UnauthorizedError(APIError):
    def __init__(self, message="Authentication required"):
        super().__init__(message, 401)
```

And a decorator to handle them:

```python
def api_handler(func):
    """Catch errors and return proper responses"""
    def wrapper(self, *args, **kwargs):
        try:
            return func(self, *args, **kwargs)
        except ValidationError as e:
            return {'error': e.message, 'code': 'VALIDATION_ERROR'}, e.status
        except NotFoundError as e:
            return {'error': e.message, 'code': 'NOT_FOUND'}, e.status
        except UnauthorizedError as e:
            return {'error': e.message, 'code': 'UNAUTHORIZED'}, e.status
        except Exception as e:
            _logger.exception(f"Unexpected error in {func.__name__}")
            return {'error': 'Internal server error', 'code': 'INTERNAL_ERROR'}, 500
    return wrapper
```

Usage:

```python
@http.route('/api/v1/partners', type='json', auth='none', csrf=False)
@api_handler
def create_partner(self, **kwargs):
    if not kwargs.get('name'):
        raise ValidationError("Name is required")
    
    # ... create logic
```

## Rate Limiting (Finally)

After that crashed server incident, I take rate limiting seriously:

```python
from collections import defaultdict
import time
import threading

class RateLimiter:
    """Simple in-memory rate limiter"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._requests = defaultdict(list)
        return cls._instance
    
    def is_allowed(self, key, limit=100, window=60):
        now = time.time()
        
        # Clean old requests
        self._requests[key] = [
            t for t in self._requests[key] 
            if now - t < window
        ]
        
        if len(self._requests[key]) >= limit:
            return False, limit - len(self._requests[key])
        
        self._requests[key].append(now)
        return True, limit - len(self._requests[key]) - 1
```

```python
@http.route('/api/v1/partners', type='json', auth='none', csrf=False)
def list_partners(self, **kwargs):
    # Get client identifier (API key or IP)
    auth = request.httprequest.headers.get('Authorization', '')
    key = auth or request.httprequest.remote_addr
    
    # Check rate limit
    limiter = RateLimiter()
    allowed, remaining = limiter.is_allowed(key, limit=50, window=60)
    
    if not allowed:
        return {
            'error': 'Rate limit exceeded',
            'retry_after': 60
        }, 429
    
    # ... rest of logic
```

## Versioning from Day One

I always start with `/api/v1/`. Always. Even if I think I won't need versions.

Trust me. You'll need it.

```python
@http.route('/api/v1/partners', type='json', auth='none', methods=['GET'])
def list_partners_v1(self, **kwargs):
    """Version 1 - basic partner data"""
    partners = request.env['res.partner'].search_read(
        [], ['name', 'email']
    )
    return {'data': partners}

@http.route('/api/v2/partners', type='json', auth='none', methods=['GET'])
def list_partners_v2(self, **kwargs):
    """Version 2 - extended data with addresses"""
    partners = request.env['res.partner'].search_read(
        [], ['name', 'email', 'phone', 'street', 'city', 'country_id']
    )
    return {'data': partners, 'version': '2.0'}
```

## What I'd Do Different

If I could go back and tell my past self something:

1. **Start with authentication** - not as an afterthought
2. **Add logging from the first endpoint** - you'll need it
3. **Version everything** - /api/v1/ from day one
4. **Test with realistic data** - 10 records tells you nothing
5. **Document as you build** - future you will thank present you

## The Real Truth

Building APIs in Odoo isn't technically hard. Building APIs that don't embarrass you in production is harder.

The things that actually matter:
- Authentication from the start (always)
- Pagination always (always)
- Good error handling (always)
- Logging everything (always)
- Versioning early (always)

What's your API horror story? Share in the comments - we've all been there.
