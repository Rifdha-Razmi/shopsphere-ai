"use client";

import { useState } from "react";
import { TicketPercent, X } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COUPONS } from "@/lib/constants";

export function CouponInput({ subtotal }: { subtotal: number }) {
  const applied = useCartStore((s) => s.couponCode);
  const apply = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCodes, setShowCodes] = useState(false);

  if (applied) {
    const coupon = COUPONS.find((c) => c.code === applied);
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <TicketPercent className="size-4 text-success" aria-hidden />
          <span><span className="font-semibold">{applied}</span> applied{coupon ? ` — ${coupon.description}` : ""}</span>
        </span>
        <button type="button" onClick={removeCoupon} className="rounded p-1 hover:bg-muted" aria-label={`Remove coupon ${applied}`}><X className="size-4" /></button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form
        noValidate
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) return setError("Enter a coupon code.");
          const result = apply(code, subtotal);
          if (result.ok) {
            setError(null);
            setCode("");
            toast.success(`Coupon ${result.coupon.code} applied`);
          } else setError(result.message);
        }}
      >
        <label htmlFor="coupon" className="sr-only">Coupon code</label>
        <Input id="coupon" placeholder="Coupon code" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }} aria-invalid={!!error} aria-describedby={error ? "coupon-error" : undefined} className="uppercase" maxLength={20} />
        <Button type="submit" variant="outline">Apply</Button>
      </form>
      {error && <p id="coupon-error" role="alert" className="text-xs font-medium text-destructive">{error}</p>}
      <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowCodes((s) => !s)} aria-expanded={showCodes}>
        {showCodes ? "Hide" : "View"} available test coupons
      </button>
      {showCodes && (
        <ul className="space-y-1 rounded-lg bg-muted p-3 text-xs">
          {COUPONS.map((c) => (
            <li key={c.code}><button type="button" className="font-mono font-semibold text-primary hover:underline" onClick={() => setCode(c.code)}>{c.code}</button> — {c.description}{new Date(c.expiresAt) < new Date() ? " (expired)" : ""}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
