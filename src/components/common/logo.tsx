import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="ShopSphere AI home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>

        {/* Solid fill (no gradient id) so several logos on one page never clash when one is hidden. */}
        <circle cx="16" cy="16" r="15" fill="oklch(0.47 0.21 278)" />
        <ellipse cx="16" cy="16" rx="15" ry="6" fill="none" stroke="white" strokeOpacity=".35" strokeWidth="1.4" />
        <path d="M11.5 12.5h9l-1 8.5h-7z" fill="white" />
        <path d="M13.5 12.5a2.5 2.5 0 0 1 5 0" fill="none" stroke="white" strokeWidth="1.6" />
        <circle cx="24.5" cy="8" r="2.2" fill="oklch(0.82 0.15 75)" />
      </svg>
      {!compact && (
        <span className="text-lg leading-none">
          ShopSphere<span className="ml-1 rounded bg-accent px-1 py-0.5 align-middle text-[10px] font-bold text-accent-foreground">AI</span>
        </span>
      )}
    </Link>
  );
}
