"""
Traffic simulator.

Generates realistic user journeys (session -> browse -> cart -> checkout -> payment ->
order -> delivery -> review) and sends the resulting events to the API in batches.
Use it to feed the pipeline before the frontend is ready, or to load-test aggregation.

Behaviour modelled:
  - order times weighted towards lunch and dinner peaks (IST)
  - popular menu items ordered more often
  - ~10% abandoned carts, ~12% failed payments, ~6% cancellations
  - ~25% late deliveries, with lower ratings and negative tags
  - ~10% of reviews arriving 1-3 days late (backfill mode only)

Usage:
  python scripts/simulate.py --sessions 200
  python scripts/simulate.py --sessions 1000 --backfill-days 7
"""
import argparse
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import requests

IST = timezone(timedelta(hours=5, minutes=30))
HOUR_WEIGHTS = [1, 1, 0, 0, 0, 0, 1, 2, 3, 3, 3, 4, 8, 10, 7, 3, 3, 4, 6, 9, 10, 8, 5, 2]
TAGS_GOOD = ["tasty", "good_packaging", "value_for_money", "hot_food"]
TAGS_BAD = ["late_delivery", "cold_food", "less_quantity", "spilled"]

MENUS = {
    "biryani": [("Chicken Biryani", "main", 280), ("Mutton Biryani", "main", 360), ("Veg Biryani", "main", 220),
                ("Chicken 65", "starter", 240), ("Double ka Meetha", "dessert", 120), ("Thums Up", "drink", 40)],
    "north_indian": [("Butter Chicken", "main", 320), ("Paneer Butter Masala", "main", 260),
                     ("Dal Makhani", "main", 210), ("Butter Naan", "main", 50), ("Gulab Jamun", "dessert", 90)],
    "south_indian": [("Masala Dosa", "main", 120), ("Idli Vada", "main", 90), ("Rava Dosa", "main", 140),
                     ("Filter Coffee", "drink", 40), ("Kesari Bath", "dessert", 70)],
    "chinese": [("Veg Hakka Noodles", "main", 180), ("Chicken Fried Rice", "main", 220),
                ("Chilli Chicken", "starter", 260), ("Veg Manchurian", "starter", 190)],
    "pizza": [("Margherita Pizza", "main", 250), ("Farmhouse Pizza", "main", 380),
              ("Chicken Pepperoni", "main", 450), ("Garlic Bread", "starter", 140), ("Coke", "drink", 60)],
}
RESTAURANTS = {
    "hyderabad": [("Paradise Biryani", "biryani"), ("Chutneys", "south_indian"), ("Pizza Hub", "pizza")],
    "bengaluru": [("Meghana Foods", "biryani"), ("CTR Dosa Corner", "south_indian"), ("Wok Express", "chinese")],
    "mumbai": [("Punjab Grill", "north_indian"), ("Bombay Wok", "chinese"), ("Slice of Italy", "pizza")],
    "delhi": [("Karim's Kitchen", "north_indian"), ("Biryani Blues", "biryani"), ("Chowman", "chinese")],
    "pune": [("Vaishali", "south_indian"), ("Shabree", "north_indian"), ("Pizza Express", "pizza")],
}


def build_catalog():
    """Build a static restaurant/menu catalog with stable IDs per city."""
    cat = {}
    for city, rests in RESTAURANTS.items():
        cat[city] = []
        for ri, (name, cuisine) in enumerate(rests):
            rid = f"r_{city[:3]}{ri}"
            items = [{"item_id": f"i_{city[:3]}{ri}_{ii}", "name": n, "category": c, "unit_price": float(p)}
                     for ii, (n, c, p) in enumerate(MENUS[cuisine])]
            cat[city].append({"restaurant_id": rid, "name": name, "cuisine": cuisine, "items": items})
    return cat


def new_id(p):
    return f"{p}_{uuid.uuid4().hex[:10]}"


def pick_start(backfill_days):
    """Session start time: now, or a peak-weighted time within the last N days."""
    now = datetime.now(timezone.utc)
    if not backfill_days:
        return now
    day = (now - timedelta(days=random.randint(0, backfill_days - 1))).astimezone(IST)
    hour = random.choices(range(24), weights=HOUR_WEIGHTS)[0]
    t = day.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))
    return min(t.astimezone(timezone.utc), now - timedelta(hours=3))


def session_events(users, catalog, backfill_days):
    """Generate all events for one user session, in chronological order."""
    now = datetime.now(timezone.utc)
    user = random.choice(users)
    sid = str(uuid.uuid4())
    t0 = pick_start(backfill_days)
    out = []

    def ev(event_type, payload, at_min):
        t = min(t0 + timedelta(minutes=at_min), now)
        out.append({"event_id": str(uuid.uuid4()), "event_type": event_type, "source": "web",
                    "event_time": t.isoformat(), "user_id": user["user_id"], "session_id": sid,
                    "city": user["city"], "payload": payload})

    ev("session_started", {"entry_point": "home",
                           "referrer": random.choice(["organic", "push_notification", "instagram_ad", None])}, 0)
    if not user["registered"]:
        ev("user_register", {"method": "phone"}, 0.5)
        user["registered"] = True
    ev("user_login", {"method": "phone"}, 1)

    r = random.choice(catalog[user["city"]])
    rid = r["restaurant_id"]
    ev("restaurant_viewed", {"restaurant_id": rid, "restaurant_name": r["name"], "cuisine": r["cuisine"]}, 2)
    if random.random() < 0.3:
        ev("price_filter_applied", {"min_price": 100, "max_price": 300, "category": "main",
                                    "restaurant_id": rid}, 2.5)

    menu = r["items"]
    weights = [len(menu) - i for i in range(len(menu))]          # earlier items are more popular
    chosen = {i["item_id"]: i for i in random.choices(menu, weights=weights, k=random.randint(1, 3))}
    cart = []
    for item in chosen.values():
        line = {**item, "quantity": random.randint(1, 3), "restaurant_id": rid}
        cart.append(line)
        ev("item_added_to_cart", line, 3)
    if len(cart) > 1 and random.random() < 0.15:
        ev("item_removed_from_cart", cart.pop(), 4)
    if random.random() < 0.1:                                    # abandoned cart
        return out

    order_id = new_id("o")
    subtotal = round(sum(i["unit_price"] * i["quantity"] for i in cart), 2)
    discount = 50.0 if subtotal >= 500 else 0.0
    total = subtotal - discount
    eta = min(30 + 5 * len(cart), 55)
    method = random.choice(["upi", "upi", "card", "wallet", "cod"])
    ev("checkout_started", {"order_id": order_id, "restaurant_id": rid,
                            "item_count": sum(i["quantity"] for i in cart), "cart_value": subtotal}, 5)

    if random.random() < 0.12:
        ev("payment_failed", {"order_id": order_id, "restaurant_id": rid, "amount": total, "method": method,
                              "reason": random.choice(["declined", "timeout", "insufficient_funds"])}, 6)
        if random.random() < 0.5:
            ev("order_cancelled", {"order_id": order_id, "restaurant_id": rid,
                                   "reason": "payment_failed", "cancelled_by": "system"}, 7)
            return out
    ev("payment_success", {"order_id": order_id, "restaurant_id": rid, "payment_id": new_id("p"),
                           "amount": total, "method": method}, 7)
    ev("order_created", {"order_id": order_id, "restaurant_id": rid,
                         "items": [{k: i[k] for k in ("item_id", "name", "category", "unit_price", "quantity")}
                                   for i in cart],
                         "subtotal": subtotal, "discount": discount, "total": total, "currency": "INR",
                         "order_type": "delivery", "promised_eta_min": eta}, 7)

    if random.random() < 0.06:
        ev("order_cancelled", {"order_id": order_id, "restaurant_id": rid,
                               "reason": random.choice(["restaurant_closed", "too_late", "changed_mind"]),
                               "cancelled_by": random.choice(["user", "restaurant"])}, 12)
        return out

    late = random.random() < 0.25
    actual = eta + random.randint(5, 30) if late else max(10, eta - random.randint(0, 10))
    ev("order_delivered", {"order_id": order_id, "restaurant_id": rid,
                           "promised_eta_min": eta, "actual_delivery_min": actual}, 7 + actual)

    if random.random() < 0.6:
        rating = random.choice([2, 3, 3, 4]) if late else random.choice([3, 4, 5, 5])
        at = 7 + actual + random.randint(20, 120)
        if backfill_days and random.random() < 0.1:              # late-arriving review (1-3 days)
            at += random.randint(1440, 4320)
        ev("item_reviewed", {"order_id": order_id, "restaurant_id": rid, "overall_rating": rating,
                             "item_ratings": [{"item_id": i["item_id"],
                                               "rating": min(5, rating + random.choice([0, 1]))} for i in cart],
                             "tags": random.sample(TAGS_BAD, 1) if late else random.sample(TAGS_GOOD, 2),
                             "comment": None}, at)
    return out


def run(base, key, sessions, backfill_days, users_count, http=None):
    """Simulate `sessions` journeys and POST their events in batches of 100."""
    http = http or requests.Session()
    catalog = build_catalog()
    users = [{"user_id": new_id("u"), "city": random.choice(list(RESTAURANTS)), "registered": False}
             for _ in range(users_count)]
    sent = rejected = 0
    batch = []

    def flush():
        nonlocal sent, rejected, batch
        if not batch:
            return
        r = http.post(f"{base.rstrip('/')}/api/v1/events/batch", json={"events": batch},
                      headers={"X-API-Key": key})
        if r.status_code >= 400:
            raise RuntimeError(f"{r.status_code} {r.text[:200]}")
        d = r.json()
        sent += d["accepted"]
        rejected += d["rejected"]
        if d["errors"]:
            print("Rejected:", d["errors"][:3])
        batch = []

    for n in range(sessions):
        for e in session_events(users, catalog, backfill_days):
            batch.append(e)
            if len(batch) >= 100:
                flush()
        if (n + 1) % 100 == 0:
            print(f"{n + 1}/{sessions} sessions simulated")
    flush()
    print(f"Done: {sent} events accepted, {rejected} rejected")
    return sent, rejected


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=os.getenv("API_BASE", "http://localhost:8000"))
    ap.add_argument("--key", default=os.getenv("API_KEY", "dev-key-change-me"))
    ap.add_argument("--sessions", type=int, default=100)
    ap.add_argument("--backfill-days", type=int, default=0)
    ap.add_argument("--users", type=int, default=50)
    a = ap.parse_args()
    run(a.base, a.key, a.sessions, a.backfill_days, a.users)
