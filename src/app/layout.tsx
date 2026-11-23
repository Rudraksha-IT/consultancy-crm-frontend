import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { headers } from "next/headers";

import { ProductNameProvider } from "@/components/features/brand/ProductName";
import { TAB_ICON } from "@/constants/tabIcon";
import { getProductName } from "@/lib/brand/productName";

import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

/** The protocol the browser used, as Django is told it ("http" unless it says https). */
async function protocol(): Promise<string> {
  return (await headers()).get("x-forwarded-proto") === "https" ? "https" : "http";
}

/** The tab shows the product's saved name until a page sets its own (ticket 15). */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await getProductName(await protocol()),
    description: "CRM for education consultancies",
    // The product logo on every address (first live fixes, ticket 05); the Next.js starter is gone.
    icons: { icon: TAB_ICON.path },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const productName = await getProductName(await protocol());
  return (
    <html lang="en" className={`h-full ${publicSans.variable}`}>
      <body className="min-h-full">
        <ProductNameProvider name={productName}>{children}</ProductNameProvider>
      </body>
    </html>
  );
}
