"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { getMenuItem } from "@/data/menu";
import { track } from "@/lib/analytics";
import { useHydrated } from "@/lib/useHydrated";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { CANCEL_WINDOW_MS, useOrders, type Order } from "@/store/orders";
import { OrderStatusAnimation } from "./OrderStatusAnimation";
import { OrderSummary } from "./OrderSummary";
import { ReviewForm } from "./ReviewForm";

/** Current time, refreshed every second (0 until mounted to keep render pure). */
function useNow(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [active]);
  return now;
}

export function OrderStatusView({ orderId }: { orderId: string }) {
  const hydrated = useHydrated();
  const order = useOrders((s) => s.orders[orderId]);

  if (!hydrated) {
    return (
      <div
        className="container-page flex min-h-[60vh] items-center justify-center py-14"
        aria-busy="true"
      >
        <div className="bg-sand size-32 animate-pulse rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-page py-20">
        <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 px-8 py-14 text-center">
          <h1 className="text-3xl font-semibold">We couldn&apos;t find that order</h1>
          <p className="text-muted">
            Order <span className="font-mono">{orderId}</span> isn&apos;t saved on this device.
          </p>
          <Link href="/menu" className="btn-primary">
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  return <OrderResult order={order} />;
}

function OrderResult({ order }: { order: Order }) {
  const router = useRouter();
  const updateStatus = useOrders((s) => s.updateStatus);
  const replaceLines = useCart((s) => s.replaceLines);
  const now = useNow(order.status === "confirmed");

  const placedAt = new Date(order.createdAt).getTime();
  const remainingMs = now ? Math.max(0, placedAt + CANCEL_WINDOW_MS - now) : CANCEL_WINDOW_MS;
  const canCancel = order.status === "confirmed" && now > 0 && remainingMs > 0;
  const success = order.status === "confirmed";

  const restoreCart = () =>
    replaceLines(order.items.map((i) => ({ itemId: i.itemId, qty: i.qty })));

  const onCancel = () => {
    updateStatus(order.id, "cancelled", { cancelReason: "Cancelled by customer" });
    track("order_cancelled", { orderId: order.id, reason: "customer_cancelled" });
  };

  const onTryAgain = () => {
    if (order.status === "cancelled") restoreCart();
    router.push("/checkout");
  };

  const onBackToCart = () => {
    if (order.status === "cancelled") restoreCart();
    router.push("/cart");
  };

  const eta = new Date(placedAt + order.estimatedMinutes * 60_000).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  const reviewableItems = Array.from(new Map(order.items.map((i) => [i.itemId, i])).values());

  const heading = success
    ? "Your order is confirmed!"
    : order.status === "cancelled"
      ? "Your order was cancelled"
      : "Payment didn't go through";

  const message = success
    ? "Thank you! The kitchen has started on your food."
    : order.status === "cancelled"
      ? "No worries — you haven't been charged. Your dishes are just a tap away if you change your mind."
      : `${order.failureReason ?? "Something went wrong"}. You haven't been charged — your cart is still saved, so you can try again.`;

  return (
    <div className="container-page py-12 sm:py-16">
      <section aria-live="polite" className="mx-auto max-w-xl text-center">
        <OrderStatusAnimation variant={success ? "success" : "failure"} />

        <AnimatePresence mode="wait">
          <motion.div
            key={order.status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">{heading}</h1>
            <p className="text-muted mt-3 text-lg">{message}</p>

            <p className="shadow-soft ring-line mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm ring-1">
              Order ID <span className="font-mono font-semibold tracking-wide">{order.id}</span>
            </p>

            {success && (
              <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
                <div className="card flex items-center gap-3 p-4">
                  <Clock className="text-terracotta-600 size-5 shrink-0" aria-hidden />
                  <div>
                    <p className="text-muted text-sm">Estimated arrival</p>
                    <p className="font-semibold">
                      ~{order.estimatedMinutes} min · by {eta}
                    </p>
                  </div>
                </div>
                <div className="card flex items-center gap-3 p-4">
                  <MapPin className="text-terracotta-600 size-5 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-muted text-sm">Delivering to {order.delivery.name}</p>
                    <p className="truncate font-semibold">{order.delivery.address}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {success ? (
                <>
                  <Link href="/menu" className="btn-primary h-12 px-6">
                    Back to menu
                  </Link>
                  {canCancel && (
                    <button type="button" onClick={onCancel} className="btn-secondary h-12 px-5">
                      Cancel order ({Math.ceil(remainingMs / 1000)}s)
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button type="button" onClick={onTryAgain} className="btn-primary h-12 px-6">
                    Try again
                  </button>
                  <button type="button" onClick={onBackToCart} className="btn-secondary h-12 px-6">
                    Back to cart
                  </button>
                </>
              )}
            </div>
            {success && canCancel && (
              <p className="text-muted mt-3 text-xs">
                You can cancel for free within the first minute.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <div className="mx-auto mt-14 grid max-w-4xl gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <OrderSummary
            title="What you ordered"
            lines={order.items.map((i) => ({
              id: i.itemId,
              name: i.name,
              qty: i.qty,
              lineTotal: i.price * i.qty,
            }))}
            subtotal={order.subtotal}
            tax={order.tax}
            total={order.total}
          >
            <p className="text-muted text-sm">
              Paid via {order.paymentMethod === "upi" ? "UPI" : "card"}
              {order.status !== "confirmed" && " · not charged"}
            </p>
          </OrderSummary>
        </div>

        {success && (
          <section aria-labelledby="feedback-heading" className="card p-6 sm:p-8 lg:col-span-3">
            <h2 id="feedback-heading" className="text-2xl font-semibold">
              Rate your dishes
            </h2>
            <p className="text-muted mt-1 text-sm">
              Your feedback helps our kitchen — and other hungry guests.
            </p>
            <ul className="mt-6 space-y-8">
              {reviewableItems.map((i) => {
                const menuItem = getMenuItem(i.itemId);
                return (
                  <li
                    key={i.itemId}
                    className="border-line border-t pt-6 first:border-0 first:pt-0"
                  >
                    <p className="mb-3 flex items-baseline justify-between gap-3">
                      <Link
                        href={`/menu/${i.itemId}`}
                        className="font-display hover:text-terracotta-700 text-lg"
                      >
                        {i.name}
                      </Link>
                      <span className="text-muted text-sm">
                        {formatPrice(menuItem?.price ?? i.price)}
                      </span>
                    </p>
                    <ReviewForm
                      itemId={i.itemId}
                      itemName={i.name}
                      source="order_page"
                      orderId={order.id}
                      defaultName={order.delivery.name.split(" ")[0]}
                      compact
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
