# Kafka Contract (for the Aggregation Layer)

**Producer:** Food Events API  
**Value format:** JSON (UTF-8)  
**Message key:** `restaurant_id`, falling back to `user_id`, then `session_id`

## Topics
| Topic | event_type |
|---|---|
| `events.user` | user_register, user_login, session_started |
| `events.browse` | restaurant_viewed, price_filter_applied |
| `events.cart` | item_added_to_cart, item_removed_from_cart, checkout_started |
| `events.payment` | payment_success, payment_failed |
| `events.order` | order_created, order_delivered, order_cancelled |
| `events.review` | item_reviewed |
| `events.dlq` | invalid events: `{reason, raw, received_at}` |

## Envelope (every message)
```json
{
  "event_id": "uuid (dedupe on this)",
  "event_type": "order_created",
  "schema_version": 1,
  "source": "web | mobile | backend",
  "event_time": "2026-09-29T07:30:00Z",   // when it happened (UTC); window on this field
  "user_id": "u_xxx", "session_id": "uuid|null",
  "city": "hyderabad",                     // lowercase
  "payload": { ... },
  "received_at": "2026-09-30T10:00:00Z",   // when the API received it
  "lateness_sec": 95400.1,                 // received_at - event_time
  "clock_skew": false                      // true = client clock ahead by >5 min
}
```

## Key payloads
**order_created** (peak hours + most ordered item)
```json
{"order_id":"o_x","restaurant_id":"r_x","items":[{"item_id":"i_x","name":"Chicken Biryani",
 "category":"main","unit_price":280.0,"quantity":2}],"subtotal":560.0,"discount":50.0,
 "total":510.0,"currency":"INR","order_type":"delivery","promised_eta_min":40}
```
**item_reviewed** (region-wise feedback → group by `city`)
```json
{"order_id":"o_x","restaurant_id":"r_x","overall_rating":4,
 "item_ratings":[{"item_id":"i_x","rating":5}],"tags":["tasty"],"comment":null}
```
**order_delivered** (timestamp issues; `delay_min` and `is_late` are computed by the API)
```json
{"order_id":"o_x","restaurant_id":"r_x","promised_eta_min":40,"actual_delivery_min":52,
 "delay_min":12,"is_late":true}
```
**Other events:**
`order_cancelled {order_id, restaurant_id, reason, cancelled_by}`,
`payment_success {order_id, restaurant_id, payment_id, amount, method}`,
`payment_failed {order_id, restaurant_id, amount, method, reason}`,
`item_added_to_cart / item_removed_from_cart {item_id, name, category, unit_price, quantity, restaurant_id}`,
`checkout_started {order_id, restaurant_id, item_count, cart_value}`,
`restaurant_viewed {restaurant_id, restaurant_name, cuisine}`, `price_filter_applied {min_price, max_price, category, restaurant_id}`.

## Deriving the dashboard metrics
- **Peak order hours:** `order_created`, bucket by hour of `event_time` converted to IST (+5:30).
- **Most ordered item:** `order_created.payload.items[]`, sum `quantity` by `item_id`.
- **Feedback (region-wise):** `item_reviewed`, avg `overall_rating` + tag counts by `city`.
- **Timestamp issues:** `order_delivered` where `is_late` (avg `delay_min` by city/restaurant) + events with large `lateness_sec` (for late-arriving data, update the original time bucket instead of appending to the current one).

## Consumer guidelines
- Use a dedicated `group.id` with `auto.offset.reset=earliest`.
- Deduplicate on `event_id`; the frontend retries failed requests with the same ID.
- Ignore unknown fields. New fields may be added at any time; `schema_version` is incremented only for breaking changes.
- Monitor `events.dlq` for rejected events. Each message contains `reason`, `raw` and `received_at`.
