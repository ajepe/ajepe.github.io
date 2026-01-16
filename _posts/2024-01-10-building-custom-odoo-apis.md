---
layout: post
title: "Building Custom Odoo APIs: Best Practices and Security"
date: 2024-01-10 14:30:00 +0000
categories: [Odoo Dev, API, Integration]
tags: [odoo, api, rest, security, integration, python]
reading_time: 6
excerpt: "Learn how to build secure, scalable custom APIs in Odoo with proper authentication, error handling, and RESTful design principles."
---

Building custom APIs in Odoo is essential for integrating with external systems, mobile applications, and third-party services. In this guide, I'll share best practices for creating secure, maintainable, and performant APIs based on my experience with enterprise Odoo deployments.

## Understanding Odoo's API Architecture

Odoo provides multiple API endpoints out of the box:

- **JSON-RPC API** - Default for web client
- **XML-RPC API** - Traditional API support
- **REST API** - Custom implementation needed
- **GraphQL API** - Community modules available

While these are useful, custom APIs often provide better control over data structure, security, and performance.

## 1. Setting Up a Custom API Controller

### Basic Controller Structure

```python
# controllers/api.py
from odoo import http
from odoo.http import request, JsonRequest
import json
import logging

_logger = logging.getLogger(__name__)

class CustomAPIController(http.Controller):
    
    def _validate_auth(self):
        """Custom authentication validation"""
        token = request.httprequest.headers.get('Authorization')
        if not token:
            return False
            
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
            
        # Validate against API tokens
        api_token = request.env['api.token'].sudo().search([
            ('token', '=', token),
            ('active', '=', True)
        ], limit=1)
        
        return bool(api_token)
    
    def _json_response(self, data, status=200):
        """Standard JSON response format"""
        return request.make_json_response({
            'status': 'success' if status < 400 else 'error',
            'data': data,
            'timestamp': http.request.httprequest.timestamp
        }, status=status)
    
    def _error_response(self, message, code=400, details=None):
        """Standard error response format"""
        return request.make_json_response({
            'status': 'error',
            'error': {
                'code': code,
                'message': message,
                'details': details
            },
            'timestamp': http.request.httprequest.timestamp
        }, status=code)
```

### Secure Endpoint Implementation

```python
class CustomAPIController(http.Controller):
    
    @http.route('/api/v1/products', type='http', auth='none', methods=['GET'], csrf=False)
    def get_products(self, **kwargs):
        """Get products with filtering and pagination"""
        if not self._validate_auth():
            return self._error_response('Unauthorized', 401)
        
        try:
            # Parse query parameters
            page = int(kwargs.get('page', 1))
            limit = min(int(kwargs.get('limit', 20)), 100)  # Max 100 items
            offset = (page - 1) * limit
            
            # Build domain filter
            domain = [('active', '=', True)]
            
            if kwargs.get('category_id'):
                domain.append(('categ_id', '=', int(kwargs['category_id'])))
            
            if kwargs.get('search'):
                domain.append(('name', 'ilike', kwargs['search']))
            
            # Execute query
            products = request.env['product.product'].search(
                domain, limit=limit, offset=offset
            )
            
            # Format response
            data = {
                'products': [
                    {
                        'id': p.id,
                        'name': p.name,
                        'default_code': p.default_code,
                        'price': p.list_price,
                        'category': p.categ_id.name if p.categ_id else None,
                        'image_url': f"/web/image/product.product/{p.id}/image_1024" if p.image_1024 else None
                    }
                    for p in products
                ],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': request.env['product.product'].search_count(domain),
                    'pages': (request.env['product.product'].search_count(domain) + limit - 1) // limit
                }
            }
            
            return self._json_response(data)
            
        except ValueError as e:
            return self._error_response('Invalid parameter', 400, str(e))
        except Exception as e:
            _logger.error(f"API Error in get_products: {str(e)}")
            return self._error_response('Internal server error', 500)
```

## 2. Authentication and Security

### API Token Management

```python
# models/api_token.py
from odoo import models, fields, api
import secrets
import hashlib

class APIToken(models.Model):
    _name = 'api.token'
    _description = 'API Token Management'
    
    name = fields.Char('Description', required=True)
    token = fields.Char('Token', required=True, readonly=True, copy=False)
    user_id = fields.Many2one('res.users', 'User', required=True)
    company_id = fields.Many2one('res.company', 'Company', required=True, default=lambda self: self.env.company)
    active = fields.Boolean('Active', default=True)
    last_used = fields.Datetime('Last Used', readonly=True)
    expires_at = fields.Datetime('Expires At')
    allowed_ips = fields.Text('Allowed IPs', help='Comma-separated list of allowed IP addresses')
    
    @api.model
    def create(self, vals):
        # Generate secure token
        token = secrets.token_urlsafe(32)
        vals['token'] = hashlib.sha256(token.encode()).hexdigest()
        
        # Store original token for one-time return
        record = super().create(vals)
        record.token = token  # Temporary override for response
        
        return record
    
    def write(self, vals):
        if 'token' in vals:
            # Hash new token
            token = vals['token']
            vals['token'] = hashlib.sha256(token.encode()).hexdigest()
        return super().write(vals)
    
    def validate_token(self, token):
        """Validate provided token against stored hash"""
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        return self.search([('token', '=', token_hash), ('active', '=', True)], limit=1)
    
    def update_last_used(self):
        """Update last used timestamp"""
        self.last_used = fields.Datetime.now()
```

### IP Whitelisting

```python
# Add to controller for IP validation
def _validate_ip(self):
    """Validate client IP against whitelist"""
    client_ip = request.httprequest.environ.get('REMOTE_ADDR')
    
    # Get allowed IPs from system parameters
    allowed_ips = request.env['ir.config_parameter'].sudo().get_param('api.allowed_ips', '')
    
    if not allowed_ips:
        return True  # No restriction if not configured
    
    allowed_list = [ip.strip() for ip in allowed_ips.split(',')]
    return client_ip in allowed_list
```

## 3. Rate Limiting

### Redis-Based Rate Limiting

```python
# Add rate limiting middleware
import redis
import time

redis_client = redis.Redis(host='localhost', port=6379, db=1)

def rate_limit(identifier, limit=100, window=3600):
    """Rate limiting using Redis sliding window"""
    key = f"rate_limit:{identifier}"
    current_time = time.time()
    window_start = current_time - window
    
    # Remove old entries
    redis_client.zremrangebyscore(key, 0, window_start)
    
    # Count current requests
    current_requests = redis_client.zcard(key)
    
    if current_requests >= limit:
        return False, current_requests, window
    
    # Add current request
    redis_client.zadd(key, {str(current_time): current_time})
    redis_client.expire(key, window)
    
    return True, current_requests + 1, window

# Apply to controller
@http.route('/api/v1/orders', type='http', auth='none', methods=['POST'], csrf=False)
def create_order(self, **kwargs):
    # Get client identifier
    client_id = request.httprequest.headers.get('Authorization', 'anonymous')
    
    # Apply rate limit
    allowed, current, limit = rate_limit(client_id, limit=50, window=3600)
    
    if not allowed:
        return self._error_response(
            'Rate limit exceeded', 
            429, 
            f'{current}/{limit} requests per hour'
        )
    
    # Continue with order creation...
```

## 4. Input Validation and Sanitization

### Comprehensive Input Validation

```python
from odoo.tools import html_escape
import re

class APIValidator:
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone number format"""
        pattern = r'^\+?[\d\s\-\(\)]+$'
        return re.match(pattern, phone) is not None
    
    @staticmethod
    def sanitize_string(value, max_length=255):
        """Sanitize string input"""
        if not isinstance(value, str):
            raise ValueError('String value expected')
        
        # Remove HTML tags and escape special characters
        value = html_escape(value.strip())
        
        # Truncate if too long
        if len(value) > max_length:
            value = value[:max_length]
        
        return value
    
    @staticmethod
    def validate_numeric(value, min_val=None, max_val=None):
        """Validate numeric input"""
        try:
            num_value = float(value)
        except (ValueError, TypeError):
            raise ValueError('Numeric value expected')
        
        if min_val is not None and num_value < min_val:
            raise ValueError(f'Value must be >= {min_val}')
        
        if max_val is not None and num_value > max_val:
            raise ValueError(f'Value must be <= {max_val}')
        
        return num_value

# Usage in controller
@http.route('/api/v1/customers', type='http', auth='none', methods=['POST'], csrf=False)
def create_customer(self, **kwargs):
    try:
        # Validate and sanitize inputs
        name = APIValidator.sanitize_string(kwargs.get('name'), max_length=100)
        email = APIValidator.sanitize_string(kwargs.get('email', ''), max_length=255)
        phone = APIValidator.sanitize_string(kwargs.get('phone', ''), max_length=20)
        
        if email and not APIValidator.validate_email(email):
            return self._error_response('Invalid email format', 400)
        
        if phone and not APIValidator.validate_phone(phone):
            return self._error_response('Invalid phone format', 400)
        
        # Create customer
        customer = request.env['res.partner'].create({
            'name': name,
            'email': email,
            'phone': phone,
            'is_company': False,
        })
        
        return self._json_response({
            'customer_id': customer.id,
            'name': customer.name
        })
        
    except ValueError as e:
        return self._error_response('Validation error', 400, str(e))
    except Exception as e:
        _logger.error(f"API Error in create_customer: {str(e)}")
        return self._error_response('Internal server error', 500)
```

## 5. Error Handling and Logging

### Structured Error Handling

```python
# Custom exception classes
class APIError(Exception):
    def __init__(self, message, code=400, details=None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(message)

class AuthenticationError(APIError):
    def __init__(self, message='Authentication failed'):
        super().__init__(message, 401)

class AuthorizationError(APIError):
    def __init__(self, message='Access denied'):
        super().__init__(message, 403)

class ValidationError(APIError):
    def __init__(self, message, details=None):
        super().__init__(message, 400, details)

# Enhanced error handling decorator
def handle_api_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except AuthenticationError as e:
            return request.make_json_response({
                'status': 'error',
                'error': {
                    'code': e.code,
                    'message': e.message,
                    'type': 'authentication'
                }
            }, status=e.code)
        except AuthorizationError as e:
            return request.make_json_response({
                'status': 'error',
                'error': {
                    'code': e.code,
                    'message': e.message,
                    'type': 'authorization'
                }
            }, status=e.code)
        except ValidationError as e:
            return request.make_json_response({
                'status': 'error',
                'error': {
                    'code': e.code,
                    'message': e.message,
                    'details': e.details,
                    'type': 'validation'
                }
            }, status=e.code)
        except APIError as e:
            return request.make_json_response({
                'status': 'error',
                'error': {
                    'code': e.code,
                    'message': e.message,
                    'details': e.details
                }
            }, status=e.code)
        except Exception as e:
            _logger.exception(f"Unexpected API error in {func.__name__}: {str(e)}")
            return request.make_json_response({
                'status': 'error',
                'error': {
                    'code': 500,
                    'message': 'Internal server error',
                    'type': 'server_error'
                }
            }, status=500)
    return wrapper
```

## 6. API Documentation

### OpenAPI/Swagger Integration

```python
# Add API documentation
api_docs = {
    'openapi': '3.0.0',
    'info': {
        'title': 'Odoo Custom API',
        'version': '1.0.0',
        'description': 'Custom API for Odoo integration'
    },
    'paths': {
        '/api/v1/products': {
            'get': {
                'summary': 'Get products list',
                'parameters': [
                    {
                        'name': 'page',
                        'in': 'query',
                        'schema': {'type': 'integer', 'default': 1}
                    },
                    {
                        'name': 'limit',
                        'in': 'query',
                        'schema': {'type': 'integer', 'default': 20, 'maximum': 100}
                    },
                    {
                        'name': 'category_id',
                        'in': 'query',
                        'schema': {'type': 'integer'}
                    }
                ],
                'responses': {
                    '200': {
                        'description': 'Successful response',
                        'content': {
                            'application/json': {
                                'schema': {
                                    'type': 'object',
                                    'properties': {
                                        'status': {'type': 'string'},
                                        'data': {
                                            'type': 'object',
                                            'properties': {
                                                'products': {
                                                    'type': 'array',
                                                    'items': {'$ref': '#/components/schemas/Product'}
                                                },
                                                'pagination': {'$ref': '#/components/schemas/Pagination'}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    'components': {
        'schemas': {
            'Product': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'name': {'type': 'string'},
                    'default_code': {'type': 'string'},
                    'price': {'type': 'number'},
                    'category': {'type': 'string'}
                }
            },
            'Pagination': {
                'type': 'object',
                'properties': {
                    'page': {'type': 'integer'},
                    'limit': {'type': 'integer'},
                    'total': {'type': 'integer'},
                    'pages': {'type': 'integer'}
                }
            }
        }
    }
}

@http.route('/api/docs', type='http', auth='none', methods=['GET'])
def api_documentation(self):
    """Return API documentation"""
    return request.make_json_response(api_docs)
```

## 7. Testing and Monitoring

### API Testing Framework

```python
# tests/test_api.py
from odoo.tests.common import HttpCase
import json

class TestAPI(HttpCase):
    
    def setUp(self):
        super().setUp()
        # Create test API token
        self.api_token = self.env['api.token'].create({
            'name': 'Test Token',
            'user_id': self.env.user.id,
        })
        self.auth_header = {'Authorization': f'Bearer {self.api_token.token}'}
    
    def test_get_products_success(self):
        """Test successful product retrieval"""
        response = self.url_open(
            '/api/v1/products',
            headers=self.auth_header
        )
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('products', data['data'])
        self.assertIn('pagination', data['data'])
    
    def test_get_products_unauthorized(self):
        """Test unauthorized access"""
        response = self.url_open('/api/v1/products')
        self.assertEqual(response.status_code, 401)
        
        data = response.json()
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error']['code'], 401)
    
    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        # Make multiple requests to trigger rate limit
        for i in range(52):  # Exceed limit of 50
            response = self.url_open(
                '/api/v1/products',
                headers=self.auth_header
            )
        
        self.assertEqual(response.status_code, 429)
```

## Conclusion

Building secure, scalable APIs in Odoo requires attention to authentication, validation, error handling, and performance. By following these best practices:

1. **Always validate and sanitize inputs**
2. **Implement proper authentication and authorization**
3. **Use rate limiting to prevent abuse**
4. **Provide clear, consistent error responses**
5. **Document your API thoroughly**
6. **Test extensively and monitor performance**

These patterns will help you create robust APIs that integrate seamlessly with external systems while maintaining security and performance standards.

What challenges have you faced when building custom Odoo APIs? Share your experiences in the comments!