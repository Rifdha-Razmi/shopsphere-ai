"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { toast } from "sonner";
import type { Review } from "@/types";
import { reviewSchema, type ReviewValues } from "@/lib/validation";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "@/lib/constants";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function StarInput({ value, onChange, invalid, describedBy }: { value: number; onChange: (v: number) => void; invalid?: boolean; describedBy?: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div role="radiogroup" aria-label="Your rating" aria-invalid={invalid || undefined} aria-describedby={describedBy} className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)); }
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)); }
          }}
          className="rounded p-0.5"
        >
          <Star className={cn("size-7 transition", (hover || value) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ defaultValues, onSubmit, onCancel, submitLabel = "Submit review" }: { defaultValues?: Partial<ReviewValues>; onSubmit: (values: ReviewValues) => void; onCancel?: () => void; submitLabel?: string }) {
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, title: "", body: "", ...defaultValues },
  });
  const body = watch("body") ?? "";

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit((v) => { onSubmit(v); })}>
      <FormField id="review-rating" label="Overall rating" error={errors.rating?.message} required>
        <Controller control={control} name="rating" render={({ field }) => <StarInput value={field.value} onChange={field.onChange} invalid={!!errors.rating} describedBy={errors.rating ? "review-rating-error" : undefined} />} />
      </FormField>
      <FormField id="review-title" label="Headline" error={errors.title?.message} required>
        <Input {...fieldA11y("review-title", errors.title?.message)} placeholder="Sum up your experience" maxLength={80} {...register("title")} />
      </FormField>
      <FormField id="review-body" label="Your review" error={errors.body?.message} hint={`${REVIEW_MIN_CHARS}–${REVIEW_MAX_CHARS} characters · ${body.trim().length} so far`} required>
        <Textarea {...fieldA11y("review-body", errors.body?.message, true)} rows={5} maxLength={REVIEW_MAX_CHARS} placeholder="What did you like or dislike? How did you use it?" {...register("body")} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

export function toastReviewSaved(review: Review, verified: boolean) {
  toast.success("Thanks for your review!", { description: verified ? "Marked as a verified purchase." : `Your ${review.rating}★ review is now live.` });
}
