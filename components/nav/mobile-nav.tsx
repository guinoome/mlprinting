"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { branding } from "@/lib/config";
import type { NavItem } from "@/lib/config/navigation";

/**
 * Mobile navigation drawer — Ph1.md §3.
 *
 * Closes on navigation. App Router keeps this component mounted across a
 * client-side route change, so without the pathname effect the drawer would
 * still be sitting open over the page the user just asked for.
 */
export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0">
        {/* Radix requires a title for the dialog's accessible name. */}
        <SheetTitle className="border-b border-border px-6 py-4 text-sm font-semibold tracking-tight">
          {branding.shortName}
        </SheetTitle>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
