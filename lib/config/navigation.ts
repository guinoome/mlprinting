import {
  CalendarDays,
  ShoppingBag,
  Images,
  Bell,
  UserCog,
  ClipboardList,
  LayoutTemplate,
  Factory,
  Users,
  Megaphone,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { routes } from "./routes";

/**
 * Navigation registries — Ph1.md §3, §6.
 *
 * The sidebar, the mobile nav, and the breadcrumb labels all read from here, so
 * a renamed section changes in one place instead of three that drift apart.
 *
 * `phase` records which phase fills a section in. Everything past Phase 1 is a
 * placeholder today (Ph1.md §6: "Business logic comes later"), and the label
 * lets the UI say so honestly instead of shipping links that go nowhere.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** The phase that delivers this section's functionality. */
  phase: number;
  description: string;
}

/** Customer Dashboard — Ph1.md §6. */
export const customerNav: readonly NavItem[] = [
  {
    label: "My Events",
    href: routes.dashboard.events,
    icon: CalendarDays,
    phase: 3,
    description: "Events you are planning, and their invitations.",
  },
  {
    label: "My Orders",
    href: routes.dashboard.orders,
    icon: ShoppingBag,
    phase: 7,
    description: "Print orders, their status, and their history.",
  },
  {
    label: "Media Library",
    href: routes.dashboard.media,
    icon: Images,
    phase: 4,
    description: "Photos and files you have uploaded, reusable across events.",
  },
  {
    label: "Notifications",
    href: routes.dashboard.notifications,
    icon: Bell,
    phase: 9,
    description: "Updates about your events, orders, and approvals.",
  },
  {
    label: "Account",
    href: routes.dashboard.account,
    icon: UserCog,
    phase: 1,
    description: "Your profile, password, and preferences.",
  },
];

/** Admin Dashboard — Ph1.md §6. */
export const adminNav: readonly NavItem[] = [
  {
    label: "Bookings",
    href: routes.admin.bookings,
    icon: ClipboardList,
    phase: 7,
    description: "Incoming bookings and their scheduling.",
  },
  {
    label: "Templates",
    href: routes.admin.templates,
    icon: LayoutTemplate,
    phase: 2,
    description: "The invitation template catalogue.",
  },
  {
    label: "Production",
    href: routes.admin.production,
    icon: Factory,
    phase: 6,
    description: "Print jobs moving through the shop.",
  },
  {
    label: "Customers",
    href: routes.admin.customers,
    icon: Users,
    phase: 7,
    description: "Customer accounts and their history.",
  },
  {
    label: "Promotions",
    href: routes.admin.promotions,
    icon: Megaphone,
    phase: 9,
    description: "Campaigns, discounts, and their performance.",
  },
  {
    label: "Reports",
    href: routes.admin.reports,
    icon: BarChart3,
    phase: 9,
    description: "Sales, production, and platform reporting.",
  },
  {
    label: "Settings",
    href: routes.admin.settings,
    icon: Settings,
    phase: 1,
    description: "Platform configuration and staff access.",
  },
];

/**
 * True when a nav item should render as the active one.
 *
 * Matches on path segments rather than a bare startsWith, so "/admin/templates"
 * does not also light up an item registered at "/admin/template".
 */
export function isActiveNav(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
