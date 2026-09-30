# Analytics events

The frontend sends user-activity events to the analytics backend. This document is the
contract between the two. The source of truth for types is
[`lib/analytics.ts`](../lib/analytics.ts) (`EventName`, `EventPropertiesMap`, `AnalyticsEvent`).

## Transport

|             |                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `process.env.NEXT_PUBLIC_EVENTS_API_URL`                                                                                                |
| Method      | `POST`                                                                                                                                  |
| Headers     | `Content-Type: application/json`                                                                                                        |
| Body        | **One event per request** — a single JSON object (the envelope below)                                                                   |
| Credentials | None (`credentials: "omit"`) — no cookies are sent                                                                                      |
| Delivery    | Fire-and-forget with `fetch(..., { keepalive: true })`, scheduled in `requestIdleCallback`. Errors are swallowed; there are no retries. |

Because the request is cross-origin with a JSON content type, the browser sends a CORS
preflight. The backend must respond to `OPTIONS` with:

```
Access-Control-Allow-Origin: <frontend origin or *>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Any `2xx` response is fine; the body is ignored. If the env var is not set, no requests are
made (events are still logged to the console in development).

## Envelope

Every event has the same top-level shape:

```jsonc
{
  "eventId": "9b1f7c1e-2f6a-4c55-9a39-0f2f5b1a4c77", // uuid v4, unique per event (use for de-duplication)
  "eventName": "add_to_cart", // see EventName below
  "timestamp": "2026-09-30T11:42:07.512Z", // ISO 8601, UTC, client clock
  "sessionId": "5d0c...", // uuid, created once per browser, stored in localStorage (ss_session_id)
  "userId": "a41e...", // anonymous uuid, created once per browser, stored in localStorage (ss_anon_user_id)
  "page": "/menu", // window.location.pathname when the event fired
  "deviceType": "mobile", // "mobile" | "tablet" | "desktop"
  "properties": {/* event-specific, see below */},
}
```

| Field        | Type                                | Notes                                             |
| ------------ | ----------------------------------- | ------------------------------------------------- |
| `eventId`    | `string` (uuid)                     | Unique. Safe as an idempotency key.               |
| `eventName`  | `EventName`                         | One of the 15 names below.                        |
| `timestamp`  | `string` (ISO 8601)                 | Client time in UTC.                               |
| `sessionId`  | `string` (uuid)                     | Stable per browser until localStorage is cleared. |
| `userId`     | `string` (uuid)                     | Anonymous; no PII. Stable per browser.            |
| `page`       | `string`                            | Path only, no query string.                       |
| `deviceType` | `"mobile" \| "tablet" \| "desktop"` | From user agent, falling back to viewport width.  |
| `properties` | `object`                            | Shape depends on `eventName`.                     |

Money values are in **Indian rupees (INR)** as numbers (e.g. `449`, `471.45`), not paise.

## `EventName`

```ts
type EventName =
  | "page_view"
  | "item_viewed"
  | "item_clicked"
  | "category_filtered"
  | "search_performed"
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_quantity_changed"
  | "cart_viewed"
  | "checkout_started"
  | "payment_method_selected"
  | "order_placed"
  | "order_cancelled"
  | "order_failed"
  | "feedback_submitted";
```

## Events

### Browsing

#### `page_view`

Fired on first load and on every client-side route change.

| Property   | Type             | Description                                                |
| ---------- | ---------------- | ---------------------------------------------------------- |
| `title`    | `string`         | `document.title`                                           |
| `referrer` | `string \| null` | Previous in-app path, or `document.referrer` on first load |

#### `item_viewed`

Fired when an item detail page (`/menu/[id]`) is shown.

| Property   | Type                                                 | Description                         |
| ---------- | ---------------------------------------------------- | ----------------------------------- |
| `itemId`   | `string`                                             | Menu item id, e.g. `butter-chicken` |
| `name`     | `string`                                             | Display name                        |
| `category` | `"Starters" \| "Mains" \| "Desserts" \| "Beverages"` |                                     |
| `price`    | `number`                                             | Unit price (INR)                    |

#### `item_clicked`

Fired when a user clicks an item (image or name) to open its detail page.

Same properties as `item_viewed`, plus:

| Property | Type                         | Description              |
| -------- | ---------------------------- | ------------------------ |
| `source` | `"menu" \| "home" \| "cart"` | Where the click happened |

#### `category_filtered`

Fired when the user picks a category tab on `/menu`.

| Property      | Type                                                          | Description                                                    |
| ------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `category`    | `"All" \| "Starters" \| "Mains" \| "Desserts" \| "Beverages"` | Selected tab                                                   |
| `resultCount` | `number`                                                      | Items shown after filtering (also respects the current search) |

#### `search_performed`

Fired 600 ms after the user stops typing a non-empty search on `/menu`.

| Property      | Type     | Description                                   |
| ------------- | -------- | --------------------------------------------- |
| `query`       | `string` | Trimmed search text                           |
| `resultCount` | `number` | Items matching (within the selected category) |

### Cart

#### `add_to_cart`

| Property | Type     | Description                                                |
| -------- | -------- | ---------------------------------------------------------- |
| `itemId` | `string` |                                                            |
| `name`   | `string` |                                                            |
| `qty`    | `number` | Quantity **added** by this action (not the new line total) |
| `price`  | `number` | Unit price (INR)                                           |

#### `remove_from_cart`

Fired when a line is removed (× button, or decreasing quantity to 0).

| Property | Type     | Description                                  |
| -------- | -------- | -------------------------------------------- |
| `itemId` | `string` |                                              |
| `name`   | `string` |                                              |
| `qty`    | `number` | Quantity that was in the cart before removal |
| `price`  | `number` | Unit price (INR)                             |

#### `cart_quantity_changed`

Fired when the quantity of an existing cart line changes via the +/- stepper.

| Property      | Type     | Description                |
| ------------- | -------- | -------------------------- |
| `itemId`      | `string` |                            |
| `name`        | `string` |                            |
| `qty`         | `number` | New quantity               |
| `previousQty` | `number` | Quantity before the change |
| `price`       | `number` | Unit price (INR)           |

#### `cart_viewed`

Fired when the `/cart` page is shown or the cart drawer is opened.

| Property    | Type                 | Description                    |
| ----------- | -------------------- | ------------------------------ |
| `cartValue` | `number`             | Cart subtotal before tax (INR) |
| `itemCount` | `number`             | Total units in the cart        |
| `surface`   | `"page" \| "drawer"` | Which UI showed the cart       |

### Checkout & orders

#### `checkout_started`

Fired once when `/checkout` is shown with a non-empty cart.

| Property    | Type     | Description               |
| ----------- | -------- | ------------------------- |
| `cartValue` | `number` | Subtotal before tax (INR) |
| `itemCount` | `number` | Total units               |

#### `payment_method_selected`

Fired when the user switches payment method (UPI is pre-selected and does not fire on load).

| Property        | Type              | Description |
| --------------- | ----------------- | ----------- |
| `paymentMethod` | `"upi" \| "card"` |             |

#### `order_placed`

Fired when the (mock) payment succeeds and the order is confirmed.

| Property        | Type                                                                  | Description               |
| --------------- | --------------------------------------------------------------------- | ------------------------- |
| `orderId`       | `string`                                                              | e.g. `SS-7K2Q9M`          |
| `items`         | `Array<{ itemId: string; name: string; qty: number; price: number }>` | `price` is the unit price |
| `subtotal`      | `number`                                                              | Before tax (INR)          |
| `tax`           | `number`                                                              | GST at 5% (INR)           |
| `total`         | `number`                                                              | `subtotal + tax` (INR)    |
| `paymentMethod` | `"upi" \| "card"`                                                     |                           |

#### `order_failed`

Fired when the (mock) payment fails. No `order_placed` event is sent for this order.

| Property        | Type              | Description                                                                    |
| --------------- | ----------------- | ------------------------------------------------------------------------------ |
| `orderId`       | `string`          |                                                                                |
| `reason`        | `string`          | e.g. `Payment declined by bank`, `UPI request timed out`, `Insufficient funds` |
| `total`         | `number`          | Order total that failed (INR)                                                  |
| `paymentMethod` | `"upi" \| "card"` |                                                                                |

#### `order_cancelled`

Fired when the customer cancels a confirmed order within the 60-second cancellation window.
Always follows an `order_placed` with the same `orderId`.

| Property  | Type     | Description                           |
| --------- | -------- | ------------------------------------- |
| `orderId` | `string` |                                       |
| `reason`  | `string` | Currently always `customer_cancelled` |

### Feedback

#### `feedback_submitted`

Fired when a review is submitted, from an item page or after a successful order.

| Property        | Type                          | Description                                                                     |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `itemId`        | `string`                      | Reviewed item                                                                   |
| `rating`        | `number`                      | Integer 1–5                                                                     |
| `commentLength` | `number`                      | Characters in the trimmed comment (0–500)                                       |
| `comment`       | `string`                      | Trimmed comment text (may be empty). User-generated — treat as untrusted input. |
| `source`        | `"item_page" \| "order_page"` | Where the review was written                                                    |
| `orderId`       | `string` (optional)           | Present when `source` is `order_page`                                           |

## Example payloads

```json
{
  "eventId": "0f8e6f38-4f1e-4c1b-8d1d-0a5f0b7e2c11",
  "eventName": "order_placed",
  "timestamp": "2026-09-30T12:03:44.120Z",
  "sessionId": "b7a2d0c4-0e7b-4f5e-9d1a-3c2f4b6a8e90",
  "userId": "e3c1f5a2-7b9d-4c6e-8f0a-1b2c3d4e5f60",
  "page": "/checkout",
  "deviceType": "mobile",
  "properties": {
    "orderId": "SS-7K2Q9M",
    "items": [
      { "itemId": "butter-chicken", "name": "Butter Chicken", "qty": 1, "price": 449 },
      { "itemId": "masala-chai", "name": "Masala Chai", "qty": 2, "price": 79 }
    ],
    "subtotal": 607,
    "tax": 30.35,
    "total": 637.35,
    "paymentMethod": "upi"
  }
}
```

```json
{
  "eventId": "2c4e6a80-1b3d-4f5a-9c7e-8d0f2a4b6c8e",
  "eventName": "feedback_submitted",
  "timestamp": "2026-09-30T12:10:02.004Z",
  "sessionId": "b7a2d0c4-0e7b-4f5e-9d1a-3c2f4b6a8e90",
  "userId": "e3c1f5a2-7b9d-4c6e-8f0a-1b2c3d4e5f60",
  "page": "/order/SS-7K2Q9M",
  "deviceType": "mobile",
  "properties": {
    "itemId": "butter-chicken",
    "rating": 5,
    "commentLength": 34,
    "comment": "Silky gravy, perfectly charred.",
    "source": "order_page",
    "orderId": "SS-7K2Q9M"
  }
}
```

## Privacy notes

- No names, phone numbers, addresses, UPI IDs or card details are ever included in events.
- `userId` is a random identifier, not linked to any account.
- Review comments are free text and could contain anything a user types.
