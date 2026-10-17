import type { RecommendationProvider } from "@/types";
import { MockRecommendationEngine } from "./engine/mock-engine";

/**
 * Provider boundary (PRD §6.4). This is the single swap point: an ML- or
 * LLM-backed provider implementing `RecommendationProvider` can be registered
 * here without any change to the service, hooks or UI.
 *
 *   setRecommendationProvider(new HttpRecommendationProvider("/api/recs"))
 */
let provider: RecommendationProvider = new MockRecommendationEngine();

export function getRecommendationProvider(): RecommendationProvider {
  return provider;
}

export function setRecommendationProvider(next: RecommendationProvider): void {
  provider = next;
}
