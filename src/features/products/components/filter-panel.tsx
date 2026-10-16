"use client";

import { useId, useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { Availability, ProductFilters } from "@/types";
import type { Facets } from "@/services/catalog/filter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/format";

interface FilterPanelProps {
  filters: ProductFilters;
  facets: Facets;
  onChange: (next: ProductFilters) => void;
  categoryName: (slug: string) => string;
  showCategories?: boolean;
}

function PriceFilter({ filters, range, onChange }: { filters: ProductFilters; range: [number, number]; onChange: (min: number | null, max: number | null) => void }) {
  const [lo, hi] = range;
  const [draft, setDraft] = useState<[string, string]>([filters.minPrice?.toString() ?? "", filters.maxPrice?.toString() ?? ""]);
  const [slider, setSlider] = useState<[number, number]>([filters.minPrice ?? lo, filters.maxPrice ?? hi]);
  const id = useId();


  const commitInputs = () => {
    const min = draft[0] === "" ? null : Number(draft[0]);
    const max = draft[1] === "" ? null : Number(draft[1]);
    // Edge case 7: an inverted range is swapped automatically rather than producing a broken query.
    if (min !== null && max !== null && min > max) onChange(max, min);
    else onChange(Number.isFinite(min) ? min : null, Number.isFinite(max) ? max : null);
  };

  return (
    <div className="space-y-4">
      <Slider
        min={lo}
        max={Math.max(hi, lo + 1)}
        step={Math.max(1, Math.round((hi - lo) / 200))}
        value={slider}
        onValueChange={(v) => setSlider([v[0], v[1]])}
        onValueCommit={(v) => onChange(v[0] <= lo ? null : v[0], v[1] >= hi ? null : v[1])}
        thumbLabels={["Minimum price", "Maximum price"]}
        minStepsBetweenThumbs={1}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatPrice(slider[0])}</span>
        <span>{formatPrice(slider[1])}</span>
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          commitInputs();
        }}
      >
        <div className="grid flex-1 gap-1">
          <Label htmlFor={`${id}-min`} className="text-xs text-muted-foreground">Min ₹</Label>
          <Input id={`${id}-min`} inputMode="numeric" type="number" min={0} placeholder="0" value={draft[0]} onChange={(e) => setDraft([e.target.value, draft[1]])} onBlur={commitInputs} className="h-9" />
        </div>
        <span className="pb-2 text-muted-foreground">–</span>
        <div className="grid flex-1 gap-1">
          <Label htmlFor={`${id}-max`} className="text-xs text-muted-foreground">Max ₹</Label>
          <Input id={`${id}-max`} inputMode="numeric" type="number" min={0} placeholder="Any" value={draft[1]} onChange={(e) => setDraft([draft[0], e.target.value])} onBlur={commitInputs} className="h-9" />
        </div>
        <button type="submit" className="sr-only">Apply price</button>
      </form>
    </div>
  );
}

function CheckList({ name, items, selected, onToggle, label }: { name: string; items: { value: string; count: number }[]; selected: string[]; onToggle: (value: string) => void; label: (v: string) => string }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const filtered = useMemo(() => items.filter((i) => label(i.value).toLowerCase().includes(query.toLowerCase())), [items, query, label]);
  const visible = expanded || query ? filtered : filtered.slice(0, 8);
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{name}</legend>
      {items.length > 8 && <Input aria-label={`Search ${name.toLowerCase()}`} placeholder={`Search ${name.toLowerCase()}`} value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 text-xs" />}
      <ul className="space-y-1.5">
        {visible.map((item) => {
          const cid = `${id}-${item.value}`;
          return (
            <li key={item.value} className="flex items-center gap-2">
              <Checkbox id={cid} checked={selected.includes(item.value)} onCheckedChange={() => onToggle(item.value)} />
              <Label htmlFor={cid} className="flex flex-1 cursor-pointer justify-between gap-2 text-sm font-normal">
                <span className="line-clamp-1">{label(item.value)}</span>
                <span className="text-xs text-muted-foreground">{item.count}</span>
              </Label>
            </li>
          );
        })}
        {visible.length === 0 && <li className="text-xs text-muted-foreground">No matches</li>}
      </ul>
      {!query && filtered.length > 8 && (
        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? "Show less" : `Show all ${filtered.length}`}
        </button>
      )}
    </fieldset>
  );
}

/** Filter panel (MOD-02): price slider, rating floor, availability, on-sale, brand + category multi-select. */
export function FilterPanel({ filters, facets, onChange, categoryName, showCategories = true }: FilterPanelProps) {
  const toggle = (key: "brands" | "categories", value: string) => {
    const current = filters[key];
    onChange({ ...filters, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };
  const defaults = ["price", "rating", "availability", "brand", ...(showCategories ? ["category"] : [])];

  return (
    <Accordion type="multiple" defaultValue={defaults} className="w-full">
      {showCategories && facets.categories.length > 1 && (
        <AccordionItem value="category">
          <AccordionTrigger>Category</AccordionTrigger>
          <AccordionContent>
            <CheckList name="Categories" items={facets.categories} selected={filters.categories} onToggle={(v) => toggle("categories", v)} label={categoryName} />
          </AccordionContent>
        </AccordionItem>
      )}
      <AccordionItem value="price">
        <AccordionTrigger>Price</AccordionTrigger>
        <AccordionContent>
          <PriceFilter key={`${filters.minPrice}-${filters.maxPrice}-${facets.priceRange.join("-")}`} filters={filters} range={facets.priceRange} onChange={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="rating">
        <AccordionTrigger>Customer rating</AccordionTrigger>
        <AccordionContent>
          <RadioGroup value={String(filters.minRating ?? 0)} onValueChange={(v) => onChange({ ...filters, minRating: Number(v) || null })} aria-label="Minimum rating">
            {[4, 3, 2, 0].map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={String(r)} id={`rating-${r}`} />
                <Label htmlFor={`rating-${r}`} className="flex cursor-pointer items-center gap-1 font-normal">
                  {r ? (
                    <>
                      {r} <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden /> & up
                    </>
                  ) : (
                    "Any rating"
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="availability">
        <AccordionTrigger>Availability</AccordionTrigger>
        <AccordionContent className="space-y-4">
          <RadioGroup value={filters.availability} onValueChange={(v) => onChange({ ...filters, availability: v as Availability })} aria-label="Availability">
            {(
              [
                ["all", "All products"],
                ["in-stock", "In stock"],
                ["out-of-stock", "Out of stock"],
              ] as const
            ).map(([v, l]) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`avail-${v}`} />
                <Label htmlFor={`avail-${v}`} className="cursor-pointer font-normal">{l}</Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2.5">
            <Label htmlFor="on-sale" className="cursor-pointer">On sale only</Label>
            <Switch id="on-sale" checked={filters.onSale} onCheckedChange={(onSale) => onChange({ ...filters, onSale })} />
          </div>
        </AccordionContent>
      </AccordionItem>
      {facets.brands.length > 0 && (
        <AccordionItem value="brand">
          <AccordionTrigger>Brand</AccordionTrigger>
          <AccordionContent>
            <CheckList name="Brands" items={facets.brands} selected={filters.brands} onToggle={(v) => toggle("brands", v)} label={(v) => v} />
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
