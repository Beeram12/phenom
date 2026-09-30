"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getMenuItem, type MenuItem } from "@/data/menu";
import { track } from "@/lib/analytics";
import { round2 } from "@/lib/utils";

export const MAX_QTY = 20;

export interface CartLine {
  itemId: string;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  isDrawerOpen: boolean;
  /** Add `qty` of an item (merges with any existing line). */
  addItem: (item: MenuItem, qty?: number) => void;
  /** Set an item's quantity; 0 removes it. */
  setQty: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => void;
  /** Replace the cart contents without firing events (used to restore an order). */
  replaceLines: (lines: CartLine[]) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const clampQty = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.round(n)));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isDrawerOpen: false,

      addItem: (item, qty = 1) => {
        const existing = get().lines.find((l) => l.itemId === item.id);
        const nextQty = clampQty((existing?.qty ?? 0) + qty);
        const added = nextQty - (existing?.qty ?? 0);
        if (added <= 0) return;
        set({
          lines: existing
            ? get().lines.map((l) => (l.itemId === item.id ? { ...l, qty: nextQty } : l))
            : [...get().lines, { itemId: item.id, qty: nextQty }],
        });
        track("add_to_cart", { itemId: item.id, name: item.name, qty: added, price: item.price });
      },

      setQty: (itemId, qty) => {
        const existing = get().lines.find((l) => l.itemId === itemId);
        if (!existing) return;
        const nextQty = clampQty(qty);
        if (nextQty === 0) {
          get().removeItem(itemId);
          return;
        }
        if (nextQty === existing.qty) return;
        set({ lines: get().lines.map((l) => (l.itemId === itemId ? { ...l, qty: nextQty } : l)) });
        const item = getMenuItem(itemId);
        track("cart_quantity_changed", {
          itemId,
          name: item?.name ?? itemId,
          qty: nextQty,
          previousQty: existing.qty,
          price: item?.price ?? 0,
        });
      },

      removeItem: (itemId) => {
        const existing = get().lines.find((l) => l.itemId === itemId);
        if (!existing) return;
        set({ lines: get().lines.filter((l) => l.itemId !== itemId) });
        const item = getMenuItem(itemId);
        track("remove_from_cart", {
          itemId,
          name: item?.name ?? itemId,
          qty: existing.qty,
          price: item?.price ?? 0,
        });
      },

      replaceLines: (lines) => set({ lines }),
      clear: () => set({ lines: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    {
      name: "ss_cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

export interface ResolvedCartLine {
  item: MenuItem;
  qty: number;
  lineTotal: number;
}

/** Join cart lines with menu data, dropping anything no longer on the menu. */
export function resolveLines(lines: CartLine[]): ResolvedCartLine[] {
  return lines.flatMap((line) => {
    const item = getMenuItem(line.itemId);
    return item ? [{ item, qty: line.qty, lineTotal: round2(item.price * line.qty) }] : [];
  });
}

export function cartSubtotal(lines: CartLine[]): number {
  return round2(resolveLines(lines).reduce((sum, l) => sum + l.lineTotal, 0));
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}
