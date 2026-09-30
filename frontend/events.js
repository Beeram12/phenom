/**
 * events.js — event tracking client for the food-ordering frontend.
 *
 * Copy this file to `src/lib/events.js` in the React app.
 *
 * Setup (once, e.g. in main.jsx / App.jsx):
 *   import { initEvents } from "./lib/events";
 *   initEvents({ apiUrl: "http://localhost:8000", apiKey: "<API_KEY>" });
 *
 * After register / login:
 *   setUser(userId, "hyderabad");
 *   track("user_login", { method: "phone" });
 *
 * On any user action:
 *   track("item_added_to_cart", { item_id: "i_101", name: "Chicken Biryani", category: "main",
 *                                 unit_price: 280, quantity: 1, restaurant_id: "r_88" });
 *
 * Events are queued and sent in batches (every 2 s or 20 events). Failed requests are retried
 * with the same event_id, so the backend can deduplicate them.
 * Payload fields for every event: docs/FRONTEND_EVENTS.md
 */

let API_URL = "http://localhost:8000";
let API_KEY = "dev-key-change-me";
let queue = [];
let timer = null;
const FLUSH_EVERY_MS = 2000;
const FLUSH_AT = 20;

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Generate a prefixed ID, e.g. newId("o") -> "o_k3j2h1a9b0". Use "u", "o", "p" for user, order, payment. */
export function newId(prefix) {
  return `${prefix}_${uuid().replace(/-/g, "").slice(0, 10)}`;
}

/** One session ID per browser tab. */
function sessionId() {
  let s = sessionStorage.getItem("ev_session_id");
  if (!s) {
    s = uuid();
    sessionStorage.setItem("ev_session_id", s);
  }
  return s;
}

/** Attach the logged-in user (and their city) to all subsequent events. */
export function setUser(userId, city) {
  localStorage.setItem("ev_user_id", userId);
  if (city) localStorage.setItem("ev_city", city);
}

export function setCity(city) {
  localStorage.setItem("ev_city", city);
}

/** Call on logout. */
export function clearUser() {
  localStorage.removeItem("ev_user_id");
  localStorage.removeItem("ev_city");
}

/** Queue an event. The envelope fields (IDs, timestamp, user, session, city) are added automatically. */
export function track(eventType, payload = {}) {
  queue.push({
    event_id: uuid(),
    event_type: eventType,
    schema_version: 1,
    source: "web",
    event_time: new Date().toISOString(),
    user_id: localStorage.getItem("ev_user_id"),
    session_id: sessionId(),
    city: localStorage.getItem("ev_city"),
    payload,
  });
  if (queue.length >= FLUSH_AT) flush();
}

/** Send all queued events. On network or server failure, events are re-queued for the next flush. */
export async function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  try {
    const res = await fetch(`${API_URL}/api/v1/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ events: batch }),
      keepalive: true, // allows the request to complete while the page is closing
    });
    if (res.status >= 500) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (data.rejected) console.warn("[events] Rejected events:", data.errors);
  } catch (e) {
    queue.unshift(...batch);
  }
}

/** Initialise the client: set the API location, start the flush timer and record session start. */
export function initEvents({ apiUrl, apiKey } = {}) {
  if (apiUrl) API_URL = apiUrl.replace(/\/$/, "");
  if (apiKey) API_KEY = apiKey;
  if (timer) return;
  timer = setInterval(flush, FLUSH_EVERY_MS);
  window.addEventListener("pagehide", flush);
  if (!sessionStorage.getItem("ev_started")) {
    sessionStorage.setItem("ev_started", "1");
    track("session_started", {
      entry_point: location.pathname || "home",
      referrer: document.referrer || null,
    });
  }
}
