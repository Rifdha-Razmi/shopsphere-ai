"use client";

import dynamic from "next/dynamic";

/**
 * Non-critical overlays are code-split and loaded after hydration (PRD §12):
 * they never block the first render of a page.
 */
const AssistantPanel = dynamic(() => import("@/features/ai-assistant/components/assistant-panel").then((m) => m.AssistantPanel), { ssr: false });
const QuickViewDialog = dynamic(() => import("@/features/products/components/quick-view-dialog").then((m) => m.QuickViewDialog), { ssr: false });
const CompareBar = dynamic(() => import("@/features/products/components/compare-bar").then((m) => m.CompareBar), { ssr: false });

export function LazyOverlays() {
  return (
    <>
      <CompareBar />
      <QuickViewDialog />
      <AssistantPanel />
    </>
  );
}
