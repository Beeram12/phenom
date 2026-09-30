"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Review } from "@/data/reviews";
import { formatDate } from "@/lib/utils";
import { StarDisplay } from "./StarRating";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="bg-sand/70 text-muted rounded-2xl px-5 py-6 text-center">
        No reviews yet — be the first to share what you thought.
      </p>
    );
  }

  return (
    <ul className="divide-line divide-y">
      <AnimatePresence initial={false}>
        {reviews.map((review) => (
          <motion.li
            key={review.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <article className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-9 items-center justify-center rounded-full bg-olive-50 font-semibold text-olive-700"
                  >
                    {review.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium">{review.name}</p>
                    <time dateTime={review.createdAt} className="text-muted text-xs">
                      {formatDate(review.createdAt)}
                    </time>
                  </div>
                </div>
                <StarDisplay value={review.rating} size={16} />
              </div>
              {review.comment && (
                <p className="text-ink/90 mt-3 leading-relaxed whitespace-pre-line">
                  {review.comment}
                </p>
              )}
            </article>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
