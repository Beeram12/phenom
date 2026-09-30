"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MenuItem } from "@/data/menu";
import { track } from "@/lib/analytics";
import { useItemRating } from "@/lib/useItemRating";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { QuantityStepper } from "./QuantityStepper";
import { SafeImage } from "./SafeImage";
import { StarDisplay } from "./StarRating";
import { VegBadge } from "./VegBadge";

interface ItemCardProps {
  item: MenuItem;
  source?: "menu" | "home";
  priority?: boolean;
}

export function ItemCard({ item, source = "menu", priority = false }: ItemCardProps) {
  const [qty, setQty] = useState(1);
  const addItem = useCart((s) => s.addItem);
  const openDrawer = useCart((s) => s.openDrawer);
  const { average, count } = useItemRating(item.id);
  const href = `/menu/${item.id}`;

  const onClickItem = () =>
    track("item_clicked", {
      itemId: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      source,
    });

  const onAdd = () => {
    addItem(item, qty);
    toast.success("Added to cart", {
      description: `${qty} × ${item.name}`,
      action: { label: "View cart", onClick: openDrawer },
    });
    setQty(1);
  };

  return (
    <article className="group card hover:shadow-lift flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5">
      <Link href={href} onClick={onClickItem} tabIndex={-1} aria-hidden className="block">
        <SafeImage
          src={item.image}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          wrapperClassName="aspect-[4/3]"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug font-semibold">
            <Link
              href={href}
              onClick={onClickItem}
              className="hover:text-terracotta-700 rounded-sm"
            >
              {item.name}
            </Link>
          </h3>
          <VegBadge isVeg={item.isVeg} className="shrink-0" />
        </div>

        <p className="text-muted line-clamp-2 text-sm leading-relaxed">{item.description}</p>

        <div className="text-muted flex items-center gap-2 text-sm">
          {count > 0 ? (
            <>
              <StarDisplay value={average} size={14} />
              <span className="text-ink font-medium">{average.toFixed(1)}</span>
              <span>({count})</span>
            </>
          ) : (
            <span>No ratings yet</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-lg font-semibold">{formatPrice(item.price)}</p>
          <div className="flex items-center gap-2">
            <QuantityStepper value={qty} onChange={setQty} label={item.name} size="sm" />
            <button
              type="button"
              onClick={onAdd}
              className="btn-primary min-h-10 px-4"
              aria-label={`Add ${qty} ${item.name} to cart`}
            >
              <ShoppingBag className="size-4" aria-hidden />
              Add
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="bg-sand aspect-[4/3] animate-pulse" />
      <div className="space-y-3 p-5">
        <div className="bg-sand h-5 w-2/3 animate-pulse rounded" />
        <div className="bg-sand h-4 w-full animate-pulse rounded" />
        <div className="bg-sand h-4 w-4/5 animate-pulse rounded" />
        <div className="bg-sand h-10 w-full animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
