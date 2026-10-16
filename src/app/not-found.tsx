import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-semibold">We couldn’t find that page</h1>
      <p className="max-w-md text-muted-foreground">The link may be broken or the page may have moved.</p>
      <div className="flex gap-2">
        <Button asChild><Link href="/">Go to homepage</Link></Button>
        <Button variant="outline" asChild><Link href="/products">Browse products</Link></Button>
      </div>
    </main>
  );
}
