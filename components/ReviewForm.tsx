"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useReviews } from "@/store/reviews";
import { StarRatingInput } from "./StarRating";

export const MAX_COMMENT = 500;

interface ReviewFormProps {
  itemId: string;
  itemName: string;
  source: "item_page" | "order_page";
  orderId?: string;
  defaultName?: string;
  compact?: boolean;
}

export function ReviewForm({
  itemId,
  itemName,
  source,
  orderId,
  defaultName = "",
  compact = false,
}: ReviewFormProps) {
  const addReview = useReviews((s) => s.addReview);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const uid = useId();
  const errorId = `${uid}-error`;
  const countId = `${uid}-count`;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    if (comment.length > MAX_COMMENT) {
      setError(`Comments can be up to ${MAX_COMMENT} characters.`);
      return;
    }
    addReview({ itemId, name, rating, comment, source, orderId });
    setSubmitted(true);
    toast.success("Thanks for your feedback!", { description: itemName });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {submitted ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl bg-olive-50 px-4 py-3 text-olive-700"
          role="status"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          <p className="text-sm font-medium">Thanks! Your review of {itemName} has been added.</p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          exit={{ opacity: 0, y: -6 }}
          onSubmit={onSubmit}
          noValidate
          className="space-y-4"
          aria-label={`Review ${itemName}`}
        >
          <fieldset>
            <legend className="label">
              {compact ? `How was the ${itemName}?` : "Your rating"}
            </legend>
            <StarRatingInput
              value={rating}
              onChange={(v) => {
                setRating(v);
                setError(null);
              }}
              label={`Rating for ${itemName}`}
              invalid={!!error && rating < 1}
              describedBy={error ? errorId : undefined}
              size={compact ? 24 : 28}
            />
          </fieldset>

          <div className={compact ? "grid gap-4 sm:grid-cols-3" : "space-y-4"}>
            <div className={compact ? "sm:col-span-1" : undefined}>
              <label htmlFor={`${uid}-name`} className="label">
                Your name <span className="text-muted font-normal">(optional)</span>
              </label>
              <input
                id={`${uid}-name`}
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                autoComplete="given-name"
                placeholder="Guest"
              />
            </div>
            <div className={compact ? "sm:col-span-2" : undefined}>
              <label htmlFor={`${uid}-comment`} className="label">
                Comment <span className="text-muted font-normal">(optional)</span>
              </label>
              <textarea
                id={`${uid}-comment`}
                className="input min-h-24 resize-y"
                value={comment}
                maxLength={MAX_COMMENT}
                onChange={(e) => setComment(e.target.value)}
                aria-describedby={countId}
                placeholder="What did you enjoy? Anything we could do better?"
                rows={compact ? 2 : 4}
              />
              <p
                id={countId}
                className={`mt-1 text-right text-xs ${comment.length >= MAX_COMMENT ? "text-danger" : "text-muted"}`}
              >
                {comment.length}/{MAX_COMMENT}
              </p>
            </div>
          </div>

          {error && (
            <p id={errorId} role="alert" className="field-error">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary">
            Submit review
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
