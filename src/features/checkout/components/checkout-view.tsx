"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard, FlaskConical, Lock, MapPin, Pencil, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { DeliveryMethodId, PaymentMethodId } from "@/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCartView } from "@/features/cart/hooks/useCartView";
import { CouponInput } from "@/features/cart/components/coupon-input";
import { OrderSummaryRows } from "@/features/cart/components/order-summary";
import { useCheckoutStore, type CheckoutStep, type MockCardScenario, type MockUpiHandle } from "@/store/checkout.store";
import { useAccountStore } from "@/store/account.store";
import { useCartStore } from "@/store/cart.store";
import { useOrdersStore } from "@/store/orders.store";
import { useHydrated } from "@/store/hydration.store";
import { availableDeliveryMethods, deliveryMethod } from "@/services/delivery/delivery.service";
import { buildOrder, simulatePayment, type PaymentInput } from "@/services/checkout/checkout.service";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { EmptyState } from "@/components/common/state-views";
import { ProductImage } from "@/components/common/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressForm, EMPTY_ADDRESS } from "./address-form";
import { CheckoutStepper } from "./checkout-steps";
import { CustomerStep } from "./customer-step";
import { cn } from "@/lib/cn";

const NO_ADDRESSES: never[] = [];
const PAYMENT_ICONS: Record<PaymentMethodId, typeof CreditCard> = { "mock-card": CreditCard, "mock-upi": Smartphone, "mock-cod": Wallet };

/** Multi-step simulated checkout (MOD-06). State persists across refresh and session expiry. */
export function CheckoutView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { user } = useAuth();
  const checkout = useCheckoutStore();
  const delivery = deliveryMethod(checkout.deliveryId);
  const view = useCartView(delivery.cost);
  const couponCode = useCartStore((s) => s.couponCode);
  const removeOrdered = useCartStore((s) => s.removeOrdered);
  const placeOrder = useOrdersStore((s) => s.place);
  const addresses = useAccountStore((s) => (user ? s.addresses[user.id] : undefined)) ?? NO_ADDRESSES;
  const addAddress = useAccountStore((s) => s.addAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [paying, setPaying] = useState(false);

  // A different account resumed checkout on this device → start fresh for them.
  useEffect(() => {
    if (hydrated && user && checkout.ownerId !== user.id) checkout.reset(user.id);
  }, [hydrated, user, checkout]);

  if (!hydrated || !user || view.isLoading) {
    return <div className="space-y-4" role="status" aria-label="Loading checkout"><Skeleton className="h-10 w-full" /><Skeleton className="h-80 w-full rounded-xl" /></div>;
  }

  if (view.isEmpty) {
    return <EmptyState title="Your cart is empty" description="Add something to your cart before checking out." action={{ label: "Continue shopping", href: "/products" }} />;
  }
  if (view.nothingSelected) {
    return <EmptyState title="No items selected" description="Tick the items you want to buy in your cart." action={{ label: "Back to cart", href: "/cart" }} />;
  }

  const step = checkout.step;
  const go = (s: CheckoutStep) => {
    checkout.setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pay = async () => {
    if (view.blocked) {
      toast.error("Some items in your cart need attention.");
      return router.push("/cart");
    }
    const { method, cardScenario, upiHandle } = checkout.payment;
    const input: PaymentInput = method === "mock-card" ? { method, scenario: cardScenario } : method === "mock-upi" ? { method, handle: upiHandle } : { method };
    setPaying(true);
    const result = await simulatePayment(input);
    setPaying(false);
    if (!result.ok) {
      // Edge case 14: failure keeps the customer on the payment step only.
      checkout.setPaymentError(result.message);
      return;
    }
    const order = buildOrder({
      user,
      customer: checkout.customer!,
      address: checkout.address!,
      deliveryId: checkout.deliveryId,
      payment: { method, reference: result.reference },
      // Only the items ticked in the cart are ordered.
      lines: view.selectedLines.map((l) => ({ item: l.item, price: l.price, title: l.product?.title ?? l.item.snapshot.title, thumbnail: l.product?.thumbnail ?? l.item.snapshot.thumbnail })),
      totals: view.totals,
      couponCode,
    });
    placeOrder(order);
    removeOrdered(view.selectedLines.map((l) => l.item.key));
    checkout.reset(user.id);
    router.replace(`/checkout/confirmation/${order.id}`);
  };

  const pincode = checkout.address?.pincode ?? null;
  const methods = availableDeliveryMethods(pincode && /^[1-9]\d{5}$/.test(pincode) ? pincode : null);

  return (
    <div className="space-y-6">
      <CheckoutStepper step={step} onJump={go} />
      {view.blocked && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" /> Some items in your cart changed (stock or price). Review your cart before paying.</span>
          <Button size="sm" variant="outline" asChild><Link href="/cart">Review cart</Link></Button>
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent className="p-5 sm:p-6">
            {step === 0 && (
              <CustomerStep
                defaultValues={checkout.customer ?? { fullName: `${user.firstName} ${user.lastName}`.trim(), email: user.email, phone: /^[6-9]\d{9}$/.test(user.phone) ? user.phone : "" }}
                onSubmit={(v) => {
                  checkout.setCustomer(v);
                  go(1);
                }}
              />
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Shipping address</h2>
                {addresses.length > 0 && !useNewAddress ? (
                  <div className="space-y-4">
                    <RadioGroup
                      value={checkout.savedAddressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0].id}
                      onValueChange={(id) => {
                        const a = addresses.find((x) => x.id === id)!;
                        checkout.setAddress({ label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode }, a.id);
                      }}
                      aria-label="Saved addresses"
                    >
                      {addresses.map((a) => (
                        <Label key={a.id} htmlFor={`a-${a.id}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                          <RadioGroupItem id={`a-${a.id}`} value={a.id} className="mt-0.5" />
                          <span className="text-sm leading-relaxed">
                            <span className="font-semibold">{a.label}</span>{a.isDefault && <span className="ml-2 text-xs text-primary">Default</span>}
                            <br />{a.fullName} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                    <div className="flex flex-wrap justify-between gap-2">
                      <Button variant="outline" onClick={() => setUseNewAddress(true)}><MapPin /> Use a new address</Button>
                      <Button
                        size="lg"
                        onClick={() => {
                          const id = checkout.savedAddressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0].id;
                          const a = addresses.find((x) => x.id === id)!;
                          checkout.setAddress({ label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode }, a.id);
                          go(2);
                        }}
                      >
                        Deliver here
                      </Button>
                    </div>
                  </div>
                ) : (
                  <AddressForm
                    idPrefix="checkout-addr"
                    defaultValues={checkout.address && !checkout.savedAddressId ? checkout.address : { ...EMPTY_ADDRESS, fullName: checkout.customer?.fullName ?? "", phone: checkout.customer?.phone ?? "" }}
                    onChange={(v) => checkout.setAddress(v, null)}
                    submitLabel="Continue to delivery"
                    onCancel={addresses.length ? () => setUseNewAddress(false) : undefined}
                    extra={
                      <div className="flex items-center gap-2">
                        <Checkbox id="save-address" checked={saveAddress} onCheckedChange={(v) => setSaveAddress(v === true)} />
                        <Label htmlFor="save-address" className="font-normal">Save this address to my account</Label>
                      </div>
                    }
                    onSubmit={(v) => {
                      const saved = saveAddress ? addAddress(user.id, v) : null;
                      checkout.setAddress(v, saved?.id ?? null);
                      setUseNewAddress(false);
                      go(2);
                    }}
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Delivery method</h2>
                <RadioGroup value={checkout.deliveryId} onValueChange={(v) => checkout.setDelivery(v as DeliveryMethodId)} aria-label="Delivery method">
                  {methods.map((m) => (
                    <Label key={m.id} htmlFor={`d-${m.id}`} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-4 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5", m.disabled && "cursor-not-allowed opacity-50")}>
                      <RadioGroupItem id={`d-${m.id}`} value={m.id} disabled={m.disabled} />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{m.label}</span>
                        <span className="block text-xs text-muted-foreground">{m.disabledReason ?? m.description}</span>
                      </span>
                      <span className="text-sm font-semibold">{m.cost ? `+ ${formatPrice(m.cost)}` : "Free"}</span>
                    </Label>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">Delivery speeds and costs are simulated.</p>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => go(1)}>Back</Button>
                  <Button size="lg" onClick={() => go(3)} disabled={methods.find((m) => m.id === checkout.deliveryId)?.disabled}>Review order</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Review your order</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-4 text-sm">
                    <div className="mb-1 flex items-center justify-between"><p className="font-semibold">Contact</p><button type="button" onClick={() => go(0)} className="text-xs text-primary hover:underline" aria-label="Edit contact"><Pencil className="inline size-3" /> Edit</button></div>
                    <p>{checkout.customer?.fullName}</p><p className="text-muted-foreground">{checkout.customer?.email} · {checkout.customer?.phone}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-sm">
                    <div className="mb-1 flex items-center justify-between"><p className="font-semibold">Ship to</p><button type="button" onClick={() => go(1)} className="text-xs text-primary hover:underline" aria-label="Edit address"><Pencil className="inline size-3" /> Edit</button></div>
                    <p>{checkout.address?.fullName}</p>
                    <p className="text-muted-foreground">{checkout.address?.line1}{checkout.address?.line2 ? `, ${checkout.address.line2}` : ""}, {checkout.address?.city}, {checkout.address?.state} {checkout.address?.pincode}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between"><p className="font-semibold">Delivery</p><button type="button" onClick={() => go(2)} className="text-xs text-primary hover:underline" aria-label="Edit delivery"><Pencil className="inline size-3" /> Edit</button></div>
                  <p>{delivery.label} — {delivery.description}</p>
                </div>
                <ul className="divide-y rounded-lg border" aria-label="Items">
                  {view.selectedLines.map((l) => (
                    <li key={l.item.key} className="flex items-center gap-3 p-3">
                      <span className="relative size-14 shrink-0 overflow-hidden rounded bg-white ring-1 ring-border"><ProductImage src={l.product?.thumbnail ?? l.item.snapshot.thumbnail} alt={l.item.snapshot.title} sizes="56px" /></span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="line-clamp-1 font-medium">{l.product?.title ?? l.item.snapshot.title}</span>
                        <span className="text-xs text-muted-foreground">{l.item.variantLabel ? `${l.item.variantLabel} · ` : ""}Qty {l.item.quantity} × {formatPrice(l.price)}</span>
                        {l.issue && <span className="block text-xs font-medium text-destructive">Needs attention in cart</span>}
                      </span>
                      <span className="text-sm font-semibold">{formatPrice(l.price * l.item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => go(2)}>Back</Button>
                  <Button size="lg" onClick={() => go(4)} disabled={view.blocked}>Continue to payment</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Payment</h2>
                <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <FlaskConical className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span><strong>TEST MODE.</strong> This is a sandboxed, simulated payment. No card numbers, CVVs, bank logins or UPI PINs are ever requested, and nothing is sent anywhere.</span>
                </p>
                {checkout.paymentError && (
                  <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="size-4" /> Payment failed</p>
                    <p>{checkout.paymentError}</p>
                    <p className="text-xs text-muted-foreground">Your order hasn’t been placed and you haven’t been charged. Choose a different test scenario below and retry.</p>
                  </div>
                )}
                <RadioGroup value={checkout.payment.method} onValueChange={(v) => checkout.setPayment({ method: v as PaymentMethodId })} aria-label="Payment method">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = PAYMENT_ICONS[m.id];
                    const selected = checkout.payment.method === m.id;
                    return (
                      <div key={m.id} className={cn("rounded-lg border", selected && "border-primary bg-primary/5")}>
                        <Label htmlFor={`pm-${m.id}`} className="flex cursor-pointer items-center gap-3 p-4 font-normal">
                          <RadioGroupItem id={`pm-${m.id}`} value={m.id} />
                          <Icon className="size-5 text-muted-foreground" aria-hidden />
                          <span>
                            <span className="block text-sm font-semibold">{m.label}</span>
                            <span className="block text-xs text-muted-foreground">{m.description}</span>
                          </span>
                        </Label>
                        {selected && m.id === "mock-card" && (
                          <div className="border-t px-4 py-3">
                            <Label htmlFor="card-scenario" className="mb-1.5 block text-xs">Test scenario</Label>
                            <NativeSelect id="card-scenario" value={checkout.payment.cardScenario} onChange={(e) => checkout.setPayment({ cardScenario: e.target.value as MockCardScenario })}>
                              <option value="success">Test card — payment succeeds</option>
                              <option value="declined">Test card — declined by bank</option>
                              <option value="insufficient-funds">Test card — insufficient funds</option>
                            </NativeSelect>
                          </div>
                        )}
                        {selected && m.id === "mock-upi" && (
                          <div className="border-t px-4 py-3">
                            <Label htmlFor="upi-handle" className="mb-1.5 block text-xs">Test UPI handle</Label>
                            <NativeSelect id="upi-handle" value={checkout.payment.upiHandle} onChange={(e) => checkout.setPayment({ upiHandle: e.target.value as MockUpiHandle })}>
                              <option value="success@mockupi">success@mockupi — approves</option>
                              <option value="failure@mockupi">failure@mockupi — rejects</option>
                            </NativeSelect>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => go(3)} disabled={paying}>Back</Button>
                  <Button size="lg" variant="accent" onClick={pay} loading={paying} disabled={view.blocked}>
                    <Lock /> {checkout.paymentError ? "Retry payment" : `Pay ${formatPrice(view.totals.total)}`} (test)
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {step <= 3 && <CouponInput subtotal={view.totals.subtotal} />}
            <OrderSummaryRows totals={view.totals} couponCode={couponCode} deliveryLabel={delivery.cost ? delivery.label : undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
