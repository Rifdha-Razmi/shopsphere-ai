"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminStore } from "@/store/admin.store";
import { useCategories } from "@/features/products/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "./admin-shell";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CategoriesAdmin() {
  const { catalog } = useAdminData();
  const { categories } = useCategories();
  const { createCategory, renameCategory, assignCategory } = useAdminStore.getState();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ slug: string; name: string } | null>(null);
  const [assign, setAssign] = useState({ productId: "", category: "" });
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of catalog.products) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [catalog.products]);

  return (
    <>
      <AdminPageHeader title="Categories" scope="local" description={`${categories.length} categories`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead className="text-right">Products</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.slug}>
                    <TableCell>
                      {editing?.slug === c.slug ? (
                        <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (editing.name.trim().length < 2) return; renameCategory(c.slug, editing.name.trim()); setEditing(null); toast.success("Category renamed"); }}>
                          <Input aria-label="New category name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-8" autoFocus />
                          <Button size="icon-sm" type="submit" aria-label="Save name"><Check /></Button>
                          <Button size="icon-sm" type="button" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel"><X /></Button>
                        </form>
                      ) : <span className="font-medium">{c.name}</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                    <TableCell className="text-right tabular-nums">{counts.get(c.slug) ?? 0}</TableCell>
                    <TableCell className="text-right">{editing?.slug !== c.slug && <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ slug: c.slug, name: c.name })} aria-label={`Rename ${c.name}`}><Pencil /></Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Create category</CardTitle></CardHeader>
            <CardContent>
              <form
                noValidate
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const slug = slugify(name);
                  if (name.trim().length < 2) return setError("Name must be at least 2 characters.");
                  if (categories.some((c) => c.slug === slug)) return setError("A category with this name already exists.");
                  createCategory(slug, name.trim());
                  setName("");
                  setError(null);
                  toast.success(`Category “${name.trim()}” created`);
                }}
              >
                <Label htmlFor="new-cat">Name</Label>
                <Input id="new-cat" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "new-cat-error" : "new-cat-hint"} />
                {error ? <p id="new-cat-error" className="text-xs text-destructive">{error}</p> : <p id="new-cat-hint" className="text-xs text-muted-foreground">Slug: {slugify(name) || "—"}</p>}
                <Button type="submit"><Plus /> Create</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Assign product</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); if (!assign.productId || !assign.category) return; assignCategory(Number(assign.productId), assign.category); toast.success("Product reassigned"); setAssign({ productId: "", category: "" }); }}>
                <Label htmlFor="assign-product">Product</Label>
                <NativeSelect id="assign-product" value={assign.productId} onChange={(e) => setAssign({ ...assign, productId: e.target.value })}>
                  <option value="">Select a product</option>
                  {catalog.products.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.title}</option>)}
                </NativeSelect>
                <Label htmlFor="assign-category">Category</Label>
                <NativeSelect id="assign-category" value={assign.category} onChange={(e) => setAssign({ ...assign, category: e.target.value })}>
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </NativeSelect>
                <Button type="submit" disabled={!assign.productId || !assign.category}>Assign</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
