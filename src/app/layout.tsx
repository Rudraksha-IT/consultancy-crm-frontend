import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { ProductNameProvider } from "@/components/features/brand/ProductName";
import { TAB_ICON } from "@/constants/tabIcon";
import { getProductName } from "@/lib/brand/productName";
import { KEEP_TITLE_SCRIPT } from "@/lib/keptTitle";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

/** The tab shows the product's saved name until a page sets its own (ticket 15). */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await getProductName(),
    description: "CRM for education consultancies",
    // The product logo on every address (first live fixes, ticket 05); the Next.js starter is gone.
    icons: { icon: TAB_ICON.path },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const productName = await getProductName();
  return (
    <html lang="en" className={`h-full ${geist.variable}`}>
      <head>
        {/* The page's own tab title from the start of a reload (list tidy-ups 30). */}
        <script dangerouslySetInnerHTML={{ __html: KEEP_TITLE_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ProductNameProvider name={productName}>{children}</ProductNameProvider>
      </body>
    </html>
  );
}
