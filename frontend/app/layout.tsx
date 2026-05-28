import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEO Grader",
  description: "Отчёт о видимости бренда в AI-поисковой выдаче",
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
