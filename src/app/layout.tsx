import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "200W MA Chart",
  description: "Interactive price chart with 200-week moving average"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 font-body">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
