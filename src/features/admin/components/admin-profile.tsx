"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Mail, Phone, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { profileSchema, type ProfileValues } from "@/lib/validation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { UserAvatar } from "@/components/common/user-avatar";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MAX_AVATAR_BYTES = 2_000_000;

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

/** Admin profile: summary card + editable account details. */
export function AdminProfile() {
  const { user } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", email: user?.email ?? "", phone: /^[6-9]\d{9}$/.test(user?.phone ?? "") ? user!.phone : "" },
  });
  if (!user) return null;
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-8 text-center">
          <UserAvatar user={user} className="size-28 text-4xl ring-4" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">{fullName}</h1>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Administrator</p>
          </div>
          <div className="mt-2 grid w-full gap-4 border-t pt-5 text-left">
            <Detail icon={Mail} label="Email address" value={user.email} />
            <Detail icon={Phone} label="Mobile number" value={user.phone || "—"} />
            <Detail icon={ShieldCheck} label="Account status" value={<Badge variant="success">Active</Badge>} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Update account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <UserAvatar user={user} className="size-16 text-xl" />
            <div className="space-y-1">
              <input
                ref={fileRef}
                id="admin-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return setAvatarError("Use a PNG, JPG, GIF or WebP image.");
                  if (file.size > MAX_AVATAR_BYTES) return setAvatarError("Image must be under 2 MB.");
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateUser({ avatar: String(reader.result) });
                    setAvatarError(null);
                    toast.success("Profile photo updated");
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => fileRef.current?.click()}><Camera /> Choose new photo</Button>
                {user.avatar && <Button type="button" size="sm" variant="ghost" onClick={() => updateUser({ avatar: null })}>Remove</Button>}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF or WebP · max 2 MB</p>
              {avatarError && <p role="alert" className="text-xs text-destructive">{avatarError}</p>}
            </div>
          </div>

          <form
            noValidate
            className="grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2"
            onSubmit={handleSubmit((v) => {
              updateUser(v);
              reset(v);
              toast.success("Profile updated");
            })}
          >
            <FormField id="ap-first" label="First name" error={errors.firstName?.message} required><Input {...fieldA11y("ap-first", errors.firstName?.message)} {...register("firstName")} /></FormField>
            <FormField id="ap-last" label="Last name" error={errors.lastName?.message} required><Input {...fieldA11y("ap-last", errors.lastName?.message)} {...register("lastName")} /></FormField>
            <FormField id="ap-email" label="Email address" hint="Used to sign in — can't be changed here"><Input type="email" readOnly className="bg-muted" {...fieldA11y("ap-email", errors.email?.message, true)} {...register("email")} /></FormField>
            <FormField id="ap-phone" label="Mobile number" error={errors.phone?.message} required><Input type="tel" maxLength={10} {...fieldA11y("ap-phone", errors.phone?.message)} {...register("phone")} /></FormField>
            <FormField id="ap-role" label="Role" className="sm:col-span-2"><Input id="ap-role" value="Administrator" readOnly disabled /></FormField>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!isDirty}><Save /> Save profile changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
