"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { adminProductSchema, type AdminProductValues } from "@/lib/validation";
import { useAdminStore } from "@/store/admin.store";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useProduct } from "@/features/products/hooks/useProduct";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { EmptyState } from "@/components/common/state-views";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeader } from "./admin-shell";

function Form({ defaultValues, onSubmit, submitLabel }: { defaultValues: AdminProductValues; onSubmit: (v: AdminProductValues) => void; submitLabel: string }) {
  const { categories } = useCategories();
  const { register, handleSubmit, setValue, formState: { errors, isDirty } } = useForm<AdminProductValues>({ resolver: zodResolver(adminProductSchema), defaultValues });
  // The category list can arrive after the form mounts; re-apply the product's category once its option exists.
  useEffect(() => {
    if (categories.length) setValue("category", defaultValues.category);
  }, [categories.length, defaultValues.category, setValue]);
  const num = { setValueAs: (v: string) => (v === "" ? undefined : Number(v)) };
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField id="ap-title" label="Title" error={errors.title?.message} required className="sm:col-span-2"><Input {...fieldA11y("ap-title", errors.title?.message)} {...register("title")} /></FormField>
      <FormField id="ap-brand" label="Brand" error={errors.brand?.message} required><Input {...fieldA11y("ap-brand", errors.brand?.message)} {...register("brand")} /></FormField>
      <FormField id="ap-category" label="Category" error={errors.category?.message} required>
        <NativeSelect {...fieldA11y("ap-category", errors.category?.message)} {...register("category")}><option value="">Select a category</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</NativeSelect>
      </FormField>
      <FormField id="ap-mrp" label="List price / MRP (₹)" error={errors.mrp?.message} required><Input type="number" inputMode="decimal" min={0} {...fieldA11y("ap-mrp", errors.mrp?.message)} {...register("mrp", num)} /></FormField>
      <FormField id="ap-price" label="Selling price (₹)" error={errors.price?.message} required><Input type="number" inputMode="decimal" min={0} {...fieldA11y("ap-price", errors.price?.message)} {...register("price", num)} /></FormField>
      <FormField id="ap-stock" label="Stock" error={errors.stock?.message} required><Input type="number" inputMode="numeric" min={0} {...fieldA11y("ap-stock", errors.stock?.message)} {...register("stock", num)} /></FormField>
      <FormField id="ap-desc" label="Description" error={errors.description?.message} required className="sm:col-span-2"><Textarea rows={5} {...fieldA11y("ap-desc", errors.description?.message)} {...register("description")} /></FormField>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={!isDirty}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function NewProductForm() {
  const router = useRouter();
  const create = useAdminStore((s) => s.createProduct);
  return (
    <>
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Products</Link>
      <AdminPageHeader title="Add product" scope="local" />
      <Card><CardContent className="pt-6">
        <Form
          submitLabel="Create product"
          defaultValues={{ title: "", brand: "", category: "", description: "", mrp: undefined as unknown as number, price: undefined as unknown as number, stock: 10 }}
          onSubmit={(v) => {
            const p = create(v);
            toast.success("Product created", { description: p.title });
            router.push(`/admin/products/${p.id}`);
          }}
        />
      </CardContent></Card>
    </>
  );
}

export function EditProductForm({ id }: { id: number }) {
  const state = useProduct(id);
  const edit = useAdminStore((s) => s.editProduct);
  return (
    <>
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Products</Link>
      {state.status === "loading" ? <Skeleton className="h-96 w-full rounded-xl" /> : state.status !== "ready" ? (
        <EmptyState title="Product not found" description="It may have been deleted or archived." action={{ label: "Back to products", href: "/admin/products" }} />
      ) : (
        <>
          <AdminPageHeader title={`Edit #${state.product.id}`} scope="local" description={state.product.title} actions={<Button variant="outline" asChild><Link href={`/product/${state.product.id}`}>View in store</Link></Button>} />
          <Card><CardContent className="pt-6">
            <Form
              key={state.product.id}
              submitLabel="Save changes"
              defaultValues={{ title: state.product.title, brand: state.product.brand, category: state.product.category, description: state.product.description, mrp: state.product.mrp, price: state.product.price, stock: state.product.stock }}
              onSubmit={(v) => {
                edit(state.product.id, v);
                toast.success("Changes saved");
              }}
            />
          </CardContent></Card>
        </>
      )}
    </>
  );
}
