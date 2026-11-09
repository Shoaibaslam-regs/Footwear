import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import CartSync from "@/components/CartSync";
import DialogHost from "@/components/Dialogs";
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
  title: "ÉLORA Maison — Luxury Footwear",
  description:
    "Sculptural luxury footwear handcrafted in Florence & Milan by ÉLORA Maison.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${jakarta.variable} scroll-smooth`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
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
