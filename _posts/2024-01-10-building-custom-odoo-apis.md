---
layout: post
title: "Building Custom Odoo APIs: What I Learned the Hard Way"
date: 2024-01-10 10:00:00 +0000
categories: [Odoo Dev, API]
tags: [odoo, api, python, integration, odoo developer, odoo specialist, hire odoo developer]
reading_time: 8
excerpt: "My first custom Odoo API had no auth, no pagination and no logging, and it fell over within a week. These are the mistakes I made and the patterns I've used ever since."
---

I've built a lot of custom APIs on top of Odoo by now. Some went smoothly. Some I'd rather forget. This is what I wish someone had told me before the first one.

## My first API was a mess

The client wanted their Magento store synced with Odoo. I figured it would be simple: expose a few endpoints and you're done.

Within a week I had an API with:

- No authentication, so anyone who found the URL could read it
- No rate limiting, so their sync script hammered it until the server fell over
- No error handling, so when something broke I had no idea why
- No logging, so I couldn't even work out *when* it broke

Everything below is what I've done differently since.

A quick note before the code: these examples are for Odoo 16 and 17. If you want to return proper HTTP status codes, use `type='http'` routes and `request.make_json_response()`. `type='json'` routes speak JSON-RPC: they only accept POST, and whatever you return gets wrapped in a JSON-RPC envelope with a 200 status. Returning a Flask-style `(body, 401)` tuple from one doesn't give you a 401. It gives you a JSON list.

## Authentication first, always

Never ship an endpoint without auth, not even "just for testing". This is roughly what I start with now:

```python
import hashlib
import logging

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class PartnerAPI(http.Controller):

    @http.route('/api/v1/partners', type='http', auth='public', methods=['GET'], csrf=False)
    def list_partners(self, **kwargs):
        user = self._authenticate()
        if not user:
            return request.make_json_response({'error': 'Invalid or missing API key'}, status=401)

        # From here on, run as the API key's user so access rules apply
        request.update_env(user=user)
        _logger.info("API %s %s by %s", request.httprequest.method,
                     request.httprequest.path, user.login)

        partners = request.env['res.partner'].search_read(
            [('customer_rank', '>', 0)],
            ['name', 'email', 'phone'],
            limit=20,
        )
        return request.make_json_response({'partners': partners})

    def _authenticate(self):
        api_key = request.httprequest.headers.get('X-API-Key')
        if not api_key:
            return None
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        key = request.env['api.key'].sudo().search([('key_hash', '=', key_hash)], limit=1)
        return key.user_id if key else None
```

`api.key` here is a small custom model holding a description, the SHA-256 hash of the key, a user and an `active` flag. Store the hash, not the key itself. If someone ever gets a copy of your database, they shouldn't get working credentials with it.

Odoo 14+ also has built-in per-user API keys (Preferences → Account Security). They work for XML-RPC/JSON-RPC out of the box. I still like a separate model for integrations, because then each integration gets its own key that I can revoke without touching anyone's login.

## The endpoint that cost me a weekend

Early on I wrote an endpoint that returned every customer in one response. That client had 50,000 of them. It went about as well as you'd expect.

Paginate everything, and cap the page size so nobody can ask for `limit=1000000`:

```python
@http.route('/api/v1/partners', type='http', auth='public', methods=['GET'], csrf=False)
def list_partners(self, page=1, limit=20, **kwargs):
    # ... authentication as above ...
    try:
        page = max(1, int(page))
        limit = min(max(1, int(limit)), 100)
    except ValueError:
        return request.make_json_response({'error': 'page and limit must be integers'}, status=400)

    Partner = request.env['res.partner']
    domain = [('customer_rank', '>', 0)]
    total = Partner.search_count(domain)
    partners = Partner.search_read(
        domain,
        ['name', 'email', 'phone'],
        limit=limit,
        offset=(page - 1) * limit,
        order='id',
    )

    return request.make_json_response({
        'partners': partners,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': (total + limit - 1) // limit,
        },
    })
```

Always set an explicit `order`. Without a stable sort, records can show up twice or go missing between pages while someone else is writing to the table.

## Error handling that actually helps

Something will go wrong eventually, and you'll want to know what. My rule: log the details on the server, send back something short and generic.

```python
from odoo.exceptions import AccessError, UserError

@http.route('/api/v1/partners', type='http', auth='public', methods=['POST'], csrf=False)
def create_partner(self, **kwargs):
    # ... authentication as above ...
    data = request.get_json_data()
    if not data.get('name'):
        return request.make_json_response(
            {'error': 'name is required', 'code': 'VALIDATION_ERROR'}, status=400)

    try:
        partner = request.env['res.partner'].create({
            'name': data['name'],
            'email': data.get('email'),
            'phone': data.get('phone'),
        })
    except AccessError:
        request.env.cr.rollback()
        return request.make_json_response({'error': 'Not allowed', 'code': 'FORBIDDEN'}, status=403)
    except UserError as e:
        # ValidationError is a UserError too; these messages are written for users, so pass them on
        request.env.cr.rollback()
        return request.make_json_response({'error': str(e), 'code': 'VALIDATION_ERROR'}, status=400)
    except Exception:
        request.env.cr.rollback()
        _logger.exception("API error creating partner with payload %s", data)
        return request.make_json_response(
            {'error': 'Failed to create partner', 'code': 'INTERNAL_ERROR'}, status=500)

    return request.make_json_response({'id': partner.id, 'name': partner.name}, status=201)
```

The `rollback()` calls matter. Odoo commits the request's transaction when your controller returns normally. If you catch an exception and return a response, you've done exactly that, so roll back whatever half-finished work came before it.

## What I'd do differently from day one

**Version the URL.** `/api/v1/` from the very first endpoint. The day a client's integration depends on a response format you need to change, you'll be glad `/api/v2/` is an option.

**Use a dedicated API user.** Not admin. Create a user with only the access rights the integration needs, and tie the key to it. Combined with `update_env(user=...)`, Odoo's normal access rules then do half the security work for you.

**Add rate limiting early.** Even a crude in-memory limiter is better than nothing:

```python
import functools
import time
from collections import defaultdict

_hits = defaultdict(list)

def rate_limit(limit=100, window=60):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs):
            client = request.httprequest.headers.get('X-API-Key') or request.httprequest.remote_addr
            now = time.time()
            _hits[client] = [t for t in _hits[client] if now - t < window]
            if len(_hits[client]) >= limit:
                return request.make_json_response({'error': 'Rate limit exceeded'}, status=429,
                                                  headers=[('Retry-After', str(window))])
            _hits[client].append(now)
            return func(self, *args, **kwargs)
        return wrapper
    return decorator
```

Put it under `@http.route` (so the route decorator is outermost). Be aware that this is per worker process. With `workers = 8` the real limit is roughly eight times what you set. For anything serious I do rate limiting in nginx (`limit_req`) or in Redis instead.

**Write the docs as you go.** A docstring on each endpoint is enough to start:

```python
@http.route('/api/v1/partners', type='http', auth='public', methods=['GET'], csrf=False)
def list_partners(self, page=1, limit=20, **kwargs):
    """List customers, paginated.

    Query params:
        page:  page number, default 1
        limit: items per page, default 20, max 100

    Example:
        GET /api/v1/partners?page=2&limit=50
        X-API-Key: <key>
    """
```

## Summing up

Getting an API working in Odoo isn't hard. Getting one that doesn't embarrass you in production takes a bit more discipline. If I had to pick the habits that saved me the most pain, they'd be: auth from the first commit, pagination on every list, errors that get logged and rolled back, and a version number in the URL before anyone depends on it.

I wrote a follow-up on [how I structure these APIs now]({% post_url 2024-10-10-streamlining-odoo-integration-restful-api %}), with the base controller and error handling I reuse on every project.
