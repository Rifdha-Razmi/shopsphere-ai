"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { profileSchema, type ProfileValues } from "@/lib/validation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { AddressesView } from "./addresses-view";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MAX_AVATAR_BYTES = 300_000;

export function ProfileView() {
  const { user } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", email: user?.email ?? "", phone: /^[6-9]\d{9}$/.test(user?.phone ?? "") ? user!.phone : "" },
  });
  if (!user) return null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Hello, {user.firstName}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Changes are saved in this browser only (development build). <Badge variant="local" className="ml-1">Local</Badge></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data: URL avatar, not optimizable
                <img src={user.avatar} alt="" className="size-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <div className="space-y-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                id="avatar"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setAvatarError("Use a PNG, JPG or WebP image.");
                  if (file.size > MAX_AVATAR_BYTES) return setAvatarError("Image must be under 300 KB.");
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateUser({ avatar: String(reader.result) });
                    setAvatarError(null);
                    toast.success("Avatar updated (stored locally)");
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Camera /> Change avatar</Button>
                {user.avatar && <Button type="button" size="sm" variant="ghost" onClick={() => updateUser({ avatar: null })}>Remove</Button>}
              </div>
              {avatarError && <p role="alert" className="text-xs text-destructive">{avatarError}</p>}
            </div>
          </div>
          <form
            noValidate
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit((v) => {
              updateUser(v);
              reset(v);
              toast.success("Profile saved");
            })}
          >
            <FormField id="p-first" label="First name" error={errors.firstName?.message} required><Input {...fieldA11y("p-first", errors.firstName?.message)} {...register("firstName")} /></FormField>
            <FormField id="p-last" label="Last name" error={errors.lastName?.message} required><Input {...fieldA11y("p-last", errors.lastName?.message)} {...register("lastName")} /></FormField>
            <FormField id="p-email" label="Email" error={errors.email?.message} required><Input type="email" {...fieldA11y("p-email", errors.email?.message)} {...register("email")} /></FormField>
            <FormField id="p-phone" label="Mobile number" error={errors.phone?.message} required><Input type="tel" maxLength={10} {...fieldA11y("p-phone", errors.phone?.message)} {...register("phone")} /></FormField>
            <div className="sm:col-span-2"><Button type="submit" disabled={!isDirty}>Save changes</Button></div>
          </form>
        </CardContent>
      </Card>
      <AddressesView embedded />
    </div>
  );
}
