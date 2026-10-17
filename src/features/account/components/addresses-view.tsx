"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "@/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAccountStore } from "@/store/account.store";
import { AddressForm, EMPTY_ADDRESS } from "@/features/checkout/components/address-form";
import { EmptyState } from "@/components/common/state-views";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const NONE: Address[] = [];

export function AddressesView({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const addresses = useAccountStore((s) => (user ? s.addresses[user.id] : undefined)) ?? NONE;
  const { addAddress, updateAddress, removeAddress, setDefault } = useAccountStore.getState();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  if (!user) return null;

  return (
    <section id="addresses" aria-labelledby="addresses-heading" className="scroll-mt-32 space-y-6">
      <div className="flex items-center justify-between gap-3">
        {embedded ? (
          <h2 id="addresses-heading" className="text-xl font-semibold tracking-tight">Addresses</h2>
        ) : (
          <h1 id="addresses-heading" className="text-2xl font-bold tracking-tight">Addresses</h1>
        )}
        <Button onClick={() => setEditing("new")}><Plus /> Add address</Button>
      </div>
      {addresses.length === 0 ? (
        <EmptyState icon={<MapPin className="size-7" />} title="No saved addresses" description="Save an address to check out faster." action={{ label: "Add an address", onClick: () => setEditing("new") }} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2"><span className="font-semibold">{a.label}</span>{a.isDefault && <Badge variant="secondary">Default</Badge>}</div>
              <p className="text-sm leading-relaxed text-muted-foreground">{a.fullName} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Pencil /> Edit</Button>
                {!a.isDefault && <Button size="sm" variant="ghost" onClick={() => setDefault(user.id, a.id)}><Star /> Make default</Button>}
                <Button size="sm" variant="ghost" onClick={() => { removeAddress(user.id, a.id); toast.message("Address deleted"); }} aria-label={`Delete address ${a.label}`}><Trash2 /> Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add address" : "Edit address"}</DialogTitle>
            <DialogDescription>Saved locally to your account on this device.</DialogDescription>
          </DialogHeader>
          {editing && (
            <AddressForm
              idPrefix="acct-addr"
              defaultValues={editing === "new" ? { ...EMPTY_ADDRESS, fullName: `${user.firstName} ${user.lastName}` } : { label: editing.label, fullName: editing.fullName, phone: editing.phone, line1: editing.line1, line2: editing.line2 ?? "", city: editing.city, state: editing.state, pincode: editing.pincode }}
              submitLabel="Save address"
              onCancel={() => setEditing(null)}
              onSubmit={(v) => {
                if (editing === "new") addAddress(user.id, v);
                else updateAddress(user.id, editing.id, v);
                toast.success("Address saved");
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
