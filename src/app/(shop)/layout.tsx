import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActionToast from "@/components/ActionToast";
import TopNotice from "@/components/TopNotice";
import { Suspense } from "react";
import CartDrawerHost from "@/components/cart/CartDrawerHost";
import WhatsAppButton from "@/components/WhatsAppButton";
import Motion from "@/components/Motion";
import { SaleProvider } from "@/components/sale/SaleProvider";
import { getSaleEvents } from "@/lib/server/sale-events";

/**
 * Storefront chrome: header, footer and the global toast. The sale schedule
 * (cached, no clock) goes to SaleProvider, which switches prices in the browser.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const saleEvents = await getSaleEvents();
  return (
    <SaleProvider events={saleEvents}>
      <Header />
      <main className="shop-main w-full pt-28 bg-surface min-h-[calc(100vh-28rem)]">
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
    </SaleProvider>
  );
}
