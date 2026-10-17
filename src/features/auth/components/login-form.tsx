"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Clock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { safeNext } from "@/lib/safe-redirect";
import { homeForRole } from "@/lib/role-routing";
import { AuthError } from "@/services/auth/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "../hooks/useAuth";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * After signing in we do a full navigation instead of a client transition:
 * the router may hold a prefetched "redirect to /login" for protected pages
 * from before the user was authenticated, and a fresh request lets the
 * proxy see the new session cookie.
 */
export function goTo(path: string) {
  window.location.replace(path);
}

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const expired = params.get("reason") === "expired";
  const login = useAuthStore((s) => s.login);
  const { ready, isAuthenticated, user: currentUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setError, setFocus, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });

  useEffect(() => {
    if (ready && isAuthenticated && currentUser && !isSubmitting) goTo(homeForRole(currentUser.role, next));
  }, [ready, isAuthenticated, currentUser, isSubmitting, next]);

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const user = await login(values.identifier, values.password);
      toast.success(`Welcome back, ${user.firstName}!`);
      goTo(homeForRole(user.role, next));
    } catch (error) {
      if (error instanceof AuthError && (error.field === "identifier" || error.field === "password")) {
        // Edge case 19: say exactly which field failed.
        setError(error.field, { message: error.message });
        setFocus(error.field);
      } else setFormError(error instanceof AuthError ? error.message : "Sign-in failed. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {expired && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Your session expired due to inactivity. Sign in again — we saved your progress and will bring you right back.
        </p>
      )}
      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </p>
      )}
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <FormField id="identifier" label="Email or username" error={errors.identifier?.message} required>
          <Input {...fieldA11y("identifier", errors.identifier?.message)} autoComplete="username" placeholder="you@example.com" {...register("identifier")} />
        </FormField>
        <FormField id="password" label="Password" error={errors.password?.message} required>
          <div className="relative">
            <Input {...fieldA11y("password", errors.password?.message)} type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-10" {...register("password")} />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>
        <Button type="submit" size="lg" loading={isSubmitting}>Sign in</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to ShopSphere? <Link href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
