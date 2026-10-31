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
} from "lucide-react";
import type { ComponentType } from "react";
import { PetTagIcon } from "@/components/pets/pet-tag-icon";

type NavIcon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
export type NavItem = { href: string; label: string; icon: NavIcon; description?: string };

/** Everything, in sidebar order. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: House, description: "What needs attention" },
  { href: "/my-home", label: "My Home", icon: DoorOpen, description: "Property, rooms and systems" },
  { href: "/maintenance", label: "Maintenance", icon: ClipboardList, description: "Schedule and history" },
  { href: "/inventory", label: "Inventory", icon: Package, description: "Appliances and equipment" },
  { href: "/projects", label: "Projects", icon: Hammer, description: "Repairs and renovations" },
  { href: "/pets", label: "Pets", icon: PetTagIcon, description: "Health, care and records for your animals" },
  { href: "/documents", label: "Documents", icon: FileText, description: "Manuals, receipts, records" },
  { href: "/preparedness", label: "Preparedness", icon: LifeBuoy, description: "Shutoffs and emergency info" },
  { href: "/learn", label: "Learn", icon: BookOpen, description: "Practical guidance" },
  { href: "/vault", label: "Vault", icon: Lock, description: "Sensitive documents" },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/providers", label: "Service providers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

const nav = (href: string) => PRIMARY_NAV.find((n) => n.href === href)!;

/** The five slots on the mobile bottom bar. */
export const MOBILE_NAV: NavItem[] = [nav("/home"), nav("/my-home"), nav("/maintenance"), nav("/documents"), { href: "/more", label: "More", icon: LayoutGrid }];

/** Sections reachable from the "More" tab on mobile. Pets leads: it is the section people open most outside the tab bar. */
export const MORE_NAV: NavItem[] = [nav("/pets"), nav("/inventory"), nav("/projects"), nav("/preparedness"), nav("/learn"), nav("/vault"), ...SECONDARY_NAV];

export function isActive(pathname: string, href: string) {
  if (href === "/more") {
    return MORE_NAV.some((n) => pathname === n.href || pathname.startsWith(n.href + "/")) || pathname === "/more";
  }
  return pathname === href || pathname.startsWith(href + "/");
}
