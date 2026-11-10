import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActionToast from "@/components/ActionToast";
import TopNotice from "@/components/TopNotice";
import { Suspense } from "react";
import CartDrawerHost from "@/components/cart/CartDrawerHost";
import WhatsAppButton from "@/components/WhatsAppButton";
import Motion from "@/components/Motion";

/** Storefront chrome: header, footer and the global toast. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="w-full pt-28 bg-surface min-h-[calc(100vh-28rem)]">
        {children}
      </main>
      <Footer />
      <ActionToast />
      <TopNotice />
      <Motion />
      <Suspense fallback={null}>
        <CartDrawerHost />
        <WhatsAppButton />
      </Suspense>
    </>
  );
}
