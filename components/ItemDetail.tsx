"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MENU, type MenuItem } from "@/data/menu";
import { track } from "@/lib/analytics";
import { useHydrated } from "@/lib/useHydrated";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { ratingSummary, reviewsFor, useReviews } from "@/store/reviews";
import { ItemCard } from "./ItemCard";
import { QuantityStepper } from "./QuantityStepper";
import { ReviewForm } from "./ReviewForm";
import { ReviewList } from "./ReviewList";
import { SafeImage } from "./SafeImage";
import { StarDisplay } from "./StarRating";
import { VegBadge } from "./VegBadge";

export function ItemDetail({ item }: { item: MenuItem }) {
  const [qty, setQty] = useState(1);
  const addItem = useCart((s) => s.addItem);
  const openDrawer = useCart((s) => s.openDrawer);
  const hydrated = useHydrated();
  const userReviews = useReviews((s) => s.userReviews);

  const reviews = useMemo(
    () => reviewsFor(item.id, hydrated ? userReviews : []),
    [hydrated, item.id, userReviews],
  );
  const { average, count } = ratingSummary(reviews);

  const related = useMemo(
    () => MENU.filter((m) => m.category === item.category && m.id !== item.id).slice(0, 3),
    [item],
  );

  useEffect(() => {
    track("item_viewed", {
      itemId: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
    });
  }, [item]);

  const onAdd = () => {
    addItem(item, qty);
    toast.success("Added to cart", {
      description: `${qty} × ${item.name}`,
      action: { label: "View cart", onClick: openDrawer },
    });
    setQty(1);
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <Link href="/menu" className="btn-ghost mb-6 -ml-3 min-h-10 px-3">
        <ArrowLeft className="size-4" aria-hidden /> Back to menu
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <SafeImage
          src={item.image}
          alt={item.name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          wrapperClassName="aspect-[4/3] rounded-[24px] shadow-lift lg:aspect-square"
        />

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3">
            <VegBadge isVeg={item.isVeg} />
            <Link
              href={`/menu?category=${item.category}`}
              className="text-sm font-medium text-olive-700 hover:underline"
            >
              {item.category}
            </Link>
          </div>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{item.name}</h1>

          <a
            href="#reviews"
            className="text-muted hover:text-ink mt-3 inline-flex w-fit items-center gap-2 rounded-md text-sm"
          >
            {count > 0 ? (
              <>
                <StarDisplay value={average} size={18} />
                <span className="text-ink font-semibold">{average.toFixed(1)}</span>
                <span>
                  · {count} review{count === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span>No reviews yet</span>
            )}
          </a>

          <p className="text-ink/90 mt-6 text-lg leading-relaxed">{item.longDescription}</p>

          <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="text-3xl font-semibold">{formatPrice(item.price)}</p>
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper value={qty} onChange={setQty} label={item.name} />
              <button type="button" onClick={onAdd} className="btn-primary h-12 px-6 text-base">
                <ShoppingBag className="size-5" aria-hidden />
                Add to cart · {formatPrice(item.price * qty)}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section
        id="reviews"
        aria-labelledby="reviews-heading"
        className="mt-16 grid scroll-mt-24 gap-10 lg:grid-cols-5"
      >
        <div className="lg:col-span-3">
          <h2 id="reviews-heading" className="text-3xl font-semibold">
            Reviews
          </h2>
          <div className="mt-4">
            <ReviewList reviews={reviews} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="card p-6 lg:sticky lg:top-24">
            <h3 className="text-xl font-semibold">Leave a review</h3>
            <p className="text-muted mt-1 mb-5 text-sm">
              Tried the {item.name}? Tell us how it was.
            </p>
            <ReviewForm key={item.id} itemId={item.id} itemName={item.name} source="item_page" />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="text-3xl font-semibold">
            More {item.category.toLowerCase()}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <ItemCard item={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
