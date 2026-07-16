import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ML Digital Event Platform",
  description:
    "Create premium event websites and matching printed invitations — by ML Printing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
