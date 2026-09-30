"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CATEGORIES, MENU, type Category } from "@/data/menu";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ItemCard } from "./ItemCard";

type Filter = "All" | Category;
const TABS: Filter[] = ["All", ...CATEGORIES];

function matches(query: string, text: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function MenuBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const [category, setCategory] = useState<Filter>(
    TABS.includes(initialCategory as Filter) ? (initialCategory as Filter) : "All",
  );
  const [query, setQuery] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const results = useMemo(() => {
    const q = query.trim();
    return MENU.filter(
      (item) =>
        (category === "All" || item.category === category) &&
        (!q || matches(q, item.name) || matches(q, item.description) || matches(q, item.category)),
    );
  }, [category, query]);

  // Debounced search tracking.
  const trimmed = query.trim();
  useEffect(() => {
    if (!trimmed) return;
    const id = window.setTimeout(() => {
      track("search_performed", { query: trimmed, resultCount: results.length });
    }, 600);
    return () => window.clearTimeout(id);
  }, [trimmed, results.length]);

  const selectCategory = (next: Filter) => {
    if (next === category) return;
    setCategory(next);
    const q = query.trim();
    const count = MENU.filter(
      (item) =>
        (next === "All" || item.category === next) &&
        (!q || matches(q, item.name) || matches(q, item.description) || matches(q, item.category)),
    ).length;
    track("category_filtered", { category: next, resultCount: count });
    const params = new URLSearchParams(searchParams.toString());
    if (next === "All") params.delete("category");
    else params.set("category", next);
    const qs = params.toString();
    router.replace(qs ? `/menu?${qs}` : "/menu", { scroll: false });
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    selectCategory(TABS[next]);
  };

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div
          role="tablist"
          aria-label="Filter by category"
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
        >
          {TABS.map((tab, i) => {
            const active = tab === category;
            return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`tab-${tab}`}
                aria-selected={active}
                aria-controls="menu-results"
                tabIndex={active ? 0 : -1}
                onClick={() => selectCategory(tab)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "text-white"
                    : "text-ink ring-line hover:ring-terracotta-500 bg-white ring-1",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="active-tab"
                    className="bg-terracotta-600 absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative">{tab}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:max-w-xs">
          <label htmlFor="menu-search" className="sr-only">
            Search the menu
          </label>
          <Search
            className="text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            id="menu-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            autoComplete="off"
            className="input rounded-full py-2.5 pr-10 pl-11 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted hover:bg-sand hover:text-ink absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {results.length} dish{results.length === 1 ? "" : "es"} found
      </p>

      <div id="menu-results" role="tabpanel" aria-labelledby={`tab-${category}`} className="mt-8">
        {results.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-display text-2xl">No dishes match &ldquo;{query}&rdquo;</p>
            <p className="text-muted">Try a different word, or browse another category.</p>
            <button
              type="button"
              className="btn-secondary mt-2"
              onClick={() => {
                setQuery("");
                selectCategory("All");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <motion.ul layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {results.map((item, i) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                >
                  <ItemCard item={item} priority={i < 3} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  );
}
