"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Eye, Heart, RotateCcw, Search, ShoppingCart, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { getSignalProfile } from "@/services/recommendations/recommendation.service";
import { DEFAULT_WEIGHTS } from "@/services/recommendations/engine/scoring";
import { SIGNAL_WEIGHTS } from "@/services/recommendations/engine/signals";
import { useRecommendationContext } from "../hooks/useRecommendationContext";
import { useSignalsStore } from "@/store/signals.store";
import { useCategories } from "@/features/products/hooks/useCategories";
import { RecommendationRail } from "./recommendation-rail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, formatPrice } from "@/lib/format";
import { truncate } from "@/utils/text";

function Affinity({ title, map, label, empty }: { title: string; map: Record<string, number>; label: (k: string) => string; empty: string }) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      {entries.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="space-y-2">
          {entries.map(([k, v]) => (
            <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className="truncate">{label(k)}</span>
              <span className="text-xs text-muted-foreground">{formatPercent(v)}</span>
              <Progress value={v * 100} className="col-span-2 h-1.5" label={`${label(k)} affinity`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Personalization transparency (PRD §5.7): shows, in plain language, which
 * signals drive recommendations, and lets the customer reset them.
 */
export function PreferencesPanel() {
  const { context, signals, isLoading } = useRecommendationContext();
  const { nameOf } = useCategories();
  const reset = useSignalsStore((s) => s.resetSignals);
  const clearSearch = useSignalsStore((s) => s.clearSearchHistory);
  const profile = useMemo(() => (context ? getSignalProfile(context) : null), [context]);
  const byId = useMemo(() => new Map((context?.catalog ?? []).map((p) => [p.id, p])), [context]);
  const pick = (ids: number[]) => ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);

  if (isLoading || !profile) return <Skeleton className="h-96 w-full rounded-xl" />;
  const viewed = pick(profile.viewedIds);

  const sources = [
    { icon: Eye, label: "Products viewed", value: profile.viewedIds.length },
    { icon: Search, label: "Searches", value: signals.searchHistory.length },
    { icon: Heart, label: "Wishlist items", value: profile.wishlistIds.length },
    { icon: ShoppingCart, label: "Cart items", value: profile.cartIds.length },
    { icon: Wallet, label: "Purchased items", value: profile.purchasedIds.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommendation preferences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> What we know</CardTitle>
          <CardDescription>
            {profile.totalSignals === 0 ? "No signals yet — you’re seeing popular products until you browse." : (
              <>Personalization confidence: <strong className="text-foreground">{formatPercent(profile.confidence)}</strong>{profile.confidence < 1 && " · with few signals we blend in popular products so one page view doesn’t over-steer your feed."}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {sources.map(({ icon: Icon, label, value }) => (
              <li key={label} className="rounded-lg border p-3 text-center">
                <Icon className="mx-auto size-4 text-primary" aria-hidden />
                <p className="mt-1 text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </li>
            ))}
          </ul>
          <div className="space-y-3 rounded-lg bg-muted/60 p-4 text-sm">
            <p><span className="font-semibold">Because you viewed:</span> {viewed.length ? viewed.slice(0, 4).map((p) => truncate(p.title, 30)).join(", ") : "nothing yet"}</p>
            <p><span className="font-semibold">Your typical price range:</span> {profile.priceBand ? `${formatPrice(profile.priceBand.min)} – ${formatPrice(profile.priceBand.max)} (median ${formatPrice(profile.priceBand.median)})` : "not enough data yet"}</p>
            <p><span className="font-semibold">Recent searches:</span> {signals.searchHistory.length ? signals.searchHistory.slice(0, 5).join(", ") : "none"}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Affinity title="Preferred categories" map={profile.categoryAffinity} label={nameOf} empty="Browse a few products to build this." />
            <Affinity title="Preferred brands" map={profile.brandAffinity} label={(k) => k} empty="No brand preference yet." />
            <Affinity title="Interests (tags)" map={profile.tagAffinity} label={(k) => k} empty="No interests detected yet." />
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => { reset(); toast.success("Browsing and search signals cleared"); }}><RotateCcw /> Reset browsing signals</Button>
            <Button variant="ghost" onClick={() => { clearSearch(); toast.success("Search history cleared"); }}>Clear search history</Button>
            <Button variant="ghost" asChild><Link href="/account/recently-viewed">Manage viewed items</Link></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How scoring works</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ul className="space-y-1.5 text-sm">
            {Object.entries(DEFAULT_WEIGHTS).map(([k, w]) => (
              <li key={k} className="flex justify-between gap-3"><span className="font-mono text-xs">{k}</span><span className="text-muted-foreground">× {w.toFixed(2)}</span></li>
            ))}
          </ul>
          <ul className="space-y-1.5 text-sm">
            <li className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Signal strength</li>
            <li className="flex justify-between"><span>Product view</span><span className="text-muted-foreground">{SIGNAL_WEIGHTS.view} (decays ×{SIGNAL_WEIGHTS.decay} per older view)</span></li>
            <li className="flex justify-between"><span>Wishlist</span><span className="text-muted-foreground">{SIGNAL_WEIGHTS.wishlist}</span></li>
            <li className="flex justify-between"><span>Cart</span><span className="text-muted-foreground">{SIGNAL_WEIGHTS.cart}</span></li>
            <li className="flex justify-between"><span>Purchase</span><span className="text-muted-foreground">{SIGNAL_WEIGHTS.purchase}</span></li>
            <li className="flex justify-between"><span>Search term</span><span className="text-muted-foreground">{SIGNAL_WEIGHTS.search}</span></li>
          </ul>
        </CardContent>
      </Card>

      <RecommendationRail request={{ strategy: "personalized", limit: 12 }} options={{ fallback: "trending" }} />
    </div>
  );
}
