import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// Rounded and characterful on purpose — no Inter, no system stack.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yap — every day, one more sentence than yesterday",
  description:
    "Daily English speaking practice with a friendly native tutor. Yap encourages you to keep talking instead of correcting your grammar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
