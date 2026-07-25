import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

/**
 * One family for both scripts. No `subsets` so the Korean unicode-range chunks
 * are self-hosted too — with `subsets: ["latin"]` Hangul would silently fall
 * back to a system face. `preload: false` keeps those chunks off the critical
 * path; the browser fetches only the ranges a page actually uses.
 */
const plex = IBM_Plex_Sans_KR({
  variable: "--font-plex",
  weight: ["400", "500", "600"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Yap — 어제보다 한 문장 더",
  description:
    "매일 한 문장씩 늘리는 영어 말하기 연습. 문법을 지적하는 대신 계속 말하게 만드는 원어민 튜터.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${plex.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
