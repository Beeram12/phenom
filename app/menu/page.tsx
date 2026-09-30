import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemCardSkeleton } from "@/components/ItemCard";
import { MenuBrowser } from "@/components/MenuBrowser";

export const metadata: Metadata = {
  title: "Menu",
  description: "Starters, mains, desserts and drinks — cooked to order.",
};

export default function MenuPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-semibold sm:text-5xl">Our menu</h1>
        <p className="text-muted mt-3 text-lg">
          Everything is cooked to order. Pick your favourites and we&apos;ll bring them over warm.
        </p>
      </header>
      <Suspense
        fallback={
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MenuBrowser />
      </Suspense>
    </div>
  );
}
