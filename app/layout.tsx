import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hi-Ops", template: "%s | Hi-Ops" },
  description: "Hi-Ops",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

// Runs before first paint — reads localStorage and applies dark/color-theme classes
const themeScript = `(function(){
  try {
    var dark = localStorage.getItem('theme') !== 'light';
    var color = localStorage.getItem('color-theme') || 'default';
    var html = document.documentElement;
    if (dark) html.classList.add('dark');
    html.classList.add('theme-' + color);
  } catch(e){}
})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-screen antialiased" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full bg-background" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
