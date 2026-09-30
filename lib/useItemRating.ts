"use client";

import { useMemo } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { ratingSummary, reviewsFor, seedRatingSummary, useReviews } from "@/store/reviews";

/** Average rating for an item, including reviews saved in this browser once hydrated. */
export function useItemRating(itemId: string) {
  const hydrated = useHydrated();
  const userReviews = useReviews((s) => s.userReviews);
  return useMemo(
    () => (hydrated ? ratingSummary(reviewsFor(itemId, userReviews)) : seedRatingSummary(itemId)),
    [hydrated, itemId, userReviews],
  );
}
