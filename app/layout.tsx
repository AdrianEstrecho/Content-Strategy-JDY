import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JustDoYou — Instagram Command Center",
  description:
    "Personal Instagram marketing platform for real estate. Four AI agents, one dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-screen font-sans">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 px-8 py-6 max-w-[1400px] w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
