import type { Metadata } from "next";
import { notFound } from "next/navigation";

const POLICIES: Record<string, { title: string; body: string[] }> = {
  shipping: { title: "Shipping policy", body: ["Standard delivery is free on orders above ₹999; otherwise a ₹79 fee applies.", "Express (1–2 days) and same-day (metro pincodes, order before 2 PM) options are available at checkout.", "All delivery estimates and tracking updates in this development build are simulated."] },
  returns: { title: "Returns & refunds", body: ["Most items can be returned within the return window shown on the product page.", "Refunds are issued to the original payment method. In this build payments are simulated, so no money is ever moved."] },
  privacy: { title: "Privacy policy", body: ["This development build stores your account, cart, wishlist, orders and browsing signals only in your browser's local storage.", "No personal data is sent to any server other than the public product API used to load the catalogue.", "You can reset recommendation signals at any time from Account → Recommendation preferences."] },
  terms: { title: "Terms of use", body: ["ShopSphere AI is an internship engineering project. Products, prices and orders are for demonstration only.", "Do not enter real payment details or passwords you use elsewhere."] },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: POLICIES[slug]?.title ?? "Policy" };
}

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();
  return (
    <article className="container-page max-w-3xl space-y-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{policy.title}</h1>
      {policy.body.map((p) => <p key={p} className="leading-relaxed text-muted-foreground">{p}</p>)}
    </article>
  );
}
