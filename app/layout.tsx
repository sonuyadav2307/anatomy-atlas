import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anatomy Atlas — Explore the human body",
  description: "An interactive 3D anatomy atlas for exploring bones, muscles, nerves, organs and ligaments.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
