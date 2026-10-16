import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Review } from "@/types";
import { createId } from "@/utils/id";

type Vote = "up" | "down";

interface ReviewsState {
  local: Review[];
  /** `${voterId}:${reviewId}` -> vote. One vote per voter per review. */
  votes: Record<string, Vote>;
  /** Review ids hidden from the store by an admin (PRD §4.3 — admins moderate reviews). */
  hidden: string[];
  submit: (input: Omit<Review, "id" | "createdAt" | "helpful" | "notHelpful" | "source" | "verifiedPurchase">) => Review;
  update: (id: string, patch: Partial<Pick<Review, "rating" | "title" | "body">>) => void;
  remove: (id: string) => void;
  vote: (voterId: string, reviewId: string, vote: Vote) => void;
  /** Admin moderation: hide a review from the store, or show it again. */
  setHidden: (id: string, hidden: boolean) => void;
}

export const useReviewsStore = create<ReviewsState>()(
  persist(
    (set, get) => ({
      local: [],
      votes: {},
      hidden: [],

      submit: (input) => {
        const review: Review = { ...input, id: createId("rev"), createdAt: new Date().toISOString(), helpful: 0, notHelpful: 0, verifiedPurchase: false, source: "local" };
        set({ local: [review, ...get().local] });
        return review;
      },

      update: (id, patch) => set({ local: get().local.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),

      remove: (id) => set({ local: get().local.filter((r) => r.id !== id), hidden: get().hidden.filter((h) => h !== id) }),

      vote: (voterId, reviewId, vote) => {
        const key = `${voterId}:${reviewId}`;
        const votes = { ...get().votes };
        if (votes[key] === vote) delete votes[key];
        else votes[key] = vote;
        set({ votes });
      },

      setHidden: (id, hidden) => {
        const rest = get().hidden.filter((h) => h !== id);
        set({ hidden: hidden ? [...rest, id] : rest });
      },
    }),
    {
      name: "ss-reviews",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // v1 → v2: added admin moderation (`hidden`).
      migrate: (persisted) => ({ hidden: [], ...(persisted as Partial<ReviewsState>) }) as unknown as ReviewsState,
    },
  ),
);

/** Applies local helpful/not-helpful votes on top of base counts. */
export function withVotes(review: Review, votes: Record<string, Vote>): Review {
  let up = 0;
  let down = 0;
  for (const [key, v] of Object.entries(votes)) {
    if (!key.endsWith(`:${review.id}`)) continue;
    if (v === "up") up++;
    else down++;
  }
  return { ...review, helpful: review.helpful + up, notHelpful: review.notHelpful + down };
}
