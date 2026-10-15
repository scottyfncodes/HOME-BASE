import {
  BookOpen,
  ClipboardList,
  DoorOpen,
  FileText,
  Hammer,
  House,
  LayoutGrid,
  LifeBuoy,
  Lock,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; description?: string };

/** Everything, in sidebar order. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: House, description: "What needs attention" },
  { href: "/my-home", label: "My Home", icon: DoorOpen, description: "Property, rooms and systems" },
  { href: "/maintenance", label: "Maintenance", icon: ClipboardList, description: "Schedule and history" },
  { href: "/inventory", label: "Inventory", icon: Package, description: "Appliances and equipment" },
  { href: "/projects", label: "Projects", icon: Hammer, description: "Repairs and renovations" },
  { href: "/documents", label: "Documents", icon: FileText, description: "Manuals, receipts, records" },
  { href: "/preparedness", label: "Preparedness", icon: LifeBuoy, description: "Shutoffs and emergency info" },
  { href: "/learn", label: "Learn", icon: BookOpen, description: "Practical guidance" },
  { href: "/vault", label: "Vault", icon: Lock, description: "Sensitive documents" },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/providers", label: "Service providers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** The five slots on the mobile bottom bar. */
export const MOBILE_NAV: NavItem[] = [
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  PRIMARY_NAV[2],
  PRIMARY_NAV[5],
  { href: "/more", label: "More", icon: LayoutGrid },
];

/** Sections reachable from the "More" tab on mobile. */
export const MORE_NAV: NavItem[] = [PRIMARY_NAV[3], PRIMARY_NAV[4], PRIMARY_NAV[6], PRIMARY_NAV[7], PRIMARY_NAV[8], ...SECONDARY_NAV];

export function isActive(pathname: string, href: string) {
  if (href === "/more") {
    return MORE_NAV.some((n) => pathname === n.href || pathname.startsWith(n.href + "/")) || pathname === "/more";
  }
  return pathname === href || pathname.startsWith(href + "/");
}
