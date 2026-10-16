"use client";

import { useState } from "react";
import { MapPin, Truck } from "lucide-react";
import { estimateDelivery, type DeliveryEstimate } from "@/services/delivery/delivery.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { safeGet, safeSet } from "@/utils/storage";

/** Simulated pincode-based delivery estimate (MOD-04). */
export function DeliveryCheck() {
  const [pin, setPin] = useState(() => safeGet<string>("ss-pincode", ""));
  const [result, setResult] = useState<DeliveryEstimate | null>(() => (pin ? estimateDelivery(pin) : null));
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-primary" /> Delivery</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const r = estimateDelivery(pin.trim());
          setResult(r);
          if (r.serviceable) safeSet("ss-pincode", pin.trim());
        }}
      >
        <label htmlFor="pincode" className="sr-only">Pincode</label>
        <Input id="pincode" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit pincode" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} aria-describedby="pincode-result" />
        <Button type="submit" variant="outline">Check</Button>
      </form>
      <div id="pincode-result" aria-live="polite" className="text-sm">
        {result &&
          (result.serviceable ? (
            <div className="space-y-1">
              <p className="flex items-center gap-2 font-medium text-success"><Truck className="size-4" /> {result.message}</p>
              <p className="text-xs text-muted-foreground">
                {result.isMetro ? "Metro pincode" : "Standard zone"} · {result.minDays}–{result.maxDays} business days{result.sameDayAvailable ? " · Same-day available" : ""} · Cash on delivery available
              </p>
            </div>
          ) : (
            <p className="text-destructive">{result.message}</p>
          ))}
      </div>
    </div>
  );
}
