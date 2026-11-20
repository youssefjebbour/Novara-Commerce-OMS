# REST API

Base: `http://localhost:8081/api`. Interactive schema: `http://localhost:8081/swagger-ui.html`. Use `Authorization: Bearer <accessToken>` on protected requests. JSON is the default content type, except image upload (`multipart/form-data`). Dates are `YYYY-MM-DD`; timestamps are ISO UTC.

Responses are explicit resource DTOs. Lists use `{ content, page, size, totalElements, totalPages }`, except small category/inventory lists. Pages are zero-based; maximum page size is 100. Errors use `{message,status,path,timestamp,fields}`; security filter errors contain `{message,status}`.

## Public and customer endpoints

| Method    | Path                            | Behavior                                                                    |
| --------- | ------------------------------- | --------------------------------------------------------------------------- |
| POST      | `/auth/register`                | Create customer; return tokens and user, 201                                |
| POST      | `/auth/login`                   | Validate BCrypt password; issue session                                     |
| POST      | `/auth/refresh`                 | Rotate refresh token and revoke prior session                               |
| POST      | `/auth/logout`                  | Revoke the supplied refresh session                                         |
| GET       | `/products`, `/products/search` | `q`, `category`, `minPrice`, `maxPrice`, `featured`, `page`, `size`, `sort` |
| GET       | `/products/{id}`                | Active product, gallery, current stock                                      |
| GET       | `/products/best-sellers`        | Top four active products from noncancelled, nonfailed orders                |
| GET       | `/categories`                   | Catalog categories                                                          |
| GET       | `/categories/{id}/products`     | Products in a category                                                      |
| POST      | `/newsletter`                   | Persist subscription; repeated subscription succeeds                        |
| GET/PATCH | `/me`                           | Current profile; editable name and phone                                    |
| GET       | `/me/addresses`                 | Latest shipping address snapshots                                           |
| POST      | `/orders`                       | Customer checkout, transactional, 201                                       |
| GET       | `/orders/my-orders`             | Current customer’s orders                                                   |
| GET       | `/orders/{id}`                  | Owned order with payment, shipment and history                              |
| GET       | `/orders/{id}/tracking`         | Same owned order/tracking view                                              |
| POST      | `/orders/{id}/cancel`           | Customer cancellation while pending/confirmed                               |
| POST      | `/orders/{id}/payment`          | Retry a failed card payment                                                 |

Product sorting: `name`, `price`, `createdAt`, or `id`, followed by `,asc` or `,desc`. Only active products are publicly visible. IDs of other customers’ orders return 404.

### Checkout example

```json
{
  "items": [{ "productId": 1, "quantity": 1 }],
  "address": {
    "recipient": "Jamie Chen",
    "phone": "+1 415 555 0100",
    "line1": "120 Market Street",
    "line2": "Apt 4",
    "city": "San Francisco",
    "region": "California",
    "postalCode": "94103",
    "country": "United States"
  },
  "paymentMethod": "CARD",
  "simulation": "SUCCESS",
  "idempotencyKey": "a-new-uuid-for-this-checkout"
}
```

Methods: `CARD` or `COD`. Simulation: `SUCCESS` or `DECLINE`. Never send a card number/CVV, price, or total. Unknown fields are rejected. Duplicate product lines are consolidated, with at most 99 units per product. An identical request/key returns the existing order. Reusing that key for a different request returns 409. A failed card payment still creates an order with payment `FAILED`; inventory remains available.

Registration: `{name,email,password}`. Login: `{email,password}`. Refresh/logout: `{refreshToken}`. Profile: `{name,phone}`. Cancellation: `{reason}`. Retry: `{simulation:"SUCCESS"}`.

## Internal endpoints and permissions

`A` = admin, `M` = manager, `S` = staff.

| Method         | Path                                               | Roles |
| -------------- | -------------------------------------------------- | ----- |
| GET            | `/admin/orders`, `/admin/orders/{id}`              | A M S |
| PATCH          | `/admin/orders/{id}/status`                        | A M S |
| POST           | `/admin/orders/{id}/cancel`                        | A M   |
| GET/POST       | `/admin/products`                                  | A M   |
| GET/PUT/DELETE | `/admin/products/{id}`                             | A M   |
| POST           | `/admin/categories`                                | A M   |
| POST           | `/admin/uploads`                                   | A M   |
| GET            | `/admin/inventory`                                 | A M   |
| GET            | `/admin/inventory/movements`                       | A M   |
| POST           | `/admin/inventory/adjustments`                     | A M   |
| GET            | `/admin/customers`, `/admin/customers/{id}`        | A M   |
| GET            | `/admin/payments`, `/admin/payments/{id}`          | A M   |
| GET/POST       | `/admin/shipments`                                 | A M S |
| PATCH          | `/admin/shipments/{id}/status`                     | A M S |
| GET            | `/admin/analytics/overview`, `/revenue`, `/orders` | A M   |
| GET/POST       | `/admin/users`                                     | A     |
| PATCH          | `/admin/users/{id}`                                | A     |

Order list filters: `q`, `status`, `paymentStatus`, `from`, `to`, `page`, `size`, `sort`. Sort fields: `createdAt`, `total`, `number`, `status`. End dates are inclusive UTC calendar dates. Analytics accepts `days` from 1–365 and returns totals, daily revenue/order series, state distribution and best sellers; the three analytics paths expose the same composite report.

Product list additionally supports `active`, `category`, `q`. Inventory supports `q` and `lowStock`; movements support `productId`, `page`, `size`. Customers support `q`. Payments support `status`. Other record lists are paginated.

### Mutation bodies

```json
// PATCH order status
{"status":"CONFIRMED","note":"Payment and inventory checked"}

// POST stock adjustment (negative for stock-out)
{"productId":1,"delta":20,"reason":"Supplier delivery"}

// POST shipment; estimatedDelivery must not be in the past
{"orderId":31,"carrier":"NOVARA Express","estimatedDelivery":"2026-12-01"}

// PATCH shipment; also advances the order
{"status":"IN_TRANSIT"}

// POST category
{"name":"Desk accessories","slug":"desk-accessories"}

// POST internal user
{"name":"Morgan Park","email":"morgan@example.test","password":"LongDemoPass!2026","role":"STAFF"}

// PATCH internal access (cannot edit own access)
{"role":"MANAGER","active":true}
```

Product create/update fields: `sku`, `name`, `description`, `price`, optional `compareAtPrice`, `categoryId`, `active`, `featured`, `specifications`, `images`. Specification presentation uses `Label: value|Label: value`. Images are 1–8 HTTPS URLs or local `/media/` paths. New products start with zero inventory; use stock adjustment. Delete is soft deactivation with HTTP 204.

Upload field is `file`. Only decoded PNG/JPEG are accepted, up to 5 MB and 20 megapixels, max dimension 6000 pixels. Images are re-encoded as PNG to strip executable content/metadata and stored under generated UUID filenames. Response: `{url:"/media/uploads/<uuid>.png"}`.

## Status codes

- 200 successful reads/updates/actions; 201 registration, checkout and resource creation; 204 deactivation.
- 400 invalid fields, unsupported sorts, malformed payloads, unexpected fields.
- 401 invalid or missing authentication; 403 forbidden role.
- 404 nonexistent resources or non-owned orders.
- 409 insufficient stock, duplicates, invalid transition, unavailable product, reused checkout key.
- 413 oversized image; 500 generic unexpected failure, with detail only in server logs.
