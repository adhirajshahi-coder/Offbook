import type { Metadata, Viewport } from "next";
import { Lexend, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["800", "900"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Offbook: real-world skills for classes 6 to 12",
    template: "%s · Offbook",
  },
  description:
    "Offbook teaches money, communication, AI, entrepreneurship and leadership through short lessons, games and real projects.",
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
