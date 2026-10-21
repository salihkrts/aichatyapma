import type { Metadata } from "next";
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

export const metadata: Metadata = {
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
