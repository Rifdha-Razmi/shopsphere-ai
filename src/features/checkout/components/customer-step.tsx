"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerInfoSchema, type CustomerInfoValues } from "@/lib/validation";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CustomerStep({ defaultValues, onSubmit }: { defaultValues: CustomerInfoValues; onSubmit: (v: CustomerInfoValues) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerInfoValues>({ resolver: zodResolver(customerInfoSchema), defaultValues, mode: "onTouched" });
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <h2 className="text-lg font-semibold">Contact information</h2>
      <FormField id="fullName" label="Full name" error={errors.fullName?.message} required>
        <Input {...fieldA11y("fullName", errors.fullName?.message)} autoComplete="name" {...register("fullName")} />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="checkout-email" label="Email" error={errors.email?.message} required>
          <Input {...fieldA11y("checkout-email", errors.email?.message)} type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField id="checkout-phone" label="Mobile number" error={errors.phone?.message} hint="For delivery updates (simulated)" required>
          <Input {...fieldA11y("checkout-phone", errors.phone?.message, true)} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" {...register("phone")} />
        </FormField>
      </div>
      <div className="flex justify-end"><Button type="submit" size="lg">Continue to address</Button></div>
    </form>
  );
}
