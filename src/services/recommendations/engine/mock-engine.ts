import type { RecommendationContext, RecommendationProvider, RecommendationRequest, RecommendationResult, SignalProfile } from "@/types";
import { buildSignalProfile } from "./signals";
import { STRATEGIES, buildHelpers } from "./strategies";

/**
 * Mock Recommendation Engine — the rule-based implementation of the
 * RecommendationProvider contract. Pure and deterministic for a given context.
 */
export class MockRecommendationEngine implements RecommendationProvider {
  readonly name = "mock-rule-based";

  buildProfile(context: RecommendationContext): SignalProfile {
    return buildSignalProfile(context);
  }

  async recommend(request: RecommendationRequest, context: RecommendationContext): Promise<RecommendationResult> {
    const profile = this.buildProfile(context);
    const helpers = buildHelpers(context, profile);
    const result = STRATEGIES[request.strategy](request, context, profile, helpers);
    return { ...result, isFallback: false };
  }
}
