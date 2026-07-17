import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { themeInitScript } from "@/lib/theme";
import { branding } from "@/lib/config";

export const metadata: Metadata = {
  // "%s" is filled by each page's own title; "default" covers pages with none.
  title: {
    default: branding.product,
    template: `%s — ${branding.shortName}`,
  },
  description: `Create premium event websites and matching printed invitations — by ${branding.company}.`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Sets data-theme before first paint. Without it the page renders light,
          hydrates, then snaps to dark. suppressHydrationWarning on <html> is
          required because this script deliberately edits the very attribute
          React is about to diff.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        {/* Mounted once, at the root: notifications must outlive the page that
            raised them — a redirect after a save is the common case. */}
        <Toaster />
      </body>
    </html>
  );
}
