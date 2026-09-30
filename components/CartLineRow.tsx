"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";
import { type ResolvedCartLine, useCart } from "@/store/cart";
import { QuantityStepper } from "./QuantityStepper";
import { SafeImage } from "./SafeImage";
import { VegBadge } from "./VegBadge";

export function CartLineRow({
  line,
  compact = false,
  onNavigate,
}: {
  line: ResolvedCartLine;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);
  const { item, qty, lineTotal } = line;

  return (
    <li className="flex gap-4 py-4">
      <SafeImage
        src={item.image}
        alt={item.name}
        fill
        sizes="96px"
        wrapperClassName={
          compact ? "size-16 shrink-0 rounded-xl" : "size-20 shrink-0 rounded-xl sm:size-24"
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/menu/${item.id}`}
              onClick={() => {
                track("item_clicked", {
                  itemId: item.id,
                  name: item.name,
                  category: item.category,
                  price: item.price,
                  source: "cart",
                });
                onNavigate?.();
              }}
              className="hover:text-terracotta-700 font-medium"
            >
              {item.name}
            </Link>
            <div className="text-muted mt-1 flex items-center gap-2 text-sm">
              {!compact && <VegBadge isVeg={item.isVeg} className="py-0.5" />}
              <span>{formatPrice(item.price)} each</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="text-muted hover:bg-sand hover:text-ink -mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full transition"
            aria-label={`Remove ${item.name} from cart`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <QuantityStepper
            value={qty}
            onChange={(n) => setQty(item.id, n)}
            label={item.name}
            size="sm"
            showRemove
          />
          <p className="font-semibold tabular-nums">{formatPrice(lineTotal)}</p>
        </div>
      </div>
    </li>
  );
}
