"use client";

import Link from "next/link";
import { LogOut, UserCog, Settings, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/features/auth/actions";
import { routes } from "@/lib/config";
import { ROLES, type Role } from "@/lib/auth/roles";
import { initialsFrom } from "@/lib/utils";

/**
 * User menu — Ph1.md §3 (User Menu, Settings Menu).
 *
 * Sign out is a <form> posting to a Server Action rather than an onClick
 * fetch: it works before hydration, and it keeps session teardown on the server
 * where the cookie actually lives.
 */
export function UserMenu({
  email,
  displayName,
  avatarUrl,
  role,
}: {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
}) {
  const name = displayName?.trim() || email;
  const isStaff = role === ROLES.ADMIN || role === ROLES.STAFF;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Open user menu"
      >
        <Avatar>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initialsFrom(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={routes.dashboard.account}>
            <UserCog aria-hidden="true" />
            Account
          </Link>
        </DropdownMenuItem>

        {isStaff ? (
          <DropdownMenuItem asChild>
            <Link href={routes.admin.root}>
              <Shield aria-hidden="true" />
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}

        {role === ROLES.ADMIN ? (
          <DropdownMenuItem asChild>
            <Link href={routes.admin.settings}>
              <Settings aria-hidden="true" />
              Platform settings
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <form action={logout}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut aria-hidden="true" />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
