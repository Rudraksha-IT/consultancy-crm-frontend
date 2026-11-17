import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";

import { LABELS } from "@/constants/messages";

import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: LABELS.productName,
  description: "CRM for education consultancies",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full ${publicSans.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
