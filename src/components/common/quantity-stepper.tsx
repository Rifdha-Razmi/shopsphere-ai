"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface QuantityStepperProps {
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}

/** Quantity control bounded by available stock. Typed values are clamped by the caller. */
export function QuantityStepper({ value, max, min = 1, onChange, label, size = "md", disabled }: QuantityStepperProps) {
  const h = size === "sm" ? "h-8" : "h-10";
  return (
    <div className={cn("inline-flex items-center rounded-md border bg-card", h, disabled && "opacity-50")}>
      <button type="button" className={cn("flex items-center justify-center px-2.5 disabled:opacity-40", h)} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={`Decrease ${label}`}>
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="h-full w-11 border-x bg-transparent text-center text-sm font-medium [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
        }}
      />
      <button type="button" className={cn("flex items-center justify-center px-2.5 disabled:opacity-40", h)} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Increase ${label}`}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
