import type { Metadata } from "next";
import { ProfileView } from "@/features/account/components/profile-view";

export const metadata: Metadata = { title: "My account" };
export default function AccountPage() {
  return <ProfileView />;
}
