import { redirect } from "next/navigation";

/** Addresses are managed on the Profile page. */
export default function AddressesPage() {
  redirect("/account#addresses");
}
