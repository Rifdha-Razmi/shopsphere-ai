"use client";

import { useCallback, useState } from "react";
import type { ChatMessage } from "@/types";
import { getAssistantProvider } from "@/services/assistant/provider";
import { useAssistantStore } from "@/store/assistant.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useRecommendationContext } from "@/features/recommendations/hooks/useRecommendationContext";
import { createId } from "@/utils/id";

/** Bridges the chat UI and the Assistant Provider (rule-based today). */
export function useAssistant() {
  const { products } = useCatalog();
  const { context: recContext } = useRecommendationContext();
  const { messages, context, append, remove, setContext, reset } = useAssistantStore();
  const [pending, setPending] = useState(false);

  const send = useCallback(
    async (text: string, opts: { retryOf?: string } = {}) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      if (opts.retryOf) remove(opts.retryOf);
      else append({ id: createId("msg"), role: "user", text: trimmed, createdAt: Date.now() });
      setPending(true);
      try {
        if (!recContext || products.length === 0) throw new Error("catalog-unavailable");
        const reply = await getAssistantProvider().respond({ text: trimmed, context, catalog: products, recommendationContext: recContext });
        append({
          id: createId("msg"),
          role: "assistant",
          text: reply.text,
          appliedFilters: reply.appliedFilters,
          productIds: reply.productIds,
          suggestions: reply.suggestions,
          createdAt: Date.now(),
          status: "ok",
        });
        setContext(reply.context);
      } catch {
        // Conversation history is preserved; the error bubble offers a retry (PRD §16.1).
        const errorMessage: ChatMessage = {
          id: createId("err"),
          role: "assistant",
          text: "Sorry — I couldn't reach the product catalogue just now.",
          createdAt: Date.now(),
          status: "error",
          suggestions: [trimmed],
        };
        append(errorMessage);
      } finally {
        setPending(false);
      }
    },
    [pending, recContext, products, context, append, remove, setContext],
  );

  return { messages, pending, send, reset, ready: products.length > 0 };
}
