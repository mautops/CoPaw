import type { Metadata } from "next";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hi-Ops", template: "%s | Hi-Ops" },
  description: "Hi-Ops",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark h-screen antialiased">
      <body className="h-full bg-background">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
