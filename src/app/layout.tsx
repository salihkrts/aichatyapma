import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a0612",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "KaelAIChat",
  title: {
    default: "KaelAIChat | Yeni Nesil Yapay Zeka Karakter & Rol Platformu",
    template: "%s | KaelAIChat",
  },
  description:
    "KaelAIChat ile kendi yapay zeka karakterini oluştur, derin hafıza ve çoklu evren senaryolarında canlı sohbet et.",
  keywords: [
    "KaelAIChat",
    "Kael-AI",
    "yapay zeka",
    "karakter",
    "sohbet",
    "rol yapma",
    "anime",
    "roleplay",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KaelAIChat",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
