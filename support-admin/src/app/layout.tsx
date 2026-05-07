import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";
import {ReactNode} from "react";

export const metadata: Metadata = {
  title: "SupportBot Admin",
  description: "Readonly admin panel for SupportBot messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
