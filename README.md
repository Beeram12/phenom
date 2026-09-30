# Saffron & Sage — restaurant frontend

A warm, calm food-ordering storefront built with **Next.js (App Router)**, **TypeScript** and
**Tailwind CSS**. It is frontend-only: the menu is static data, cart/orders/reviews live in the
browser, payments are mocked, and every meaningful user action is sent as an analytics event
to an existing backend that powers a separate dashboard.

- **Live site:** _add your Vercel URL here_
- **Event contract:** [`docs/EVENTS.md`](docs/EVENTS.md)

## Features

| Page         | Path          | Highlights                                                                                                                    |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Home         | `/`           | Hero, featured dishes, about & opening hours                                                                                  |
| Menu         | `/menu`       | 19 dishes, category tabs (Starters / Mains / Desserts / Beverages), search, quantity stepper + add to cart                    |
| Item detail  | `/menu/[id]`  | Large image, full description, add to cart, reviews list + review form                                                        |
| Cart         | `/cart`       | Thumbnails, +/−, remove, subtotal / GST / total, empty state                                                                  |
| Checkout     | `/checkout`   | Validated delivery form, UPI (ID or app) and card payment with formatting + validation, order summary                         |
| Order status | `/order/[id]` | Framer Motion success (checkmark + confetti) or failure/cancel (cross) animation, 60-second cancel window, post-order ratings |

Also: slide-in cart drawer, toast notifications, image loading skeletons, subtle page transitions,
keyboard-accessible star rating, tabs and radio groups, reduced-motion support.

## Tech stack

- Next.js (App Router) + React + TypeScript (strict)
- Tailwind CSS v4 (design tokens in `app/globals.css`)
- Fonts via `next/font`: Fraunces (display) and DM Sans (body)
- Zustand (persisted to `localStorage`) for cart, orders and reviews
- Framer Motion for animation, Sonner for toasts, Lucide for icons
- ESLint (`eslint-config-next`) + Prettier (with the Tailwind plugin)

## Getting started

Requires Node.js 20.9+.

```bash
git clone https://github.com/<your-username>/restaurant-frontend.git
cd restaurant-frontend
npm install
cp .env.example .env.local   # then edit the URL
npm run dev                  # http://localhost:3000
```

### Scripts

| Script                            | What it does               |
| --------------------------------- | -------------------------- |
| `npm run dev`                     | Start the dev server       |
| `npm run build`                   | Production build           |
| `npm start`                       | Serve the production build |
| `npm run lint`                    | ESLint                     |
| `npm run typecheck`               | `tsc --noEmit`             |
| `npm run format` / `format:check` | Prettier write / check     |

## Environment variables

| Variable                             | Required            | Description                                                                                                                                                                           |
| ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_EVENTS_API_URL`         | Yes (for analytics) | Base URL of the Food Events API. Events are batched to `{url}/api/v1/events/batch`. If unset, nothing is sent (events are still logged to the console in development).                |
| `NEXT_PUBLIC_EVENTS_API_KEY`         | Yes (for analytics) | Sent as the `X-API-Key` header. It ends up in the browser bundle, so use a write-only ingest key.                                                                                     |
| `NEXT_PUBLIC_CITY`                   | No                  | City tag on every event (default `hyderabad`).                                                                                                                                        |
| `NEXT_PUBLIC_RESTAURANT_ID`          | No                  | Restaurant id on every event (default `r_saffron_sage`).                                                                                                                              |
| `NEXT_PUBLIC_SHOW_PAYMENT_SIMULATOR` | No                  | Defaults to showing a "Demo: payment outcome" switch at checkout (random / always succeed / always fail). Set to `false` to hide it; the mock gateway then succeeds ~85% of the time. |

`NEXT_PUBLIC_*` variables are inlined at build time, so redeploy after changing them.

## Analytics events

All tracking goes through one function in [`lib/analytics.ts`](lib/analytics.ts):

```ts
track("add_to_cart", { itemId: "butter-chicken", name: "Butter Chicken", qty: 1, price: 449 });
```

It adds `eventId` (uuid), `timestamp` (ISO), `sessionId` and anonymous `userId` (both kept in
`localStorage`), `page` and `deviceType`, then translates the event into the Food Events API
contract (`session_started`, `restaurant_viewed`, `item_added_to_cart`, `checkout_started`,
`payment_success`, `order_created`, `payment_failed`, `order_cancelled`, `item_reviewed`, …) and
sends batches to `{NEXT_PUBLIC_EVENTS_API_URL}/api/v1/events/batch` with the `X-API-Key` header.
It never blocks the UI, retries network/5xx errors, and logs to the console in development.
`EventName` and per-event property types are exported for type safety.

| Event                     | Fired when                       | Key properties                                                  |
| ------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `page_view`               | Every route change               | `title`, `referrer`                                             |
| `item_viewed`             | Item detail page shown           | `itemId`, `name`, `category`, `price`                           |
| `item_clicked`            | Item card/name clicked           | `itemId`, `name`, `category`, `price`, `source`                 |
| `category_filtered`       | Category tab chosen              | `category`, `resultCount`                                       |
| `search_performed`        | Search settles (600 ms debounce) | `query`, `resultCount`                                          |
| `add_to_cart`             | Item added                       | `itemId`, `name`, `qty`, `price`                                |
| `remove_from_cart`        | Line removed                     | `itemId`, `name`, `qty`, `price`                                |
| `cart_quantity_changed`   | +/− on a cart line               | `itemId`, `qty`, `previousQty`, `price`                         |
| `cart_viewed`             | Cart page or drawer opened       | `cartValue`, `itemCount`, `surface`                             |
| `checkout_started`        | Checkout page shown              | `cartValue`, `itemCount`                                        |
| `payment_method_selected` | UPI ↔ card switched              | `paymentMethod`                                                 |
| `order_placed`            | Mock payment succeeded           | `orderId`, `items`, `subtotal`, `tax`, `total`, `paymentMethod` |
| `order_failed`            | Mock payment failed              | `orderId`, `reason`, `total`, `paymentMethod`                   |
| `order_cancelled`         | Customer cancelled within 60 s   | `orderId`, `reason`                                             |
| `feedback_submitted`      | Review submitted                 | `itemId`, `rating`, `commentLength`, `comment`, `source`        |

The table above lists the UI events; [`docs/EVENTS.md`](docs/EVENTS.md) shows how each one maps to
backend events and payloads. The backend must allow CORS `POST` with the `Content-Type` and
`X-API-Key` headers from the site's origin.

## Project structure

```
app/            Routes (App Router): /, /menu, /menu/[id], /cart, /checkout, /order/[id]
components/     ItemCard, CartDrawer, StarRating, PaymentSelector, OrderStatusAnimation,
                Navbar, Footer, MenuBrowser, CheckoutForm, ReviewForm, …
data/           menu.ts (19 dishes), reviews.ts (seed reviews), restaurant.ts
lib/            analytics.ts, validation.ts, utils.ts, hooks
store/          Zustand stores: cart, orders, reviews (persisted to localStorage)
docs/           EVENTS.md — analytics event contract
```

## Mock payments

There is no payment gateway. At checkout, a small "Demo: payment outcome" panel lets you pick
**Random (85% success)**, **Always succeed** or **Always fail**. A successful order clears the
cart and can be cancelled for 60 seconds; a failed one keeps the cart so you can try again. Card
and UPI details are validated in the browser and never stored or sent anywhere.

## Deployment

The repo is connected to Vercel, so every push to `main` deploys to production automatically
(and pull requests get preview deployments). To set it up yourself:

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (framework: Next.js, defaults are fine).
2. Add `NEXT_PUBLIC_EVENTS_API_URL` and `NEXT_PUBLIC_EVENTS_API_KEY` under **Settings → Environment Variables** (Production and Preview).
3. Deploy. Redeploy after changing environment variables.

## Screenshots

_Add screenshots to `docs/screenshots/` and reference them here._

| Home                               | Menu                               | Item detail                        |
| ---------------------------------- | ---------------------------------- | ---------------------------------- |
| ![Home](docs/screenshots/home.png) | ![Menu](docs/screenshots/menu.png) | ![Item](docs/screenshots/item.png) |

| Cart                               | Checkout                                   | Order confirmed                              |
| ---------------------------------- | ------------------------------------------ | -------------------------------------------- |
| ![Cart](docs/screenshots/cart.png) | ![Checkout](docs/screenshots/checkout.png) | ![Order](docs/screenshots/order-success.png) |

## Credits

Food photography from [Unsplash](https://unsplash.com).
