"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { useHydrated } from "@/lib/useHydrated";
import { formatPrice } from "@/lib/utils";
import { cartCount, cartSubtotal, resolveLines, useCart } from "@/store/cart";
import { CartLineRow } from "./CartLineRow";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const hydrated = useHydrated();
  const isOpen = useCart((s) => s.isDrawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const lines = useCart((s) => s.lines);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const resolved = resolveLines(lines);
  const subtotal = cartSubtotal(lines);
  const count = cartCount(lines);

  // Close when navigating.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Track opens, manage focus, lock scroll, handle Escape + focus trap.
  useEffect(() => {
    if (!isOpen) return;
    const state = useCart.getState();
    track("cart_viewed", {
      cartValue: cartSubtotal(state.lines),
      itemCount: cartCount(state.lines),
      surface: "drawer",
    });

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen, close]);

  if (!hydrated) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="bg-ink/30 absolute inset-0 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            className="bg-cream shadow-lift absolute inset-y-0 right-0 flex w-full max-w-md flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="border-line flex items-center justify-between border-b px-5 py-4">
              <h2 id="cart-drawer-title" className="text-xl font-semibold">
                Your cart{count > 0 && <span className="text-muted"> · {count}</span>}
              </h2>
              <button
                type="button"
                onClick={close}
                className="hover:bg-sand flex size-10 items-center justify-center rounded-full transition"
                aria-label="Close cart"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {resolved.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="bg-terracotta-50 text-terracotta-600 flex size-16 items-center justify-center rounded-full">
                  <ShoppingBag className="size-7" aria-hidden />
                </span>
                <p className="font-display text-xl">Your cart is empty</p>
                <p className="text-muted text-sm">Something warm and delicious is a tap away.</p>
                <Link href="/menu" className="btn-primary" onClick={close}>
                  Browse the menu
                </Link>
              </div>
            ) : (
              <>
                <ul className="divide-line flex-1 divide-y overflow-y-auto px-5">
                  {resolved.map((line) => (
                    <CartLineRow key={line.item.id} line={line} compact onNavigate={close} />
                  ))}
                </ul>
                <div className="border-line space-y-3 border-t bg-white px-5 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Subtotal</span>
                    <span className="text-lg font-semibold tabular-nums">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <p className="text-muted text-xs">Taxes calculated at checkout.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/cart" className="btn-secondary" onClick={close}>
                      View cart
                    </Link>
                    <Link href="/checkout" className="btn-primary" onClick={close}>
                      Checkout
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
