import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";
import { AuthShell } from "@/features/auth/components/auth-shell";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" wide>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
