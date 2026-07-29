"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveNav } from "@/lib/config/navigation";
import type { RenderedNavItem } from "./app-shell";
import { cn } from "@/lib/utils";

/**
 * The link list shared by the desktop sidebar and the mobile drawer — Ph1.md §3.
 *
 * One list, two shells. A separate mobile copy is how the two quietly stop
 * agreeing about what the sections are.
 */
export function SidebarNav({
  items,
  onNavigate,
  className,
}: {
  items: readonly RenderedNavItem[];
  /** Called after a link is chosen — the drawer uses it to close itself. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className={cn("flex flex-col gap-1", className)}>
      {items.map(({ label, href, icon, built }) => {
        const active = isActiveNav(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {icon}
            <span className="truncate">{label}</span>
            {/* The honest version of a link that looks finished and isn't.
                Reads "Soon" rather than a phase number: this badge sat in the
                sidebar of every dashboard page saying "Ph3" and "Ph7" long
                after those shipped, which told the reader nothing true. */}
            {built === false ? (
              <span className="ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
