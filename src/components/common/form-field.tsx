import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

/**
 * Accessible field wrapper: label is associated with the control, and the
 * error is tied to it via aria-describedby (set by the caller with
 * `fieldA11y`). Errors use an icon + text, never colour alone (PRD §14).
 */
export function FormField({ id, label, error, hint, children, className, required }: { id: string; label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {/* Kept outside the <label> so the accessible name stays clean; requiredness is conveyed by validation text. */}
        {required && (
          <span className="text-sm text-destructive" aria-hidden>
            *
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1 text-xs font-medium text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldA11y(id: string, error?: string, hasHint = false) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  } as const;
}
