"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Info, RefreshCw, RotateCcw, SendHorizontal, Sparkles, User } from "lucide-react";
import type { ChatMessage, Product } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/common/product-image";
import { RatingPill } from "@/components/common/rating-stars";
import { formatPrice } from "@/lib/format";
import { useUiStore } from "@/store/ui.store";
import { useHydrated } from "@/store/hydration.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { STARTER_PROMPTS } from "@/services/assistant/lexicon";
import { useAssistant } from "../hooks/useAssistant";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/auth/hooks/useAuth";

function InlineProduct({ product, index, onNavigate }: { product: Product; index: number; onNavigate: () => void }) {
  return (
    <li>
      <Link href={`/product/${product.id}`} onClick={onNavigate} className="flex gap-3 rounded-lg border bg-card p-2 transition hover:border-primary/40 hover:shadow-sm">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-white">
          <ProductImage src={product.thumbnail} alt={product.title} sizes="64px" />
          <span className="absolute top-0.5 left-0.5 rounded bg-foreground/80 px-1 text-[10px] font-bold text-background" aria-label={`Result ${index}`}>
            #{index}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-5 font-medium">{product.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
            <RatingPill rating={product.rating} />
          </span>
        </span>
      </Link>
    </li>
  );
}

function MessageBubble({ message, onSuggestion, onRetry, onNavigate }: { message: ChatMessage; onSuggestion: (s: string) => void; onRetry: (m: ChatMessage) => void; onNavigate: () => void }) {
  const { byId } = useCatalog();
  const isUser = message.role === "user";
  const products = (message.productIds ?? []).map((id) => byId.get(id)).filter((p): p is Product => !!p);

  return (
    <li className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground")} aria-hidden>
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser && "items-end")}>
        <p className="sr-only">{isUser ? "You said:" : "Assistant said:"}</p>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser ? "rounded-tr-sm bg-primary text-primary-foreground" : message.status === "error" ? "rounded-tl-sm border border-destructive/30 bg-destructive/5 text-foreground" : "rounded-tl-sm bg-muted",
          )}
        >
          {message.text}
          {message.status === "error" && (
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onRetry(message)}>
              <RefreshCw /> Retry
            </Button>
          )}
        </div>
        {!!message.appliedFilters?.length && (
          <ul className="flex flex-wrap gap-1" aria-label="Filters applied">
            {message.appliedFilters.map((f) => (
              <li key={f} className="rounded-full border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                {f}
              </li>
            ))}
          </ul>
        )}
        {products.length > 0 && (
          <ul className="grid w-full gap-2" aria-label="Suggested products">
            {products.map((p, i) => (
              <InlineProduct key={p.id} product={p} index={i + 1} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
        {message.status !== "error" && !!message.suggestions?.length && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((s) => (
              <button key={s} type="button" onClick={() => onSuggestion(s)} className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

/** AI Shopping Assistant panel (PRD §7.2). Rule-based — clearly labelled as such. */
export function AssistantPanel() {
  const hydrated = useHydrated();
  const open = useUiStore((s) => s.assistantOpen);
  const setOpen = useUiStore((s) => s.setAssistantOpen);
  // PRD §4.3: the shopping assistant is a customer feature (N/A for administrators).
  const { isAdmin } = useAuth();
  const { messages, pending, send, reset } = useAssistant();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending, open]);

  const submit = (text: string) => {
    if (!text.trim()) return;
    void send(text);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <>
      {hydrated && !open && !isAdmin && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-5 bottom-6 z-30 hidden size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition hover:scale-105 lg:flex"
          aria-label="Open AI shopping assistant"
          title="Ask AI"
        >
          <Sparkles className="size-6" />
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-full p-0 sm:max-w-md" onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
          <div className="flex items-center gap-3 border-b px-4 py-3 pr-12">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle>Shopping Assistant</SheetTitle>
              <SheetDescription className="text-xs">Rule-based assistant · no AI language model</SheetDescription>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon-sm" onClick={reset} aria-label="Start a new conversation">
                <RotateCcw />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted p-4 text-sm">
                  <p className="font-medium">Hi! Tell me what you’re shopping for.</p>
                  <p className="mt-1 text-muted-foreground">Mention a product type, a budget and a rating — then refine with “cheaper”, “better ratings” or “more like the second one”.</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Try asking</p>
                  <div className="grid gap-2">
                    {STARTER_PROMPTS.map((p) => (
                      <button key={p} type="button" onClick={() => submit(p)} className="rounded-lg border bg-card px-3 py-2 text-left text-sm hover:border-primary/40 hover:bg-primary/5">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    This assistant uses keyword and pattern matching to turn your message into filters.{" "}
                    <Link href="/help/assistant" className="text-primary underline" onClick={() => setOpen(false)}>
                      How it works
                    </Link>
                  </span>
                </p>
              </div>
            ) : (
              <ol className="space-y-4" role="log" aria-live="polite" aria-label="Conversation">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onSuggestion={submit} onRetry={(err) => void send(err.suggestions?.[0] ?? "", { retryOf: err.id })} onNavigate={() => setOpen(false)} />
                ))}
              </ol>
            )}
            {pending && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </span>
                <span className="flex gap-1 rounded-2xl bg-muted px-3 py-3" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </span>
                <span className="sr-only">Assistant is finding products…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5 focus-within:border-primary">
              <label htmlFor="assistant-input" className="sr-only">Message the shopping assistant</label>
              <textarea
                id="assistant-input"
                ref={inputRef}
                rows={1}
                maxLength={300}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                placeholder="e.g. headphones under ₹5,000"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
              />
              <Button type="submit" size="icon-sm" disabled={!input.trim() || pending} aria-label="Send message">
                <SendHorizontal />
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
