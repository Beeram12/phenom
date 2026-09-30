"use client";

import { Star } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/** Read-only star display supporting fractional values (e.g. 4.3). */
export function StarDisplay({
  value,
  size = 16,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star
              aria-hidden
              className="text-line absolute inset-0"
              style={{ width: size, height: size }}
              fill="currentColor"
              strokeWidth={0}
            />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star
                aria-hidden
                className="text-terracotta-500"
                style={{ width: size, height: size }}
                fill="currentColor"
                strokeWidth={0}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: number;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Accessible 1–5 star input implemented as a radio group:
 * hover to preview, click to set, arrow keys / Home / End / 1–5 on the keyboard.
 */
export function StarRatingInput({
  value,
  onChange,
  label = "Your rating",
  size = 28,
  invalid,
  describedBy,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const shown = hovered ?? value;

  const select = (next: number) => {
    const clamped = Math.max(1, Math.min(5, next));
    onChange(clamped);
    refs.current[clamped - 1]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const current = value || 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      select(current + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      select(current - 1 || 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(1);
    } else if (e.key === "End") {
      e.preventDefault();
      select(5);
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      select(Number(e.key));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= shown;
          // Roving tabindex: only the selected star (or the first) is tabbable.
          const tabbable = value ? n === value : n === 1;
          return (
            <button
              key={n}
              ref={(el) => {
                refs.current[n - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n > 1 ? "s" : ""} — ${LABELS[n - 1]}`}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(n)}
              onMouseEnter={() => setHovered(n)}
              onFocus={() => setHovered(null)}
              onKeyDown={onKeyDown}
              className="rounded-md p-0.5 transition-transform duration-150 hover:scale-110"
            >
              <Star
                aria-hidden
                style={{ width: size, height: size }}
                className={cn(
                  "transition-colors duration-150",
                  active ? "text-terracotta-500" : "text-line",
                )}
                fill="currentColor"
                strokeWidth={0}
              />
            </button>
          );
        })}
      </div>
      <span className="text-muted min-w-20 text-sm" aria-hidden>
        {shown ? LABELS[shown - 1] : "Tap to rate"}
      </span>
    </div>
  );
}
