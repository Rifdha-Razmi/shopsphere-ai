import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { NetworkBanner } from "@/components/layout/network-banner";
import { LazyOverlays } from "@/components/layout/lazy-overlays";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <NetworkBanner />
      <Header />
      <main id="main" className="min-h-[60vh] pb-20 lg:pb-0">
        {children}
      </main>
      <Footer />
      <LazyOverlays />
      <MobileBottomBar />
    </>
  );
}
