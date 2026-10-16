"use client";

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { STRATEGY_LABELS } from "@/types";
import { useAnalyticsStore } from "@/store/analytics.store";
import { combine, seedCounters, summarize } from "@/services/analytics/analytics.service";
import { formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "./admin-shell";
import { BarList, StatCard } from "./bar-list";

/** Recommendation analytics (PRD §8.4) — local + seeded data, clearly labelled. */
export function AnalyticsView() {
  const live = useAnalyticsStore((s) => s.counters);
  const reset = useAnalyticsStore((s) => s.reset);
  const total = useMemo(() => summarize(combine(seedCounters(), live)), [live]);

  return (
    <>
      <AdminPageHeader
        title="Recommendation analytics"
        scope="analytics"
        actions={<Button variant="outline" size="sm" onClick={() => { reset(); toast.success("Analytics events reset"); }}><RotateCcw /> Reset events</Button>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recommendation impressions" value={total.impressions.toLocaleString("en-IN")} hint="Rails shown to shoppers" />
        <StatCard label="Recommendation clicks" value={total.clicks.toLocaleString("en-IN")} hint="Recommended products opened" />
        <StatCard label="Click-through rate" value={formatPercent(total.ctr, 1)} hint="clicks ÷ impressions" />
        <StatCard label="Recommendation conversion" value={formatPercent(total.conversion, 1)} hint="add-to-cart ÷ clicks (simulated)" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Clicks by strategy</CardTitle></CardHeader>
          <CardContent><BarList caption="Share of clicks by strategy" items={total.byStrategy.map((r) => ({ label: STRATEGY_LABELS[r.strategy], value: r.engagementShare, hint: `${r.clicks} clicks` }))} format={(v) => formatPercent(v, 1)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Click-through rate by strategy</CardTitle></CardHeader>
          <CardContent><BarList caption="CTR by strategy" items={[...total.byStrategy].sort((a, b) => b.ctr - a.ctr).map((r) => ({ label: STRATEGY_LABELS[r.strategy], value: r.ctr }))} format={(v) => formatPercent(v, 1)} /></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>All strategies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Strategy</TableHead><TableHead className="text-right">Impressions</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="text-right">CTR</TableHead><TableHead className="text-right">Add to cart</TableHead><TableHead className="text-right">Conversion</TableHead></TableRow></TableHeader>
            <TableBody>
              {total.byStrategy.map((r) => (
                <TableRow key={r.strategy}>
                  <TableCell className="font-medium">{STRATEGY_LABELS[r.strategy]}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.impressions.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.clicks.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(r.ctr, 1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.addToCart.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(r.conversion, 1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
