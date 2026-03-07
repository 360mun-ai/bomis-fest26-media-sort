import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOMIS Fest Media Sorter",
  description: "Event Photography Ingestion & Sorting Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased font-sans bg-zinc-950 text-zinc-50"
      >
        {children}
      </body>
    </html>
  );
}
