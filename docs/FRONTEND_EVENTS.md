# Frontend Integration Guide

The backend is a stateless event API: it validates events and publishes them to Kafka.
It does not store application data, so restaurants, menus, the cart and order state are
managed by the frontend (static JSON and React state).

## Setup
1. Copy `frontend/events.js` to `src/lib/events.js`.
2. On app load, call `initEvents({ apiUrl: "http://localhost:8000", apiKey: "<API_KEY>" })`.
3. After register/login, call `setUser(userId, city)`. On register, create the ID with `newId("u")` and persist it.
4. On each user action, call `track(eventType, payload)`.

`event_id`, `event_time`, `user_id`, `session_id` and `city` are added automatically.
Interactive API documentation is available at `http://localhost:8000/docs`.

## Event reference
Payload field names must match exactly.

| User action | `event_type` | Payload |
|---|---|---|
| App opened | `session_started` | sent automatically by `initEvents` |
| Sign up | `user_register` | `{method: "phone"}` |
| Log in | `user_login` | `{method: "phone"}` |
| Restaurant page opened | `restaurant_viewed` | `{restaurant_id, restaurant_name, cuisine}` |
| Price filter applied | `price_filter_applied` | `{min_price, max_price, category, restaurant_id}` |
| Item added to cart | `item_added_to_cart` | `{item_id, name, category, unit_price, quantity, restaurant_id}` |
| Item removed from cart | `item_removed_from_cart` | same as above |
| Checkout clicked | `checkout_started` | `{order_id, restaurant_id, item_count, cart_value}` |
| Payment succeeded | `payment_success` | `{order_id, restaurant_id, payment_id, amount, method}` |
| Payment failed | `payment_failed` | `{order_id, restaurant_id, amount, method, reason}` |
| Order placed (right after payment success) | `order_created` | `{order_id, restaurant_id, items: [{item_id, name, category, unit_price, quantity}], subtotal, discount, total, currency: "INR", order_type: "delivery", promised_eta_min}` |
| Order marked delivered | `order_delivered` | `{order_id, restaurant_id, promised_eta_min, actual_delivery_min}` |
| Order cancelled | `order_cancelled` | `{order_id, restaurant_id, reason, cancelled_by: "user"}` |
| Review submitted | `item_reviewed` | `{order_id, restaurant_id, overall_rating (1-5), item_ratings: [{item_id, rating}], tags: [], comment}` |

**Conventions**
- IDs: `newId("o")` for orders, `newId("p")` for payments, `newId("u")` for users. Create the `order_id` at checkout and reuse it in every later event for that order.
- `method`: `upi`, `card`, `cod` or `wallet`.
- `category`: `starter`, `main`, `dessert` or `drink`.
- `city`: lowercase (e.g. `hyderabad`, `bengaluru`).
- Restaurant and item IDs must be stable; analytics groups on them.

## Example: order flow
```js
import { track, newId } from "./lib/events";

const orderId = newId("o");
track("checkout_started", { order_id: orderId, restaurant_id: "r_88", item_count: 2, cart_value: 560 });

// after the payment step succeeds
track("payment_success", { order_id: orderId, restaurant_id: "r_88", payment_id: newId("p"),
                           amount: 510, method: "upi" });
track("order_created", {
  order_id: orderId, restaurant_id: "r_88",
  items: [{ item_id: "i_101", name: "Chicken Biryani", category: "main", unit_price: 280, quantity: 2 }],
  subtotal: 560, discount: 50, total: 510, currency: "INR", order_type: "delivery", promised_eta_min: 35,
});
```

## Troubleshooting
- Rejected events are logged in the browser console as `[events] Rejected events:` with the reason.
- `401`: the API key is missing or wrong.
- CORS error: add the frontend origin to `CORS_ORIGINS` in the backend `.env`.
