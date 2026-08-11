import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
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
  title: "Newsletter Analytics",
  description: "Internal newsletter engagement analytics for Himalayan Everest Insurance",
};

async function getCompanyName(): Promise<string> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    const settings = await res.json();
    return settings.companyName;
  } catch {
    return "Newsletter Analytics";
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const companyName = await getCompanyName();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell companyName={companyName}>{children}</AppShell>
      </body>
    </html>
  );
}
