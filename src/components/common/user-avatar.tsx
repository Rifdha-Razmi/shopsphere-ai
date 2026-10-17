import type { User } from "@/types";
import { cn } from "@/lib/cn";

export function initialsOf(user: Pick<User, "firstName" | "lastName"> | null | undefined): string {
  if (!user) return "?";
  const letters = `${user.firstName?.trim()[0] ?? ""}${user.lastName?.trim()[0] ?? ""}`;
  return (letters || "?").toUpperCase();
}

/** Profile picture if the user uploaded one, otherwise their initials (e.g. Arun Kumar → AK). */
export function UserAvatar({ user, className }: { user: Pick<User, "firstName" | "lastName" | "avatar"> | null | undefined; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-2 ring-primary/15", className)} aria-hidden>
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- local data: URL avatar
        <img src={user.avatar} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(user)
      )}
    </span>
  );
}
