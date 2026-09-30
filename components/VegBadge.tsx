import { cn } from "@/lib/utils";

/** Indian-style veg / non-veg indicator (square with dot) plus a text label. */
export function VegBadge({ isVeg, className }: { isVeg: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        isVeg ? "bg-olive-50 text-olive-700" : "bg-terracotta-50 text-terracotta-700",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 items-center justify-center rounded-[3px] border-[1.5px]",
          isVeg ? "border-olive-700" : "border-terracotta-700",
        )}
      >
        <span
          className={cn("size-1.5 rounded-full", isVeg ? "bg-olive-700" : "bg-terracotta-700")}
        />
      </span>
      {isVeg ? "Veg" : "Non-veg"}
    </span>
  );
}
