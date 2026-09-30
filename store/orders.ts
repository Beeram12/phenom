"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderLineItem, PaymentMethod } from "@/lib/analytics";

export type OrderStatus = "confirmed" | "failed" | "cancelled";

/** How long after placing an order the customer can still cancel it. */
export const CANCEL_WINDOW_MS = 60_000;

export interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  delivery: DeliveryDetails;
  status: OrderStatus;
  createdAt: string;
  estimatedMinutes: number;
  failureReason?: string;
  cancelReason?: string;
}

interface OrdersState {
  orders: Record<string, Order>;
  saveOrder: (order: Order) => void;
  updateStatus: (id: string, status: OrderStatus, patch?: Partial<Order>) => void;
}

export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: {},
      saveOrder: (order) => set({ orders: { ...get().orders, [order.id]: order } }),
      updateStatus: (id, status, patch) => {
        const existing = get().orders[id];
        if (!existing) return;
        set({ orders: { ...get().orders, [id]: { ...existing, ...patch, status } } });
      },
    }),
    {
      name: "ss_orders",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
