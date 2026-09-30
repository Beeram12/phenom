"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { useHydrated } from "@/lib/useHydrated";
import { computeTotals } from "@/lib/utils";
import { cartCount, cartSubtotal, resolveLines, useCart } from "@/store/cart";
import { CartLineRow } from "./CartLineRow";
import { OrderSummary } from "./OrderSummary";

export function CartView() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const resolved = resolveLines(lines);
  const { subtotal, tax, total } = computeTotals(cartSubtotal(lines));
  const tracked = useRef(false);

  useEffect(() => {
    if (!hydrated || tracked.current) return;
    tracked.current = true;
    const state = useCart.getState();
    track("cart_viewed", {
      cartValue: cartSubtotal(state.lines),
      itemCount: cartCount(state.lines),
      surface: "page",
    });
  }, [hydrated]);

  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-4xl font-semibold sm:text-5xl">Your cart</h1>

      {!hydrated ? (
        <CartSkeleton />
      ) : resolved.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mx-auto mt-10 flex max-w-lg flex-col items-center gap-4 px-8 py-14 text-center"
        >
          <span className="bg-terracotta-50 text-terracotta-600 flex size-20 items-center justify-center rounded-full">
            <ShoppingBag className="size-9" aria-hidden />
          </span>
          <h2 className="text-2xl font-semibold">Your cart is feeling a little light</h2>
          <p className="text-muted">
            Browse the menu and add a few favourites — we&apos;ll keep them here for you.
          </p>
          <Link href="/menu" className="btn-primary mt-2 h-12 px-6">
            Explore the menu <ArrowRight className="size-4" aria-hidden />
          </Link>
        </motion.div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <section aria-label="Items in your cart" className="card px-5 sm:px-6 lg:col-span-2">
            <ul className="divide-line divide-y">
              {resolved.map((line) => (
                <CartLineRow key={line.item.id} line={line} />
              ))}
            </ul>
          </section>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <OrderSummary subtotal={subtotal} tax={tax} total={total}>
              <Link href="/checkout" className="btn-primary h-12 w-full text-base">
                Proceed to checkout <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/menu" className="btn-ghost mt-2 w-full">
                Add more dishes
              </Link>
            </OrderSummary>
          </div>
        </div>
      )}
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3" aria-hidden>
      <div className="card space-y-6 p-6 lg:col-span-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="bg-sand size-20 animate-pulse rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="bg-sand h-4 w-1/2 animate-pulse rounded" />
              <div className="bg-sand h-4 w-1/3 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="card bg-sand/60 h-64 animate-pulse" />
    </div>
  );
}
