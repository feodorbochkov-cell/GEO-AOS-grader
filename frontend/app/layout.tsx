import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEO Grader",
  description: "Разовый отчет о видимости бренда в AI-поиске Perplexity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
