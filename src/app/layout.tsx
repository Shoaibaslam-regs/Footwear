import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import CartSync from "@/components/CartSync";
import DialogHost from "@/components/Dialogs";
import { ICON_FONT_URL } from "@/lib/icons";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ÉLORA Maison — Luxury Women's Shoes",
  description:
    "Luxury women's shoes by ÉLORA Maison, handmade in Florence & Milan. Delivery across Pakistan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      // data-motion / data-scrolled are set by the script below and Motion.tsx before hydration.
      suppressHydrationWarning
      lang="en"
      className={`${playfair.variable} ${jakarta.variable} scroll-smooth`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.dataset.motion="";setTimeout(function(){if(!("motionReady" in d.dataset))delete d.dataset.motion},4000)})()`,
          }}
        />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        {/* Icon font subset (see lib/icons.ts) */}
        <link href={ICON_FONT_URL} rel="stylesheet" />
      </head>
      <body className="bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed">
        {children}
        <DialogHost />
        <Suspense fallback={null}>
          <CartSync />
        </Suspense>
      </body>
    </html>
  );
}
