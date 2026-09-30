"use client";

import Image, { type ImageProps } from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SafeImageProps = Omit<ImageProps, "onLoad" | "onError"> & {
  wrapperClassName?: string;
};

/**
 * next/image with a soft shimmering skeleton while loading, a gentle fade-in,
 * and a calm placeholder if the image fails.
 */
export function SafeImage({ wrapperClassName, className, alt, ...props }: SafeImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className={cn("bg-sand relative overflow-hidden", wrapperClassName)}>
      {status === "loading" && (
        <div
          aria-hidden
          className="from-sand via-cream to-sand absolute inset-0 animate-pulse bg-gradient-to-br"
        />
      )}
      {status === "error" ? (
        <div
          role="img"
          aria-label={alt}
          className="text-muted/60 absolute inset-0 flex items-center justify-center"
        >
          <UtensilsCrossed className="size-10" aria-hidden />
        </div>
      ) : (
        <Image
          {...props}
          alt={alt}
          className={cn(
            "object-cover transition-opacity duration-500",
            status === "loaded" ? "opacity-100" : "opacity-0",
            className,
          )}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
    </div>
  );
}
