"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterValues } from "@/lib/validation";
import { safeNext } from "@/lib/safe-redirect";
import { homeForRole } from "@/lib/role-routing";
import { goTo } from "./login-form";
import { AuthError } from "@/services/auth/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const registerUser = useAuthStore((s) => s.register);
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "", acceptTerms: false },
  });

  const onSubmit = async ({ confirmPassword: _c, acceptTerms: _a, ...values }: RegisterValues) => {
    try {
      const user = await registerUser(values);
      toast.success(`Welcome to ShopSphere, ${user.firstName}!`);
      goTo(homeForRole(user.role, next));
    } catch (error) {
      if (error instanceof AuthError && error.field === "email") setError("email", { message: error.message });
      else setError("root", { message: "We couldn’t create your account. Please try again." });
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {errors.root && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.root.message}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="firstName" label="First name" error={errors.firstName?.message} required>
          <Input {...fieldA11y("firstName", errors.firstName?.message)} autoComplete="given-name" {...register("firstName")} />
        </FormField>
        <FormField id="lastName" label="Last name" error={errors.lastName?.message} required>
          <Input {...fieldA11y("lastName", errors.lastName?.message)} autoComplete="family-name" {...register("lastName")} />
        </FormField>
      </div>
      <FormField id="email" label="Email" error={errors.email?.message} required>
        <Input {...fieldA11y("email", errors.email?.message)} type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
      </FormField>
      <FormField id="phone" label="Mobile number" error={errors.phone?.message} required>
        <Input {...fieldA11y("phone", errors.phone?.message, true)} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} {...register("phone")} />
      </FormField>
      <FormField id="password" label="Password" error={errors.password?.message} hint="8+ characters with upper & lower case letters and a number" required>
        <Input {...fieldA11y("password", errors.password?.message, true)} type="password" autoComplete="new-password" {...register("password")} />
      </FormField>
      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message} required>
        <Input {...fieldA11y("confirmPassword", errors.confirmPassword?.message)} type="password" autoComplete="new-password" {...register("confirmPassword")} />
      </FormField>
      <div className="grid gap-1">
        <div className="flex items-start gap-2">
          <Controller control={control} name="acceptTerms" render={({ field }) => <Checkbox id="acceptTerms" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={!!errors.acceptTerms} aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined} className="mt-0.5" />} />
          <Label htmlFor="acceptTerms" className="text-sm leading-snug font-normal">
            I agree to the <Link href="/policies/terms" className="text-primary underline">Terms of use</Link> and <Link href="/policies/privacy" className="text-primary underline">Privacy policy</Link>.
          </Label>
        </div>
        {errors.acceptTerms && <p id="acceptTerms-error" className="text-xs font-medium text-destructive">{errors.acceptTerms.message}</p>}
      </div>
      <Button type="submit" size="lg" loading={isSubmitting}>Create account</Button>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">Sign in</Link></p>
    </form>
  );
}
