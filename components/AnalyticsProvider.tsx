"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/** Fires `page_view` on first load and on every client-side route change. */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTracked.current === pathname) return;

    // Defer a tick so the new page has set document.title. Recording the path inside
    // the timeout keeps this correct under React Strict Mode's double effects.
    const id = window.setTimeout(() => {
      const referrer = lastTracked.current ?? (document.referrer || null);
      lastTracked.current = pathname;
      track("page_view", { title: document.title, referrer });
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
