import type { Metadata } from "next";
import { AdminProfile } from "@/features/admin/components/admin-profile";

export const metadata: Metadata = { title: "My profile" };
export default function AdminProfilePage() {
  return <AdminProfile />;
}
