"use client";

import { Check } from "lucide-react";
import { CHECKOUT_STEPS, type CheckoutStep } from "@/store/checkout.store";
import { cn } from "@/lib/cn";

export function CheckoutStepper({ step, onJump }: { step: CheckoutStep; onJump: (s: CheckoutStep) => void }) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="scrollbar-none flex items-center gap-1 overflow-x-auto pb-1 sm:gap-2">
        {CHECKOUT_STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                disabled={!done || step === 5}
                onClick={() => onJump(i as CheckoutStep)}
                aria-current={current ? "step" : undefined}
                className={cn("flex items-center gap-2 rounded-full px-2 py-1 text-sm disabled:cursor-default", done && step !== 5 && "hover:bg-muted")}
              >
                <span className={cn("flex size-7 items-center justify-center rounded-full border text-xs font-semibold", done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary text-primary ring-4 ring-primary/15" : "text-muted-foreground")}>
                  {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                <span className={cn("hidden sm:inline", current ? "font-semibold" : "text-muted-foreground")}>{label}</span>
                <span className="sr-only">{done ? "(completed)" : current ? "(current step)" : ""}</span>
              </button>
              {i < CHECKOUT_STEPS.length - 1 && <span className="h-px w-4 bg-border sm:w-8" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
