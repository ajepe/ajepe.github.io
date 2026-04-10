---
layout: post
title: "Building Custom Odoo APIs: What I Learned the Hard Way"
date: 2024-01-10 10:00:00 +0000
categories: [Odoo Dev, API]
tags: [odoo, api, python, integration, odoo developer, odoo specialist, hire odoo developer]
reading_time: 8
excerpt: "After building dozens of custom Odoo APIs, here are the mistakes I made, lessons I learned, and patterns that actually work in production. Essential reading for any Odoo developer."
---

# Building Custom Odoo APIs: What I Learned the Hard Way

I've built a lot of custom APIs in Odoo. Some worked great, some were nightmares. Here's what I wish I knew when I started.

## The First API I Built Was a Disaster

My first custom API was for a client who needed to sync Odoo with their Magento store. I thought it'd be simple - just expose some endpoints, right?

Wrong. Within a week, I had:
- No authentication (anyone could access it)
- No rate limiting (the client hammered it and crashed the server)
- No error handling (when things failed, I had no idea why)
- No logging (debugging was a nightmare)

Since then, I've built many more APIs. Here's what actually works.

## Authentication That Won't Get You Fired

Never, ever leave an API without proper authentication. Here's what I use now:

```python
from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class PartnerAPI(http.Controller):
    
    @http.route('/api/v1/partners', type='json', auth='none', methods=['GET'], csrf=False)
    def list_partners(self, **kwargs):
        # Check API key from header
        api_key = request.httprequest.headers.get('X-API-Key')
        
        if not api_key:
            return {'error': 'No API key provided'}, 401
        
        # Validate key
        user = self._validate_key(api_key)
        if not user:
            return {'error': 'Invalid API key'}, 401
        
        # Log who accessed what
        _logger.info(f"API access by {user.name}: {request.httprequest.path}")
        
        # Now proceed with the actual logic
        partners = request.env['res.partner'].search_read(
            [('customer', '=', True)],
            ['name', 'email', 'phone']
        )
        
        return {'partners': partners}
    
    def _validate_key(self, api_key):
        # Look up key in your model
        key_record = request.env['api.key'].sudo().search([
            ('key', '=', api_key),
            ('active', '=', True)
        ], limit=1)
        
        return key_record.user_id if key_record else None
```

The key things here:
1. Always require authentication
2. Log everything
3. Return proper error codes

## The Mistake That Cost Me a Weekend

Early on, I created an endpoint that returned ALL partner records. For a client with 50,000 partners. You can imagine how that went.

Always implement pagination:

```python
@http.route('/api/v1/partners', type='json', auth='none', csrf=False)
def list_partners(self, **kwargs):
    # Get pagination params with defaults
    page = int(kwargs.get('page', 1))
    limit = min(int(kwargs.get('limit', 20)), 100)  # Cap at 100
    offset = (page - 1) * limit
    
    # Count total for pagination info
    total = request.env['res.partner'].search_count([('customer', '=', True)])
    
    # Get the data
    partners = request.env['res.partner'].search_read(
        [('customer', '=', True)],
        ['name', 'email', 'phone'],
        limit=limit,
        offset=offset
    )
    
    return {
        'partners': partners,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total + limit - 1) // limit
        }
    }
}
```

## Error Handling That Actually Helps

When something goes wrong (and it will), you need to know what happened. I now use structured error responses:

```python
@http.route('/api/v1/partners', type='json', auth='none', csrf=False)
def create_partner(self, **kwargs):
    try:
        # Validate required fields
        if not kwargs.get('name'):
            return {'error': 'Name is required', 'code': 'VALIDATION_ERROR'}, 400
        
        # Create the partner
        partner = request.env['res.partner'].create({
            'name': kwargs['name'],
            'email': kwargs.get('email'),
            'phone': kwargs.get('phone'),
        })
        
        return {
            'success': True,
            'partner': {
                'id': partner.id,
                'name': partner.name
            }
        }, 201
        
    except Exception as e:
        # Log the full error for debugging
        _logger.exception(f"API Error creating partner: {kwargs}")
        
        # Return generic message to client
        return {'error': 'Failed to create partner', 'code': 'INTERNAL_ERROR'}, 500
```

The key insight: log the details internally, return generic errors externally.

## What I'd Do Different Now

Looking back, here's what I'd change:

1. **Start with versioning from day one** - `/api/v1/`, `/api/v2/` - trust me, you'll need it

2. **Use a dedicated API user** - don't use admin, create a specific user with minimal permissions

3. **Add rate limiting early** - even simple in-memory rate limiting helps:
```python
from collections import defaultdict
import time

rate_limit_store = defaultdict(list)

def rate_limit(limit=100, window=60):
    def decorator(func):
        def wrapper(self, *args, **kwargs):
            client_id = request.httprequest.remote_addr
            now = time.time()
            
            # Clean old entries
            rate_limit_store[client_id] = [
                t for t in rate_limit_store[client_id] 
                if now - t < window
            ]
            
            if len(rate_limit_store[client_id]) >= limit:
                return {'error': 'Rate limit exceeded'}, 429
            
            rate_limit_store[client_id].append(now)
            return func(self, *args, **kwargs)
        return wrapper
    return decorator
```

4. **Document as you go** - I use a simple docstring approach:
```python
@http.route('/api/v1/partners', methods=['GET'])
def list_partners(self, page=1, limit=20):
    """
    List customers with pagination
    
    Args:
        page: Page number (default: 1)
        limit: Items per page (max: 100, default: 20)
    
    Returns:
        Dict with partners array and pagination info
    
    Example:
        GET /api/v1/partners?page=1&limit=50
    """
```

## The Bottom Line

Building APIs in Odoo isn't hard. Building APIs that don't embarrass you in production is harder. 

The things that matter most:
- Authentication from the start
- Pagination always
- Good error handling
- Logging everything
- Versioning early

What's been your experience building Odoo APIs? Let me know what challenges you've faced.
