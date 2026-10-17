import type { AssistantReply } from "@/types";
import { respond, type RespondInput } from "./assistant.service";

/**
 * Assistant Provider boundary (PRD §7.6). The rule-based provider is used
 * today. An LLM-backed provider would implement the same `AssistantProvider`
 * interface — called via a server route so no API key ever ships to the
 * browser — and the chat UI would not change.
 */
export interface AssistantProvider {
  readonly name: string;
  respond(input: RespondInput): Promise<AssistantReply>;
}

export class RuleBasedAssistantProvider implements AssistantProvider {
  readonly name = "rule-based";
  constructor(private readonly latencyMs = 450) {}

  async respond(input: RespondInput): Promise<AssistantReply> {
    // Small simulated latency so the loading state is realistic and testable.
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs));
    return respond(input);
  }
}

let provider: AssistantProvider = new RuleBasedAssistantProvider();

export function getAssistantProvider(): AssistantProvider {
  return provider;
}

export function setAssistantProvider(next: AssistantProvider): void {
  provider = next;
}
