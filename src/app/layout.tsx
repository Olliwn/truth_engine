import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://finlandtruthengine.vercel.app'),
  title: "Finland Truth Engine | Data-Driven Policy Analysis",
  description: "Revealing the mathematical reality behind Finnish municipal finances. Explore the demographic 'Ponzi' dynamics threatening local governments.",
  keywords: ["Finland", "municipalities", "debt", "demographics", "data journalism", "policy analysis"],
  authors: [{ name: "Finland Truth Engine" }],
  openGraph: {
    title: "Finland Truth Engine",
    description: "The numbers don't lie. Explore Finland's municipal fiscal crisis.",
    type: "website",
    locale: "en_US",
    siteName: "Finland Truth Engine",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finland Truth Engine",
    description: "The numbers don't lie. Explore Finland's municipal fiscal crisis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-gradient-dark min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
