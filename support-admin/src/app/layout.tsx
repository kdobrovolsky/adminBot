import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SupportBot Admin",
  description: "Readonly admin panel for SupportBot messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
