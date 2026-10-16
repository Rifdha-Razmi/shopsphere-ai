"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CloudOff, PackageSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Empty state: a specific message plus a clear next action (PRD §16). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center", className)}>
      <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">{icon ?? <PackageSearch className="size-7" />}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <div className="max-w-md text-sm text-muted-foreground">{description}</div>}
      {action &&
        (action.href ? (
          <Button asChild className="mt-1">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button className="mt-1" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

/** Error state: human-readable message plus a recovery action. Never shows raw errors. */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
  offline,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  offline?: boolean;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-12 text-center", className)}>
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        {offline ? <CloudOff className="size-7" /> : <AlertTriangle className="size-7" />}
      </div>
      <h2 className="text-lg font-semibold">{offline ? "You're offline" : title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{offline ? "Check your internet connection. We'll show saved data where we can." : description}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>
    </div>
  );
}

/** Banner shown above cached content when a refresh failed (edge case 3). */
export function StaleDataBanner({ onRetry, message = "We're showing the last saved data because the store couldn't be reached." }: { onRetry?: () => void; message?: string }) {
  return (
    <div role="status" className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        <CloudOff className="size-4 shrink-0" aria-hidden />
        {message}
      </span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw /> Retry
        </Button>
      )}
    </div>
  );
}
