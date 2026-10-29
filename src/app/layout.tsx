import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker";

const sans = Manrope({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: { default: "Home Base", template: "%s · Home Base" },
  description: "Understand, maintain, protect, document, and improve your home.",
  applicationName: "Home Base",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Home Base", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
        {/* HaveAnApp Pulse: anonymous, cookieless usage counts. */}
        <Script src="https://haveanapp-pulse-collect.vercel.app/p.js" data-app="home-base" strategy="afterInteractive" />
      </body>
    </html>
  );
}
