"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { RESTAURANT } from "@/data/restaurant";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";
import { cartCount, useCart } from "@/store/cart";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
];

export function Navbar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const openDrawer = useCart((s) => s.openDrawer);
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <header className="border-line/60 bg-cream/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <nav
        aria-label="Main"
        className="container-page flex h-16 items-center justify-between gap-4"
      >
        <Link href="/" className="flex items-center gap-2 rounded-md">
          <span
            aria-hidden
            className="bg-terracotta-600 font-display flex size-9 items-center justify-center rounded-full text-lg text-white"
          >
            S
          </span>
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            {RESTAURANT.name}
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
              return (
                <li key={link.href} className={link.href === "/" ? "hidden sm:block" : undefined}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "hover:bg-sand rounded-full px-3 py-2 text-sm font-medium transition",
                      active ? "text-terracotta-700" : "text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={openDrawer}
            className="border-line hover:border-terracotta-500 hover:text-terracotta-700 relative flex size-11 items-center justify-center rounded-full border bg-white transition"
            aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
          >
            <ShoppingBag className="size-5" aria-hidden />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  aria-hidden
                  className="bg-terracotta-600 absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>
    </header>
  );
}
