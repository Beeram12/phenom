"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SEED_REVIEWS, type Review } from "@/data/reviews";
import { track, uuid } from "@/lib/analytics";

interface NewReview {
  itemId: string;
  name: string;
  rating: number;
  comment: string;
  source: "item_page" | "order_page";
  orderId?: string;
}

interface ReviewsState {
  userReviews: Review[];
  addReview: (review: NewReview) => Review;
}

export const useReviews = create<ReviewsState>()(
  persist(
    (set, get) => ({
      userReviews: [],
      addReview: ({ itemId, name, rating, comment, source, orderId }) => {
        const review: Review = {
          id: uuid(),
          itemId,
          name: name.trim() || "Guest",
          rating,
          comment: comment.trim(),
          createdAt: new Date().toISOString(),
        };
        set({ userReviews: [review, ...get().userReviews] });
        track("feedback_submitted", {
          itemId,
          rating,
          commentLength: review.comment.length,
          comment: review.comment,
          source,
          ...(orderId ? { orderId } : {}),
        });
        return review;
      },
    }),
    {
      name: "ss_reviews",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Reviews for one item, newest first (user reviews + seeded ones). */
export function reviewsFor(itemId: string, userReviews: Review[]): Review[] {
  return [...userReviews, ...SEED_REVIEWS]
    .filter((r) => r.itemId === itemId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function ratingSummary(reviews: Review[]): { average: number; count: number } {
  if (reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

/** Summary using seed data only — safe for server/first render. */
export function seedRatingSummary(itemId: string) {
  return ratingSummary(SEED_REVIEWS.filter((r) => r.itemId === itemId));
}
