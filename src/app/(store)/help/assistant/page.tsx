import type { Metadata } from "next";
import { Bot, Info } from "lucide-react";

export const metadata: Metadata = { title: "About the shopping assistant" };

const EXAMPLES: [string, string][] = [
  ["Show me smartphones under 30,000 rupees with good ratings", "{ category: smartphones, maxPrice: 30000, minRating: 4 }"],
  ["Headphones under ₹5k", "{ category: headphones, maxPrice: 5000 }"],
  ["Show me something cheaper", "keeps category, lowers maxPrice to the median of what was shown"],
  ["Something with better ratings", "keeps category + price, raises minRating"],
  ["Only in blue", "adds colour: Blue to the current filters"],
  ["More like the second one", "runs the Similar Products strategy seeded with result #2"],
  ["Never mind, show me laptops instead", "resets category, keeps general preferences where they still fit"],
];

export default function AssistantHelpPage() {
  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"><Bot className="size-3.5" /> Rule-based / Mock AI</p>
        <h1 className="text-3xl font-bold tracking-tight">How the shopping assistant works</h1>
        <p className="text-muted-foreground">The ShopSphere assistant is a <strong>rule-based</strong> assistant. It does <strong>not</strong> use a large language model or send your messages to any AI service. It understands shopping requests using keyword, pattern and entity matching, turns them into structured filters, and runs those filters through the same search and recommendation services the rest of the store uses.</p>
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What it understands</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Product types (phones, headphones, laptops, shoes, perfumes, bags, watches…)</li>
          <li>Budgets: “under ₹5,000”, “below 30k”, “between 2000 and 5000”, “around 10,000”</li>
          <li>Ratings: “good ratings” (4★+), “best rated” (4.5★+), “4 stars and up”</li>
          <li>Colours (“in blue”), brands (“Apple”, “Nike”), and men’s / women’s</li>
          <li>Follow-ups that refine the previous request without repeating it</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Examples</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="p-3">You say</th><th className="p-3">It understands</th></tr></thead>
            <tbody>{EXAMPLES.map(([a, b]) => <tr key={a} className="border-b last:border-0"><td className="p-3">“{a}”</td><td className="p-3 font-mono text-xs text-muted-foreground">{b}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <p className="flex items-start gap-2 rounded-lg bg-muted p-4 text-sm"><Info className="mt-0.5 size-4 shrink-0" />If a message can’t be understood confidently, the assistant asks a clarifying question instead of guessing. Conversation history is kept only for your current browser session.</p>
    </div>
  );
}
