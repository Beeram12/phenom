# Analytics events

The frontend sends user-activity events to the analytics backend. This document is the
contract between the two. The source of truth for types is
[`lib/analytics.ts`](../lib/analytics.ts) (`EventName`, `EventPropertiesMap`, `AnalyticsEvent`).

## How events reach the backend

The UI calls `track(eventName, properties)` with the UI-level events listed further down.
`lib/analytics.ts` is an adapter: it translates each UI event into zero or more events in the
**Food Events API** contract (see the backend's `docs/FRONTEND_EVENTS.md`), queues them, and
sends them in batches.

|              |                                                                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint     | `{NEXT_PUBLIC_EVENTS_API_URL}/api/v1/events/batch`                                                                                                                                                                      |
| Method       | `POST`                                                                                                                                                                                                                  |
| Headers      | `Content-Type: application/json`, `X-API-Key: {NEXT_PUBLIC_EVENTS_API_KEY}`                                                                                                                                             |
| Body         | `{ "events": BackendEvent[] }` — up to 50 events per request (API limit is 100)                                                                                                                                         |
| Batching     | Flushed every 3 s, immediately at 50 queued events, and when the tab is hidden or closed (`keepalive`)                                                                                                                  |
| Retries      | Network errors and `5xx` are re-queued (same `event_id`s, so no duplicates) and retried after 5 s. `4xx` are dropped (a warning is logged in development: 401 = bad key, 422 = invalid). Queue is capped at 500 events. |
| Failure mode | Never throws, never blocks rendering. If `NEXT_PUBLIC_EVENTS_API_URL` is unset nothing is sent.                                                                                                                         |

The backend must allow CORS `POST` from the site's origin with the `Content-Type` and
`X-API-Key` headers.

### Backend event envelope

```jsonc
{
  "event_id": "9b1f7c1e-2f6a-4c55-9a39-0f2f5b1a4c77", // uuid; the first backend event reuses the UI eventId
  "event_type": "item_added_to_cart",
  "schema_version": 1,
  "source": "web",
  "event_time": "2026-09-30T11:42:07.512Z", // ISO 8601 UTC
  "user_id": "a41e…", // anonymous uuid (localStorage ss_anon_user_id)
  "session_id": "5d0c…", // uuid (localStorage ss_session_id)
  "city": "hyderabad", // NEXT_PUBLIC_CITY
  "payload": {/* per event_type, see below */},
}
```

### UI event → backend event mapping

| UI event (`track`)                                                                | Backend `event_type`                            | Payload                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| first event in a tab session                                                      | `session_started`                               | `device_type`, `entry_page`                                                                                                                                                                                                                                                  |
| `page_view` on `/` or `/menu` (once per tab)                                      | `restaurant_viewed`                             | `restaurant_id`, `restaurant_name`, `cuisine`                                                                                                                                                                                                                                |
| `add_to_cart`                                                                     | `item_added_to_cart`                            | `item_id`, `name`, `category`, `unit_price`, `quantity`, `restaurant_id`                                                                                                                                                                                                     |
| `remove_from_cart`                                                                | `item_removed_from_cart`                        | same as above                                                                                                                                                                                                                                                                |
| `cart_quantity_changed`                                                           | `item_added_to_cart` / `item_removed_from_cart` | `quantity` = absolute change                                                                                                                                                                                                                                                 |
| `checkout_started`                                                                | `checkout_started`                              | `order_id` (new `o_…` id), `restaurant_id`, `item_count`, `cart_value`                                                                                                                                                                                                       |
| `order_placed`                                                                    | `payment_success` + `order_created`             | `payment_success`: `order_id`, `payment_id`, `amount`, `method`. `order_created`: `order_id`, `items[]` (`item_id`, `name`, `category`, `unit_price`, `quantity`), `subtotal`, `discount`, `tax`, `total`, `currency` (`INR`), `order_type` (`delivery`), `promised_eta_min` |
| `order_failed`                                                                    | `payment_failed`                                | `order_id`, `amount`, `method`, `reason`                                                                                                                                                                                                                                     |
| `order_cancelled`                                                                 | `order_cancelled`                               | `order_id`, `reason`, `cancelled_by` (`user`)                                                                                                                                                                                                                                |
| `feedback_submitted`                                                              | `item_reviewed`                                 | `restaurant_id`, `overall_rating`, `item_ratings[]`, `tags`, `comment`, `order_id` (when reviewed after an order)                                                                                                                                                            |
| `item_viewed`, `item_clicked`                                                     | —                                               | used only to remember item categories                                                                                                                                                                                                                                        |
| `category_filtered`, `search_performed`, `cart_viewed`, `payment_method_selected` | —                                               | not sent (no backend equivalent)                                                                                                                                                                                                                                             |

Categories are sent as the backend enum: `starter`, `main`, `dessert`, `drink`
(from the menu's Starters / Mains / Desserts / Beverages).

**Order ids.** The backend expects one `order_id` across `checkout_started`, `payment_*`,
`order_*` and `item_reviewed`. `checkout_started` mints the id; the order's first payment
event adopts it, and later events (cancel, review) look it up through an alias stored in
localStorage (`ss_order_alias`). The `SS-XXXXXX` id shown to customers is UI-only.

## UI events (input to `track()`)

Every UI event carries `eventId`, `eventName`, `timestamp`, `sessionId`, `userId`, `page`,
`deviceType` and `properties`, and is logged to the console in development.

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

## Example request

What the backend receives when a customer pays for an order (one batch, two events):

```http
POST /api/v1/events/batch
Content-Type: application/json
X-API-Key: <NEXT_PUBLIC_EVENTS_API_KEY>
```

```json
{
  "events": [
    {
      "event_id": "0f8e6f38-4f1e-4c1b-8d1d-0a5f0b7e2c11",
      "event_type": "payment_success",
      "schema_version": 1,
      "source": "web",
      "event_time": "2026-09-30T12:03:44.120Z",
      "user_id": "e3c1f5a2-7b9d-4c6e-8f0a-1b2c3d4e5f60",
      "session_id": "b7a2d0c4-0e7b-4f5e-9d1a-3c2f4b6a8e90",
      "city": "hyderabad",
      "payload": {
        "order_id": "o_4f2a9c1e7b",
        "restaurant_id": "r_saffron_sage",
        "payment_id": "p_8d3b0e6a21",
        "amount": 637.35,
        "method": "upi"
      }
    },
    {
      "event_id": "5a7c9e1b-3d5f-4a2c-8e0b-6f1d3a5c7e92",
      "event_type": "order_created",
      "schema_version": 1,
      "source": "web",
      "event_time": "2026-09-30T12:03:44.120Z",
      "user_id": "e3c1f5a2-7b9d-4c6e-8f0a-1b2c3d4e5f60",
      "session_id": "b7a2d0c4-0e7b-4f5e-9d1a-3c2f4b6a8e90",
      "city": "hyderabad",
      "payload": {
        "order_id": "o_4f2a9c1e7b",
        "restaurant_id": "r_saffron_sage",
        "items": [
          {
            "item_id": "butter-chicken",
            "name": "Butter Chicken",
            "category": "main",
            "unit_price": 449,
            "quantity": 1
          },
          {
            "item_id": "masala-chai",
            "name": "Masala Chai",
            "category": "drink",
            "unit_price": 79,
            "quantity": 2
          }
        ],
        "subtotal": 607,
        "discount": 0,
        "tax": 30.35,
        "total": 637.35,
        "currency": "INR",
        "order_type": "delivery",
        "promised_eta_min": 35
      }
    }
  ]
}
```

## Privacy notes

- No names, phone numbers, addresses, UPI IDs or card details are ever included in events.
- `NEXT_PUBLIC_EVENTS_API_KEY` is visible to anyone who loads the site; scope it to event ingestion only.
- `userId` is a random identifier, not linked to any account.
- Review comments are free text and could contain anything a user types.
