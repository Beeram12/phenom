import { TAX_RATE } from "@/data/restaurant";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return inrFormatter.format(amount);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTotals(subtotal: number) {
  const tax = round2(subtotal * TAX_RATE);
  return { subtotal: round2(subtotal), tax, total: round2(subtotal + tax) };
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Human-friendly order id, e.g. SS-7K2Q9M */
export function generateOrderId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `SS-${id}`;
}
