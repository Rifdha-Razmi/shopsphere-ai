"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Loader2, Search, TrendingUp, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearchSuggestions } from "@/features/search/hooks/useSearch";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useSignalsStore } from "@/store/signals.store";
import { useHydrated } from "@/store/hydration.store";
import { MAX_SEARCH_LENGTH, POPULAR_SEARCHES, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { normalizeText } from "@/utils/text";
import { cn } from "@/lib/cn";

type Option =
  | { kind: "recent" | "popular"; value: string }
  | { kind: "category"; value: string; slug: string }
  | { kind: "product"; value: string; id: number };

/**
 * Search combobox (MOD-03): debounced live suggestions, recent + popular
 * searches on focus, full keyboard support (WAI-ARIA combobox pattern).
 */
export function SearchBar({ className, autoFocus, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() => params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);
  const suggestions = useSearchSuggestions(debounced);
  const { categories } = useCategories();
  const history = useSignalsStore((s) => s.searchHistory);
  const recordSearch = useSignalsStore((s) => s.recordSearch);
  const clearHistory = useSignalsStore((s) => s.clearSearchHistory);
  const removeSearch = useSignalsStore((s) => s.removeSearch);

  // Keep the box in sync with the URL (back/forward navigation).
  const urlQuery = params.get("q") ?? "";
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setValue(urlQuery);
  }

  const trimmed = value.trim();
  const options = useMemo<Option[]>(() => {
    if (!trimmed) {
      const recent = hydrated ? history.slice(0, 5).map((v) => ({ kind: "recent" as const, value: v })) : [];
      const popular = POPULAR_SEARCHES.filter((p) => !history.includes(p)).map((v) => ({ kind: "popular" as const, value: v }));
      return [...recent, ...popular.slice(0, 6 - Math.min(recent.length, 2))];
    }
    const q = normalizeText(trimmed);
    const cats = categories
      .filter((c) => normalizeText(c.name).includes(q) || normalizeText(c.slug.replace(/-/g, " ")).includes(q))
      .slice(0, 3)
      .map((c) => ({ kind: "category" as const, value: c.name, slug: c.slug }));
    const products = (debounced.trim() ? suggestions.data?.products ?? [] : []).slice(0, 6).map((p) => ({ kind: "product" as const, value: p.title, id: p.id }));
    return [...cats, ...products];
  }, [trimmed, hydrated, history, categories, suggestions.data, debounced]);

  const go = (href: string) => {
    setOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
    router.push(href);
  };

  const submit = (query: string) => {
    const q = query.trim().slice(0, MAX_SEARCH_LENGTH);
    if (!q) {
      // Edge case 5: empty submit fires no request — show recent/popular instead.
      setOpen(true);
      inputRef.current?.focus();
      return;
    }
    recordSearch(q);
    setValue(q);
    go(`/search?q=${encodeURIComponent(q)}`);
  };

  const choose = (option: Option) => {
    if (option.kind === "category") go(`/category/${option.slug}`);
    else if (option.kind === "product") {
      recordSearch(trimmed || option.value);
      go(`/product/${option.id}`);
    } else submit(option.value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (options.length ? (i - 1 + options.length) % options.length : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && options[active]) choose(options[active]);
      else submit(value);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const showList = open && (options.length > 0 || (trimmed.length >= 2 && !suggestions.isFetching));
  const loading = trimmed.length >= 2 && (value !== debounced || suggestions.isFetching);
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products
        </label>
        <div className="flex h-11 items-center rounded-lg border border-input bg-card shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
          <Search className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            autoFocus={autoFocus}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Search for products, brands and more"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
          />
          {loading && <Loader2 className="mr-1 size-4 animate-spin text-muted-foreground" aria-label="Loading suggestions" />}
          {value && (
            <button type="button" className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-muted" onClick={() => { setValue(""); inputRef.current?.focus(); }} aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
          <button type="submit" className="mr-1 hidden h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:block">
            Search
          </button>
        </div>
      </form>

      {showList && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover shadow-xl">
          {!trimmed && hydrated && history.length > 0 && (
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1 text-xs font-semibold text-muted-foreground">
              <span>Recent searches</span>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearHistory} className="font-medium text-primary hover:underline">
                Clear history
              </button>
            </div>
          )}
          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-96 overflow-y-auto py-1">
            {options.map((o, i) => (
              <li
                key={`${o.kind}-${o.value}-${i}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm", i === active && "bg-muted")}
              >
                {o.kind === "recent" && <Clock className="size-4 text-muted-foreground" aria-hidden />}
                {o.kind === "popular" && <TrendingUp className="size-4 text-muted-foreground" aria-hidden />}
                {(o.kind === "category" || o.kind === "product") && <Search className="size-4 text-muted-foreground" aria-hidden />}
                <span className="line-clamp-1 flex-1">{o.value}</span>
                {o.kind === "recent" && (
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-background"
                    aria-label={`Remove ${o.value} from recent searches`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearch(o.value);
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
            {!trimmed && options.length > 0 && history.length === 0 && <li className="px-3 pb-1 text-xs text-muted-foreground">Popular right now</li>}
            {trimmed.length >= 2 && options.length === 0 && !loading && (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                {suggestions.isError ? "Suggestions are unavailable right now — press Enter to search." : `No quick matches for “${trimmed}”. Press Enter to search everything.`}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
