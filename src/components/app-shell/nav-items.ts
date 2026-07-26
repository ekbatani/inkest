import {
  Calendar,
  LayoutDashboard,
  NotebookPen,
  FolderKanban,
  Tags,
  Archive,
  Settings,
  SlidersHorizontal,
  BookOpen,
  Target,
  BookMarked,
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
  { label: "Planner", href: "/planner", icon: Target },
  { label: "Journal", href: "/journal", icon: BookMarked },
  { label: "Vault", href: "/vault", icon: Lock },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Reader", href: "/reader", icon: BookOpen },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Tags", href: "/tags", icon: Tags },
  { label: "Views", href: "/views", icon: SlidersHorizontal },
  { label: "Archive", href: "/archive", icon: Archive },
];

export const settingsNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];
