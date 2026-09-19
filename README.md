# Lafayette Bite API

A REST API for Lafayette Bite, a Nigerian bakery business, serving cakes, pastries, and platters with real product data. Built for Task 1 of the Product Design and Engineering Bootcamp.

## Resource design

Four resource types, related as follows:

- A **Category** has many **Products**
- A **Product** belongs to one **Category**, and can have many **ProductVariants** (used for cakes with size/layer options, pastries with quantities, and platters with small/medium/large sizes)
- A **Customer** has many **Orders**
- An **Order** belongs to one **Customer**, and has many **OrderItems**
- An **OrderItem** belongs to one **Order**, one **Product**, and optionally one **ProductVariant**

| Resource | Field | Type | Required |
|---|---|---|---|
| Category | id | string (cuid) | auto |
| | name | string | yes |
| | slug | string | yes |
| | description | string | no |
| Product | id | string (cuid) | auto |
| | name | string | yes |
| | slug | string | yes |
| | description | string | no |
| | categoryId | string | yes |
| | hasVariants | boolean | yes (default false) |
| | basePriceKobo | integer | required if no variants |
| | inStock | boolean | yes (default true) |
| | isPlatter | boolean | yes (default false) |
| ProductVariant | id | string (cuid) | auto |
| | productId | string | yes |
| | label | string | yes |
| | priceKobo | integer | yes |
| | sizeInches | integer | no |
| | layers | integer | no |
| | quantity | integer | no |
| Customer | id | string (cuid) | auto |
| | name | string | yes |
| | email | string | yes |
| | phone | string | no |
| | address | string | no |
| Order | id | string (cuid) | auto |
| | customerId | string | yes |
| | status | enum (PENDING, CONFIRMED, BAKING, READY, DELIVERED, CANCELLED) | yes |
| | totalKobo | integer | auto-calculated |
| | notes | string | no |
| OrderItem | id | string (cuid) | auto |
| | orderId | string | yes |
| | productId | string | yes |
| | variantId | string | no |
| | quantity | integer | yes |
| | unitPriceKobo | integer | auto-set at order time |

All prices are stored in kobo (whole numbers, no decimals) to avoid floating-point rounding errors with money.

## Tech stack

- Next.js (App Router) — API routes
- Prisma + PostgreSQL — database
- Zod — request validation
- Upstash Redis — rate limiting

## Getting started

1. Clone the repo:
```bash
   git clone https://github.com/Lafayettejoe/lafayette-bite-api.git
   cd lafayette-bite-api
```

2. Install dependencies:
```bash
   npm install
```

3. Copy `.env.example` to `.env` and fill in your own values:
```bash
   DATABASE_URL="your postgres connection string"
   UPSTASH_REDIS_REST_URL="your upstash redis rest url"
   UPSTASH_REDIS_REST_TOKEN="your upstash redis rest token"
```

4. Run migrations and seed the database:
```bash
   npx prisma migrate dev
   npx prisma db seed
```

5. Start the dev server:
```bash
   npm run dev
```

The API runs at `http://localhost:3000/api/v1`.

## Response envelope

Every successful response looks like this:

```json
{
  "data": { ... },
  "meta": { "total": 13, "limit": 20, "offset": 0, "hasMore": false }
}
```

`meta` only appears on list endpoints. Single-item responses just have `data`.

Every error looks like this:

```json
{
  "error": { "code": "NOT_FOUND", "message": "Product not found" }
}
```

## Error codes

| Status | Code | When it happens |
|---|---|---|
| 400 | INVALID_PAGINATION | offset is negative or malformed |
| 400 | INVALID_SORT | sort field isn't in the allowed list |
| 400 | INVALID_STATUS | status filter isn't a valid order status |
| 400 | INVALID_JSON | request body isn't valid JSON |
| 400 | INVALID_TRANSITION / INVALID_OPERATION | order status change isn't allowed |
| 404 | NOT_FOUND | resource doesn't exist |
| 422 | VALIDATION_ERROR | required field missing or wrong type on a POST/PATCH body |
| 422 | VARIANT_REQUIRED | product needs a variant and none was given |
| 429 | RATE_LIMITED | too many requests from this IP |
| 500 | SERVER_ERROR | unexpected server error |

## Rate limiting

Every endpoint is limited to 100 requests per minute per IP address, using a sliding window (Upstash Redis). Going over the limit returns:

```json
{
  "error": { "code": "RATE_LIMITED", "message": "Too many requests. Please slow down." }
}
```

with a `429` status and these headers:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After` (seconds until you can try again)

The limit (100 per minute) is set in `lib/ratelimit.ts`, not hardcoded inside each route handler.

## Endpoints

### Categories

**`GET /api/v1/categories`** — list categories

| Query param | Type | Default |
|---|---|---|
| limit | integer | 20 (max 100) |
| offset | integer | 0 |
| sort | `name` or `createdAt` | name |
| order | `asc` or `desc` | asc |

```bash
curl "http://localhost:3000/api/v1/categories?limit=10&sort=name&order=asc"
```

```json
{
  "data": [
    { "id": "cly...", "name": "Cakes", "slug": "cakes", "description": null, "_count": { "products": 5 } }
  ],
  "meta": { "total": 3, "limit": 10, "offset": 0, "hasMore": false }
}
```

**`GET /api/v1/categories/:id`** — get one category (accepts id or slug), with its in-stock products

```bash
curl "http://localhost:3000/api/v1/categories/cakes"
```

```json
{
  "data": {
    "id": "cly...",
    "name": "Cakes",
    "slug": "cakes",
    "products": [
      { "id": "cly...", "name": "Red Velvet Cake", "slug": "red-velvet-cake", "variants": [ ... ] }
    ]
  }
}
```

### Products

**`GET /api/v1/products`** — list products

| Query param | Type | Default |
|---|---|---|
| limit | integer | 20 (max 100) |
| offset | integer | 0 |
| sort | `name`, `createdAt`, or `basePriceKobo` | name |
| order | `asc` or `desc` | asc |
| category | category slug or id | — |
| inStock | `true` or `false` | — |
| isPlatter | `true` or `false` | — |
| hasVariants | `true` or `false` | — |

```bash
curl "http://localhost:3000/api/v1/products?category=cakes&inStock=true&limit=5"
```

```json
{
  "data": [
    {
      "id": "cly...",
      "name": "Red Velvet Cake",
      "slug": "red-velvet-cake",
      "hasVariants": true,
      "inStock": true,
      "category": { "id": "cly...", "name": "Cakes", "slug": "cakes" },
      "variants": [
        { "id": "cly...", "label": "8-inch, 2 layers", "priceKobo": 1500000 }
      ]
    }
  ],
  "meta": { "total": 13, "limit": 5, "offset": 0, "hasMore": true }
}
```

**`GET /api/v1/products/:id`** — get one product (accepts id or slug), with variants and category

```bash
curl "http://localhost:3000/api/v1/products/red-velvet-cake"
```

### Customers

**`GET /api/v1/customers`** — list customers

| Query param | Type | Default |
|---|---|---|
| limit | integer | 20 (max 100) |
| offset | integer | 0 |
| sort | `name`, `email`, or `createdAt` | createdAt |
| order | `asc` or `desc` | desc |
| search | string, matches name or email | — |

```bash
curl "http://localhost:3000/api/v1/customers?search=faith&limit=10"
```

**`GET /api/v1/customers/:id`** — get one customer, with their 10 most recent orders

```bash
curl "http://localhost:3000/api/v1/customers/cly..."
```

### Orders

**`GET /api/v1/orders`** — list orders

| Query param | Type | Default |
|---|---|---|
| limit | integer | 20 (max 100) |
| offset | integer | 0 |
| sort | `createdAt`, `totalKobo`, or `status` | createdAt |
| order | `asc` or `desc` | desc |
| status | `PENDING`, `CONFIRMED`, `BAKING`, `READY`, `DELIVERED`, or `CANCELLED` | — |
| customerId | string | — |

```bash
curl "http://localhost:3000/api/v1/orders?status=PENDING&limit=10"
```

**`GET /api/v1/orders/:id`** — get one order with items

```bash
curl "http://localhost:3000/api/v1/orders/cly..."
```

**`POST /api/v1/orders`** — create an order

```bash
curl -X POST "http://localhost:3000/api/v1/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cly...",
    "items": [
      { "productId": "cly...", "variantId": "cly...", "quantity": 2 }
    ],
    "notes": "Deliver by 4pm"
  }'
```

Response is `201` with the created order, including calculated `totalKobo`. Validation errors return `422` with the specific field named.

**`PATCH /api/v1/orders/:id`** — update order status

```bash
curl -X PATCH "http://localhost:3000/api/v1/orders/cly..." \
  -H "Content-Type: application/json" \
  -d '{ "status": "CONFIRMED" }'
```

Orders that are already `DELIVERED` or `CANCELLED` can't be updated — this returns `400 INVALID_TRANSITION`.

**`DELETE /api/v1/orders/:id`** — cancel an order (sets status to `CANCELLED`, doesn't remove the row)

```bash
curl -X DELETE "http://localhost:3000/api/v1/orders/cly..."
```

A `DELIVERED` order can't be cancelled — this returns `400 INVALID_OPERATION`.

## Design decisions

**Why these resources (categories, products, customers, orders).** These map to how Lafayette Bite actually works as a business. Products are grouped into categories so the catalog stays organized. Customers place orders, and each order can contain several products — some of those products come in different variants (like cake size or platter type), so a variant needed its own place to live rather than being crammed into the product itself. Four resources was enough to represent a real bakery order end-to-end without adding anything that wasn't needed.

**Why generated IDs instead of 1, 2, 3...** If IDs are sequential, anyone can guess them — request product 1, then 2, then 3, and walk through your entire catalog or customer list without you intending that. A generated ID (`cuid()`) doesn't tell you anything about how many records exist or what a "next" or "previous" one might be. It's a small thing, but it closes off a way for someone to scrape or enumerate data they weren't given a link to.

**Why offset/limit pagination instead of cursor-based.** Offset pagination (`?limit=20&offset=20`) is simpler to build and simpler for whoever's using the API to understand — "give me page 2" is intuitive. It's a reasonable fit here because the catalog is small (a few hundred products at most) and not changing every second. Cursor pagination is usually the better choice once a dataset is large or being updated constantly while someone is paging through it, because offset pagination can skip or repeat a row if something gets added or removed in between page requests. That risk isn't really present in a bakery catalog this size, so the simpler option made sense.

**Why this response shape (`{ data, meta }` for success, `{ error: { code, message } }` for errors).** Every endpoint returns data the same way, so whoever's building against the API doesn't have to learn a different shape for each one. `data` always holds the actual result. `meta` only shows up on list endpoints and tells you the total count, the limit and offset used, and whether there's another page. Errors always have a `code` (so code can check for it) and a `message` (so a human reading it knows what went wrong) — never a 200 status with an error hiding inside the body.

## Consumer app

A minimal storefront page calls this API's live URL, lists products with category filtering, and supports paginating through results.

## Live API

**URL:** _add once deployed_
