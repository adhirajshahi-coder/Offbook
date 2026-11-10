import type { Metadata, Viewport } from "next";
import { Lexend, Outfit } from "next/font/google";
import { ServiceWorker } from "@/components/Pwa";
import "./globals.css";

// Variable fonts: one file each instead of one per weight, which keeps the
// first paint fast on mobile data (PRD §17: LCP under 2.5 s).
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Offbook: real-world skills for classes 6 to 12",
    template: "%s · Offbook",
  },
  description:
    "Offbook teaches money, communication, AI, entrepreneurship and leadership through short lessons, games and real projects.",
  appleWebApp: { capable: true, title: "Offbook", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#7B14FF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${lexend.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
