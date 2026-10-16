import type { Metadata } from "next";
import { PreferencesPanel } from "@/features/recommendations/components/preferences-panel";

export const metadata: Metadata = { title: "Recommendation preferences" };
export default function PreferencesPage() {
  return <PreferencesPanel />;
}
