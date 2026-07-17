"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Filter drawer for narrow screens — Ph2.md UI Requirements (mobile-friendly).
 *
 * Takes the rendered panel as a child rather than the data to render it. The
 * panel is a Server Component that reads categories from the database; passing
 * it through as `children` keeps that server-rendered while this thin client
 * wrapper owns only the open/closed state.
 *
 * Closes on navigation, since every filter is a link — see MobileNav for the
 * same pattern and the same reason.
 */
export function MobileFilters({
  children,
  activeCount,
}: {
  children: React.ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {activeCount > 0 ? (
            <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-80">
        <SheetTitle className="border-b border-border px-6 py-4 text-sm font-semibold">
          Filters
        </SheetTitle>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
