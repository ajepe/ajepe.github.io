---
layout: post
title: "How I Structure REST APIs in Odoo Now"
date: 2024-10-10 10:00:00 +0000
categories: [Odoo Dev, API]
tags: [odoo, api, rest, python, integration, odoo developer, odoo integration, api development, odoo specialist]
reading_time: 9
excerpt: "The base controller, API key model, error handling and rate limiting I copy into every Odoo project that needs a REST API, plus the reasons behind each piece."
---

Earlier this year I wrote about [the mistakes I made on my first Odoo APIs]({% post_url 2024-01-10-building-custom-odoo-apis %}). The short version: no auth, no pagination, no logging, and an 11 PM call from a client whose production server my API had just taken down.

Since then I've settled on a structure I reuse on pretty much every project that needs a REST API. This post is that structure, piece by piece. Everything here targets Odoo 16 and 17.

## Why not `type='json'`?

Odoo has two kinds of routes. `type='json'` is JSON-RPC: POST only, the response is wrapped in a `{"jsonrpc": "2.0", "result": ...}` envelope, and errors come back as HTTP 200 with an `error` key. That's fine if the caller is Odoo's own frontend. It's awkward for a Shopify app or a warehouse system that expects normal REST: GET for reads, real status codes, a plain JSON body.

So for external APIs I use `type='http'` and build the JSON response myself with `request.make_json_response()`.

## The API key model

Each integration gets its own key, tied to a dedicated Odoo user with only the access it needs:

```python
import hashlib
import secrets

from odoo import api, fields, models


class ApiKey(models.Model):
    _name = 'api.key'
    _description = 'Integration API Key'

    name = fields.Char(required=True, help="What this key is for, e.g. 'Shopify sync'")
    key_hash = fields.Char(required=True, index=True, readonly=True)
    user_id = fields.Many2one('res.users', required=True, ondelete='cascade')
    active = fields.Boolean(default=True)
    last_used = fields.Datetime(readonly=True)

    _sql_constraints = [
        ('key_hash_unique', 'unique(key_hash)', 'API key must be unique.'),
    ]

    @staticmethod
    def _hash(raw_key):
        return hashlib.sha256(raw_key.encode()).hexdigest()

    @api.model
    def generate(self, name, user):
        """Create a key and return the raw value. It's only shown this once."""
        raw_key = secrets.token_urlsafe(32)
        self.create({'name': name, 'user_id': user.id, 'key_hash': self._hash(raw_key)})
        return raw_key
```

Only the hash goes in the database. If a backup leaks, nobody gets working keys out of it. One key per integration also means I can revoke the Shopify key without breaking the warehouse sync.

## A base controller

All the boring parts live in one place: authentication, switching to the key's user, and building responses.

```python
import logging
from datetime import timedelta

from odoo import fields, http
from odoo.http import request

_logger = logging.getLogger(__name__)


class ApiBase(http.Controller):

    def _authenticate(self):
        header = request.httprequest.headers.get('Authorization', '')
        if not header.startswith('ApiKey '):
            raise ApiError('Authentication required', status=401, code='UNAUTHORIZED')

        ApiKey = request.env['api.key'].sudo()
        key = ApiKey.search([('key_hash', '=', ApiKey._hash(header[len('ApiKey '):]))], limit=1)
        if not key:
            _logger.warning("Invalid API key from %s", request.httprequest.remote_addr)
            raise ApiError('Invalid API key', status=401, code='UNAUTHORIZED')

        # Don't write on every request: concurrent calls would fight over this row
        if not key.last_used or key.last_used < fields.Datetime.now() - timedelta(hours=1):
            key.last_used = fields.Datetime.now()

        # Everything after this runs as the integration user, so record rules apply
        request.update_env(user=key.user_id)
        return key.user_id

    def _json(self, data, status=200, headers=None):
        return request.make_json_response(data, status=status, headers=headers)
```

The `last_used` check looks fussy, but it's there for a reason. If you write the timestamp on every call, parallel requests from the same integration all try to update the same row, and Postgres starts throwing "could not serialize access due to concurrent update". Odoo retries those requests automatically, but under load the retries pile up. Updating it at most once an hour tells you the same thing without the contention.

(`ApiError` is defined in the next section. In the real module everything sits in the same file.)

## Errors in one place

I don't want a try/except in every endpoint, so endpoints raise one exception type and a decorator turns it into a response:

```python
import functools

from odoo.exceptions import AccessError, MissingError, UserError


class ApiError(Exception):
    def __init__(self, message, status=400, code='BAD_REQUEST'):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


def api_endpoint(func):
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        try:
            self._authenticate()
            return func(self, *args, **kwargs)
        except ApiError as e:
            request.env.cr.rollback()
            return self._json({'error': e.message, 'code': e.code}, status=e.status)
        except MissingError:
            request.env.cr.rollback()
            return self._json({'error': 'Not found', 'code': 'NOT_FOUND'}, status=404)
        except AccessError:
            request.env.cr.rollback()
            return self._json({'error': 'Not allowed', 'code': 'FORBIDDEN'}, status=403)
        except UserError as e:
            # Includes ValidationError. These messages are meant for humans, so pass them on.
            request.env.cr.rollback()
            return self._json({'error': str(e), 'code': 'VALIDATION_ERROR'}, status=400)
        except Exception:
            request.env.cr.rollback()
            _logger.exception("Unhandled API error in %s", func.__name__)
            return self._json({'error': 'Internal server error', 'code': 'INTERNAL_ERROR'}, status=500)
    return wrapper
```

The order matters. In Odoo, `AccessError` and `MissingError` are both subclasses of `UserError`, so they have to be caught before it.

The rollbacks matter too. When a controller returns normally, Odoo commits the transaction. If I catch an error halfway through a write and return a 400, I don't want the half that already ran to be saved.

## Endpoints

With all that in place, the endpoints themselves stay short:

```python
class PartnerApi(ApiBase):

    @http.route('/api/v1/partners', type='http', auth='public', methods=['GET'], csrf=False)
    @api_endpoint
    def list_partners(self, page=1, limit=20, search=None, **kwargs):
        try:
            page = max(1, int(page))
            limit = min(max(1, int(limit)), 100)
        except ValueError:
            raise ApiError('page and limit must be integers')

        domain = [('customer_rank', '>', 0)]
        if search:
            domain.append(('name', 'ilike', search))

        Partner = request.env['res.partner']
        total = Partner.search_count(domain)
        partners = Partner.search_read(
            domain,
            ['id', 'name', 'email', 'phone'],
            limit=limit,
            offset=(page - 1) * limit,
            order='name, id',
        )
        return self._json({
            'data': partners,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit,
            },
        })

    @http.route('/api/v1/partners', type='http', auth='public', methods=['POST'], csrf=False)
    @api_endpoint
    def create_partner(self, **kwargs):
        data = request.get_json_data()
        if not data.get('name'):
            raise ApiError('name is required', code='VALIDATION_ERROR')

        partner = request.env['res.partner'].create({
            'name': data['name'],
            'email': data.get('email'),
            'phone': data.get('phone'),
        })
        return self._json({'data': {'id': partner.id, 'name': partner.name}}, status=201)
```

A few details worth calling out:

- `@http.route` has to be the outermost decorator.
- The sort is `'name, id'`, not just `'name'`. Two partners with the same name could otherwise swap places between pages.
- Search is case-insensitive (`ilike`) because that's what every client asks for eventually.

## Rate limiting

After the incident I mentioned at the top, I don't ship without this. The simple version is an in-memory sliding window:

```python
import threading
import time
from collections import defaultdict


class RateLimiter:
    def __init__(self):
        self._hits = defaultdict(list)
        self._lock = threading.Lock()

    def check(self, key, limit=100, window=60):
        """Return (allowed, remaining)."""
        now = time.time()
        with self._lock:
            hits = [t for t in self._hits[key] if now - t < window]
            if len(hits) >= limit:
                self._hits[key] = hits
                return False, 0
            hits.append(now)
            self._hits[key] = hits
            return True, limit - len(hits)


limiter = RateLimiter()
```

And in `api_endpoint`, before calling the endpoint:

```python
client = request.httprequest.headers.get('Authorization') or request.httprequest.remote_addr
allowed, remaining = limiter.check(client, limit=50, window=60)
if not allowed:
    return self._json({'error': 'Rate limit exceeded', 'code': 'RATE_LIMITED'},
                      status=429, headers=[('Retry-After', '60')])
```

The catch: Odoo runs several worker processes, and each one has its own `limiter`. With 8 workers, a limit of 50 is really around 400. That's fine as a safety net against a runaway script. If you need an accurate limit, do it in nginx with `limit_req`, or keep the counters in Redis.

## Versioning

I start every API at `/api/v1/`, even when I'm sure there will never be a v2. Usually there is one. When it happens, v1 keeps working for the clients already using it:

```python
@http.route('/api/v2/partners', type='http', auth='public', methods=['GET'], csrf=False)
@api_endpoint
def list_partners_v2(self, page=1, limit=20, **kwargs):
    # Same pagination as v1, plus address fields and a nested country
    ...
```

Old versions stay up until every integration using them has moved over. I log which version each key calls, so I know when it's safe to turn v1 off.

## Before I call an API done

- Every endpoint authenticates, and runs as a user with only the rights it needs
- Every list is paginated with a stable sort
- Errors are logged on the server and rolled back, and the client gets a short message with the right status code
- There's a rate limit, even a rough one
- The URL has a version in it
- I've tested it against a copy of production data, not 10 demo records

None of this is clever. It's just the stuff that keeps you from getting a phone call at 11 PM.
