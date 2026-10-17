"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailSchema } from "@/lib/validation";

const COLUMNS = [
  { title: "Shop", links: [{ href: "/products", label: "All products" }, { href: "/category/smartphones", label: "Smartphones" }, { href: "/category/laptops", label: "Laptops" }, { href: "/category/fragrances", label: "Fragrances" }, { href: "/compare", label: "Compare" }] },
  { title: "Account", links: [{ href: "/account", label: "My account" }, { href: "/account/orders", label: "Orders & tracking" }, { href: "/wishlist", label: "Wishlist" }, { href: "/account/preferences", label: "Recommendation preferences" }] },
  { title: "Help", links: [{ href: "/help/assistant", label: "About the AI assistant" }, { href: "/policies/shipping", label: "Shipping policy" }, { href: "/policies/returns", label: "Returns & refunds" }, { href: "/policies/privacy", label: "Privacy policy" }, { href: "/policies/terms", label: "Terms of use" }] },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <footer className="mt-16 bg-[linear-gradient(160deg,oklch(0.27_0.11_275),oklch(0.33_0.15_280)_60%,oklch(0.38_0.17_295))] text-white">
      <div className="container-page grid grid-cols-1 gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)_1.6fr]">
        <div className="space-y-3">
          <Logo className="text-white" />
          <p className="max-w-xs text-sm text-white/70">Personalized shopping, powered by intelligence.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold text-white">{col.title}</h2>
            <ul className="space-y-2 text-sm text-white/70">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div>
          <h2 className="mb-1 text-sm font-semibold text-white">Newsletter</h2>
          <p className="mb-3 text-sm text-white/70">Deals and new arrivals, once a week.</p>
          <form
            noValidate
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = emailSchema.safeParse(email);
              if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
              setError(null);
              setEmail("");
              toast.success("You're subscribed!");
            }}
          >
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <Input id="newsletter-email" type="email" placeholder="you@example.com" className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-visible:border-white/40" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "newsletter-error" : undefined} />
            <Button type="submit" variant="accent">Subscribe</Button>
          </form>
          {error && <p id="newsletter-error" className="mt-1.5 text-xs text-[oklch(0.82_0.12_25)]">{error}</p>}
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/15">
        <div className="container-page py-5 text-xs text-white/60">
          <p>© {new Date().getFullYear()} ShopSphere AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
