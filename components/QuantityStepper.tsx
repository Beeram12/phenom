"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Used for accessible labels, e.g. "Butter Chicken". */
  label: string;
  size?: "sm" | "md";
  /** Show a trash icon instead of minus when at `min` + 1 and min is 0. */
  showRemove?: boolean;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
  size = "md",
  showRemove = false,
  className,
}: QuantityStepperProps) {
  const btn = cn(
    "flex items-center justify-center rounded-full text-ink transition hover:bg-terracotta-50 hover:text-terracotta-700 disabled:opacity-40 disabled:hover:bg-transparent",
    size === "sm" ? "size-9" : "size-10",
  );
  const willRemove = showRemove && value - 1 < 1;

  return (
    <div
      role="group"
      aria-label={`Quantity for ${label}`}
      className={cn(
        "border-line inline-flex items-center rounded-full border bg-white p-0.5",
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={!showRemove && value <= min}
        aria-label={willRemove ? `Remove ${label}` : `Decrease quantity of ${label}`}
      >
        {willRemove ? (
          <Trash2 className="size-4" aria-hidden />
        ) : (
          <Minus className="size-4" aria-hidden />
        )}
      </button>
      <output
        aria-live="polite"
        className={cn(
          "min-w-8 text-center font-semibold tabular-nums",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Increase quantity of ${label}`}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
