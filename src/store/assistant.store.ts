import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AssistantContext, ChatMessage } from "@/types";

/** Chat history and conversation context — session-scoped (sessionStorage), per PRD §7.2. */
interface AssistantState {
  messages: ChatMessage[];
  context: AssistantContext;
  append: (message: ChatMessage) => void;
  replace: (id: string, message: ChatMessage) => void;
  remove: (id: string) => void;
  setContext: (context: AssistantContext) => void;
  reset: () => void;
}

const emptyContext: AssistantContext = { intent: null, lastResultIds: [] };

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      messages: [],
      context: emptyContext,
      append: (message) => set({ messages: [...get().messages, message].slice(-60) }),
      replace: (id, message) => set({ messages: get().messages.map((m) => (m.id === id ? message : m)) }),
      remove: (id) => set({ messages: get().messages.filter((m) => m.id !== id) }),
      setContext: (context) => set({ context }),
      reset: () => set({ messages: [], context: emptyContext }),
    }),
    { name: "ss-assistant", version: 1, storage: createJSONStorage(() => sessionStorage), skipHydration: true },
  ),
);
