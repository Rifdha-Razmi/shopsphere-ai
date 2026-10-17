"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, INDIAN_STATES, type AddressValues } from "@/lib/validation";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, type ReactNode } from "react";

export const EMPTY_ADDRESS: AddressValues = { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

/** Shared address form (checkout + account). Watches changes so drafts can be persisted. */
export function AddressForm({ defaultValues, onSubmit, submitLabel, onChange, extra, onCancel, idPrefix = "addr" }: { defaultValues: AddressValues; onSubmit: (v: AddressValues) => void; submitLabel: string; onChange?: (v: AddressValues) => void; extra?: ReactNode; onCancel?: () => void; idPrefix?: string }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues, mode: "onTouched" });
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    // Persist drafts as the customer types (MOD-06-002: refresh restores entered data).
    const sub = watch((v) => onChangeRef.current?.({ ...EMPTY_ADDRESS, ...(v as AddressValues) }));
    return () => sub.unsubscribe();
  }, [watch]);
  const id = (f: string) => `${idPrefix}-${f}`;
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_2fr]">
        <FormField id={id("label")} label="Label" error={errors.label?.message} required>
          <Input {...fieldA11y(id("label"), errors.label?.message)} placeholder="Home / Work" {...register("label")} />
        </FormField>
        <FormField id={id("fullName")} label="Recipient name" error={errors.fullName?.message} required>
          <Input {...fieldA11y(id("fullName"), errors.fullName?.message)} autoComplete="name" {...register("fullName")} />
        </FormField>
      </div>
      <FormField id={id("phone")} label="Mobile number" error={errors.phone?.message} required>
        <Input {...fieldA11y(id("phone"), errors.phone?.message)} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" {...register("phone")} />
      </FormField>
      <FormField id={id("line1")} label="Flat, house no., street" error={errors.line1?.message} required>
        <Input {...fieldA11y(id("line1"), errors.line1?.message)} autoComplete="address-line1" {...register("line1")} />
      </FormField>
      <FormField id={id("line2")} label="Area, landmark (optional)" error={errors.line2?.message}>
        <Input {...fieldA11y(id("line2"), errors.line2?.message)} autoComplete="address-line2" {...register("line2")} />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField id={id("city")} label="City" error={errors.city?.message} required>
          <Input {...fieldA11y(id("city"), errors.city?.message)} autoComplete="address-level2" {...register("city")} />
        </FormField>
        <FormField id={id("state")} label="State" error={errors.state?.message} required>
          <NativeSelect {...fieldA11y(id("state"), errors.state?.message)} {...register("state")}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
        </FormField>
        <FormField id={id("pincode")} label="Pincode" error={errors.pincode?.message} required>
          <Input {...fieldA11y(id("pincode"), errors.pincode?.message)} inputMode="numeric" maxLength={6} autoComplete="postal-code" {...register("pincode")} />
        </FormField>
      </div>
      {extra}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" size="lg">{submitLabel}</Button>
      </div>
    </form>
  );
}
