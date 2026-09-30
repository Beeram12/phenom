import { TAX_RATE } from "@/data/restaurant";
import { cn, formatPrice } from "@/lib/utils";

interface SummaryLine {
  id: string;
  name: string;
  qty: number;
  lineTotal: number;
}

interface OrderSummaryProps {
  lines?: SummaryLine[];
  subtotal: number;
  tax: number;
  total: number;
  className?: string;
  children?: React.ReactNode;
  title?: string;
}

/** Subtotal / taxes / total block, optionally with a line-item list. */
export function OrderSummary({
  lines,
  subtotal,
  tax,
  total,
  className,
  children,
  title = "Order summary",
}: OrderSummaryProps) {
  return (
    <section aria-labelledby="order-summary-heading" className={cn("card p-6", className)}>
      <h2 id="order-summary-heading" className="text-xl font-semibold">
        {title}
      </h2>

      {lines && lines.length > 0 && (
        <ul className="border-line mt-4 space-y-2 border-b pb-4 text-sm">
          {lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-4">
              <span className="text-muted">
                <span className="text-ink font-medium tabular-nums">{l.qty}×</span> {l.name}
              </span>
              <span className="tabular-nums">{formatPrice(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Taxes (GST {Math.round(TAX_RATE * 100)}%)</dt>
          <dd className="tabular-nums">{formatPrice(tax)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Delivery</dt>
          <dd className="font-medium text-olive-700">Free</dd>
        </div>
        <div className="border-line flex justify-between border-t pt-3 text-base">
          <dt className="font-semibold">Total</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatPrice(total)}</dd>
        </div>
      </dl>

      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}
