/**
 * Client-side analytics.
 *
 * `track(eventName, properties)` builds an event envelope and POSTs it as JSON to
 * NEXT_PUBLIC_EVENTS_API_URL. It is fire-and-forget: it never throws, never blocks
 * rendering, and swallows network errors. In development every event is logged to
 * the console. See docs/EVENTS.md for the full schema.
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

const SESSION_KEY = "ss_session_id";
const USER_KEY = "ss_anon_user_id";
const ENDPOINT = process.env.NEXT_PUBLIC_EVENTS_API_URL;
const IS_DEV = process.env.NODE_ENV === "development";

let memoryIds: { session?: string; user?: string } = {};

export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback for older browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Read an id from localStorage, creating it once if missing. Falls back to memory. */
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

function send(event: AnalyticsEvent): void {
  if (!ENDPOINT) return;
  try {
    // keepalive lets the request finish even if the user navigates away.
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {
      /* fail silently */
    });
  } catch {
    /* fail silently */
  }
}

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

    if (IS_DEV) {
      console.info(`[analytics] ${eventName}`, event);
    }

    // Defer the network work so it never competes with the interaction that caused it.
    const schedule =
      typeof window.requestIdleCallback === "function"
        ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb: () => void) => window.setTimeout(cb, 0);
    schedule(() => send(event as AnalyticsEvent));
  } catch {
    /* analytics must never break the app */
  }
}
