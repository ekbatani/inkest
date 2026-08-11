import {
  Calendar,
  LayoutDashboard,
  NotebookPen,
  FolderKanban,
  Tags,
  Archive,
  Settings,
  SlidersHorizontal,
  Target,
  Lock,
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
  { label: "Planner & Journal", href: "/planner", icon: Target },
  { label: "Vault", href: "/vault", icon: Lock },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Tags", href: "/tags", icon: Tags },
  { label: "Views", href: "/views", icon: SlidersHorizontal },
  { label: "Archive", href: "/archive", icon: Archive },
];

export const settingsNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];
