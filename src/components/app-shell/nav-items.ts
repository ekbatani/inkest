import {
  LayoutDashboard,
  NotebookPen,
  FolderKanban,
  CalendarDays,
  Tags,
  Archive,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Daily", href: "/daily", icon: CalendarDays },
  { label: "Tags", href: "/tags", icon: Tags },
  { label: "Archive", href: "/archive", icon: Archive },
];

export const settingsNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];
