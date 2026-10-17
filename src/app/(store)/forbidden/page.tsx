import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/common/state-views";

export default function ForbiddenPage() {
  return (
    <div className="container-page py-12">
      <EmptyState icon={<ShieldAlert className="size-7" />} title="You don't have access to this page" description="The admin dashboard is only available to administrator accounts." action={{ label: "Back to the store", href: "/" }} />
    </div>
  );
}
