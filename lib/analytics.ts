/**
 * Client-side analytics -> Food Events API adapter.
 *
 * The UI keeps calling `track(eventName, properties)` exactly as before. This module
 * translates each UI event into one or more events in the backend's contract
 * (see food-events-api docs/FRONTEND_EVENTS.md), batches them, and POSTs to
 *   {NEXT_PUBLIC_EVENTS_API_URL}/api/v1/events/batch   with header X-API-Key.
 *
 * Fire-and-forget: never throws, never blocks rendering.
 */

export type PaymentMethod = "upi" | "card";

export interface OrderLineItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
}

interface ItemProps {
  itemId: string;
  name: string;
  category: string;
  price: number;
}

/** Map of every event name to the shape of its `properties` object. */
export interface EventPropertiesMap {
  page_view: { title: string; referrer: string | null };
  item_viewed: ItemProps;
  item_clicked: ItemProps & { source: "menu" | "home" | "cart" };
  category_filtered: { category: string; resultCount: number };
  search_performed: { query: string; resultCount: number };
  add_to_cart: { itemId: string; name: string; qty: number; price: number };
  remove_from_cart: { itemId: string; name: string; qty: number; price: number };
  cart_quantity_changed: {
    itemId: string;
    name: string;
    qty: number;
    previousQty: number;
    price: number;
  };
  cart_viewed: { cartValue: number; itemCount: number; surface: "page" | "drawer" };
  checkout_started: { cartValue: number; itemCount: number };
  payment_method_selected: { paymentMethod: PaymentMethod };
  order_placed: {
    orderId: string;
    items: OrderLineItem[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: PaymentMethod;
  };
  order_cancelled: { orderId: string; reason: string };
  order_failed: { orderId: string; reason: string; total: number; paymentMethod: PaymentMethod };
  feedback_submitted: {
    itemId: string;
    rating: number;
    commentLength: number;
    comment: string;
    source: "item_page" | "order_page";
    orderId?: string;
  };
}

export type EventName = keyof EventPropertiesMap;
export type DeviceType = "mobile" | "tablet" | "desktop";

export interface AnalyticsEvent<E extends EventName = EventName> {
  eventId: string;
  eventName: E;
  timestamp: string;
  sessionId: string;
  userId: string;
  page: string;
  deviceType: DeviceType;
  properties: EventPropertiesMap[E];
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

/** Defaults match the backend's local dev setup (backend/.env.example). */
export const DEFAULT_EVENTS_API_URL = "http://localhost:8000";
export const DEFAULT_EVENTS_API_KEY = "dev-key-change-me";

const API_URL = (process.env.NEXT_PUBLIC_EVENTS_API_URL || DEFAULT_EVENTS_API_URL).replace(
  /\/+$/,
  "",
);
const API_KEY = process.env.NEXT_PUBLIC_EVENTS_API_KEY || DEFAULT_EVENTS_API_KEY;
const CITY = (process.env.NEXT_PUBLIC_CITY ?? "hyderabad").toLowerCase();
const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? "r_saffron_sage";
const RESTAURANT_NAME = "Saffron & Sage";
const CUISINE = "indian";
const PROMISED_ETA_MIN = 35;

const BATCH_URL = API_URL ? `${API_URL}/api/v1/events/batch` : undefined;
const IS_DEV = process.env.NODE_ENV === "development";

const FLUSH_INTERVAL_MS = 3000;
const RETRY_INTERVAL_MS = 5000;
const MAX_BATCH = 50; // backend limit is 100
const MAX_QUEUE = 500;

const SESSION_KEY = "ss_session_id";
const USER_KEY = "ss_anon_user_id";
const PENDING_ORDER_KEY = "ss_pending_order_id";
const ORDER_ALIAS_KEY = "ss_order_alias";
const SESSION_STARTED_KEY = "ss_session_started";
const RESTAURANT_VIEWED_KEY = "ss_restaurant_viewed";

/* ------------------------------------------------------------------ */
/* Ids / device helpers (unchanged public API)                         */
/* ------------------------------------------------------------------ */

let memoryIds: { session?: string; user?: string } = {};

export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function newId(prefix: string): string {
  return `${prefix}_${uuid().replace(/-/g, "").slice(0, 10)}`;
}

function getOrCreateId(key: string, slot: "session" | "user"): string {
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = uuid();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    memoryIds = { ...memoryIds, [slot]: memoryIds[slot] ?? uuid() };
    return memoryIds[slot] as string;
  }
}

export function getSessionId(): string {
  return getOrCreateId(SESSION_KEY, "session");
}

export function getUserId(): string {
  return getOrCreateId(USER_KEY, "user");
}

export function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/* ------------------------------------------------------------------ */
/* Small storage helpers                                               */
/* ------------------------------------------------------------------ */

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
function lsRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
function ssHas(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function ssMark(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Backend contract                                                    */
/* ------------------------------------------------------------------ */

interface BackendEvent {
  event_id: string;
  event_type: string;
  schema_version: 1;
  source: "web";
  event_time: string;
  user_id: string;
  session_id: string;
  city: string;
  payload: Record<string, unknown>;
}

/** Route -> backend `entry_point` label (home, menu, item, cart, checkout, order). */
function entryPoint(path: string): string {
  if (path === "/") return "home";
  if (path.startsWith("/menu/")) return "item";
  const first = path.split("/")[1];
  return first || "home";
}

/** Frontend categories ("Starters", "Mains", "Beverages") -> backend enum. */
function normalizeCategory(category?: string): "starter" | "main" | "dessert" | "drink" {
  const c = (category ?? "").toLowerCase();
  if (c.startsWith("starter")) return "starter";
  if (c.startsWith("dessert")) return "dessert";
  if (c.startsWith("bev") || c.startsWith("drink")) return "drink";
  return "main";
}

/**
 * add_to_cart / order_placed don't carry a category, so remember it from events that do
 * (item_viewed / item_clicked). Falls back to "main". For exact values, add `category`
 * to those event properties or seed this from data/menu.ts.
 */
const categoryByItem = new Map<string, string>();
export function registerItemCategories(items: { id: string; category: string }[]): void {
  items.forEach((i) => categoryByItem.set(i.id, i.category));
}
function categoryOf(itemId: string): "starter" | "main" | "dessert" | "drink" {
  return normalizeCategory(categoryByItem.get(itemId));
}

/**
 * The backend wants ONE order_id reused across checkout_started, payment_*, order_*
 * and item_reviewed. The UI only creates its orderId at payment time, so:
 *  - checkout_started mints a pending backend id,
 *  - the first order event for a UI orderId adopts the pending id (alias stored),
 *  - later events (cancel, review) resolve through the alias.
 */
function backendOrderId(uiOrderId: string): string {
  let aliases: Record<string, string> = {};
  try {
    aliases = JSON.parse(lsGet(ORDER_ALIAS_KEY) ?? "{}") as Record<string, string>;
  } catch {
    aliases = {};
  }
  if (aliases[uiOrderId]) return aliases[uiOrderId];
  const pending = lsGet(PENDING_ORDER_KEY);
  if (pending) {
    aliases[uiOrderId] = pending;
    lsSet(ORDER_ALIAS_KEY, JSON.stringify(aliases));
    lsRemove(PENDING_ORDER_KEY);
    return pending;
  }
  return uiOrderId;
}

type Mapped = { type: string; payload: Record<string, unknown> };

/** Translate one UI event into zero or more backend events. */
function toBackend(e: AnalyticsEvent): Mapped[] {
  switch (e.eventName) {
    case "item_viewed":
    case "item_clicked": {
      const p = e.properties as ItemProps;
      categoryByItem.set(p.itemId, p.category);
      return [];
    }

    case "page_view": {
      // Treat the first landing on the storefront (home or menu) per tab as a restaurant view.
      if ((e.page === "/" || e.page === "/menu") && !ssHas(RESTAURANT_VIEWED_KEY)) {
        ssMark(RESTAURANT_VIEWED_KEY);
        return [
          {
            type: "restaurant_viewed",
            payload: {
              restaurant_id: RESTAURANT_ID,
              restaurant_name: RESTAURANT_NAME,
              cuisine: CUISINE,
            },
          },
        ];
      }
      return [];
    }

    case "add_to_cart":
    case "remove_from_cart": {
      const p = e.properties as EventPropertiesMap["add_to_cart"];
      return [
        {
          type: e.eventName === "add_to_cart" ? "item_added_to_cart" : "item_removed_from_cart",
          payload: {
            item_id: p.itemId,
            name: p.name,
            category: categoryOf(p.itemId),
            unit_price: p.price,
            quantity: p.qty,
            restaurant_id: RESTAURANT_ID,
          },
        },
      ];
    }

    case "cart_quantity_changed": {
      const p = e.properties as EventPropertiesMap["cart_quantity_changed"];
      const delta = p.qty - p.previousQty;
      if (delta === 0) return [];
      return [
        {
          type: delta > 0 ? "item_added_to_cart" : "item_removed_from_cart",
          payload: {
            item_id: p.itemId,
            name: p.name,
            category: categoryOf(p.itemId),
            unit_price: p.price,
            quantity: Math.abs(delta),
            restaurant_id: RESTAURANT_ID,
          },
        },
      ];
    }

    case "checkout_started": {
      const p = e.properties as EventPropertiesMap["checkout_started"];
      const orderId = newId("o");
      lsSet(PENDING_ORDER_KEY, orderId);
      return [
        {
          type: "checkout_started",
          payload: {
            order_id: orderId,
            restaurant_id: RESTAURANT_ID,
            item_count: p.itemCount,
            cart_value: p.cartValue,
          },
        },
      ];
    }

    case "order_placed": {
      const p = e.properties as EventPropertiesMap["order_placed"];
      const orderId = backendOrderId(p.orderId);
      return [
        {
          type: "payment_success",
          payload: {
            order_id: orderId,
            restaurant_id: RESTAURANT_ID,
            payment_id: newId("p"),
            amount: p.total,
            method: p.paymentMethod,
          },
        },
        {
          type: "order_created",
          payload: {
            order_id: orderId,
            restaurant_id: RESTAURANT_ID,
            items: p.items.map((i) => ({
              item_id: i.itemId,
              name: i.name,
              category: categoryOf(i.itemId),
              unit_price: i.price,
              quantity: i.qty,
            })),
            subtotal: p.subtotal,
            discount: 0,
            tax: p.tax, // extra field; backend accepts unknown fields
            total: p.total,
            currency: "INR",
            order_type: "delivery",
            promised_eta_min: PROMISED_ETA_MIN,
          },
        },
      ];
    }

    case "order_failed": {
      const p = e.properties as EventPropertiesMap["order_failed"];
      return [
        {
          type: "payment_failed",
          payload: {
            order_id: backendOrderId(p.orderId),
            restaurant_id: RESTAURANT_ID,
            amount: p.total,
            method: p.paymentMethod,
            reason: p.reason,
          },
        },
      ];
    }

    case "order_cancelled": {
      const p = e.properties as EventPropertiesMap["order_cancelled"];
      return [
        {
          type: "order_cancelled",
          payload: {
            order_id: backendOrderId(p.orderId),
            restaurant_id: RESTAURANT_ID,
            reason: p.reason,
            cancelled_by: "user",
          },
        },
      ];
    }

    case "feedback_submitted": {
      const p = e.properties as EventPropertiesMap["feedback_submitted"];
      const payload: Record<string, unknown> = {
        restaurant_id: RESTAURANT_ID,
        overall_rating: p.rating,
        item_ratings: [{ item_id: p.itemId, rating: p.rating }],
        tags: [],
        comment: p.comment,
      };
      // The backend requires order_id on item_reviewed; reviews that can't be tied to an
      // order (the customer never ordered this dish in this browser) are not sent.
      if (!p.orderId) {
        if (IS_DEV) console.info("[analytics] item_reviewed skipped: no order for", p.itemId);
        return [];
      }
      payload.order_id = backendOrderId(p.orderId);
      return [{ type: "item_reviewed", payload }];
    }

    // No backend equivalent: category_filtered, search_performed, cart_viewed,
    // payment_method_selected.
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ */
/* Batching sender                                                     */
/* ------------------------------------------------------------------ */

let queue: BackendEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let listenersAttached = false;

function schedule(ms: number): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = undefined;
    void flush();
  }, ms);
}

function requeue(batch: BackendEvent[]): void {
  // Same event_ids are kept, so a retry can't create duplicates downstream.
  queue = [...batch, ...queue].slice(-MAX_QUEUE);
  schedule(RETRY_INTERVAL_MS);
}

async function flush(): Promise<void> {
  if (!BATCH_URL || queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    const res = await fetch(BATCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
      credentials: "omit",
    });
    if (res.ok) {
      if (IS_DEV) {
        const body = (await res.json().catch(() => null)) as {
          rejected?: number;
          errors?: unknown[];
        } | null;
        if (body?.rejected) console.warn("[analytics] rejected by API", body.errors);
      }
    } else if (res.status >= 500) {
      requeue(batch);
      return;
    } else if (IS_DEV) {
      console.warn(`[analytics] API returned ${res.status} (401 = bad API key, 422 = invalid)`);
    }
  } catch {
    requeue(batch);
    return;
  }
  if (queue.length > 0) schedule(0);
}

function attachListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("pagehide", () => void flush());
}

function enqueue(events: BackendEvent[]): void {
  if (!BATCH_URL || events.length === 0) return;
  attachListeners();
  queue.push(...events);
  if (queue.length >= MAX_BATCH) void flush();
  else schedule(FLUSH_INTERVAL_MS);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Track a user activity event. Safe to call anywhere on the client; a no-op on the server.
 */
export function track<E extends EventName>(eventName: E, properties: EventPropertiesMap[E]): void {
  if (typeof window === "undefined") return;
  try {
    const event: AnalyticsEvent<E> = {
      eventId: uuid(),
      eventName,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      userId: getUserId(),
      page: window.location.pathname,
      deviceType: getDeviceType(),
      properties,
    };

    if (IS_DEV) console.info(`[analytics] ${eventName}`, event);

    const base = {
      schema_version: 1 as const,
      source: "web" as const,
      event_time: event.timestamp,
      user_id: event.userId,
      session_id: event.sessionId,
      city: CITY,
    };

    const out: BackendEvent[] = [];

    // One session_started per browser tab session.
    if (!ssHas(SESSION_STARTED_KEY)) {
      ssMark(SESSION_STARTED_KEY);
      out.push({
        ...base,
        event_id: uuid(),
        event_type: "session_started",
        payload: {
          entry_point: entryPoint(event.page),
          referrer: document.referrer || null,
          device_type: event.deviceType,
          entry_page: event.page,
        },
      });
    }

    toBackend(event as AnalyticsEvent).forEach((m, i) => {
      out.push({
        ...base,
        // First mapped event reuses the UI eventId; extras (e.g. order_created) get fresh ids.
        event_id: i === 0 ? event.eventId : uuid(),
        event_type: m.type,
        payload: m.payload,
      });
    });

    enqueue(out);
  } catch {
    /* analytics must never break the app */
  }
}
