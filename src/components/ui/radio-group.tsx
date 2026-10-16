"use client";

import * as React from "react";
import { RadioGroup as RG } from "radix-ui";
import { cn } from "@/lib/cn";

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RG.Root>) {
  return <RG.Root className={cn("grid gap-3", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RG.Item>) {
  return (
    <RG.Item
      className={cn("aspect-square size-4 shrink-0 rounded-full border border-input bg-card shadow-xs data-[state=checked]:border-primary disabled:opacity-50", className)}
      {...props}
    >
      <RG.Indicator className="flex items-center justify-center">
        <span className="size-2 rounded-full bg-primary" />
      </RG.Indicator>
    </RG.Item>
  );
}
