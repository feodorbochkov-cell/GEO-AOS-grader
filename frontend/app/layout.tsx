import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEO Grader",
  description: "One-shot AI visibility audit for your brand in Perplexity search",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
