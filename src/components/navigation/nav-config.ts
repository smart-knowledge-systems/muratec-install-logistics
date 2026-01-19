import {
  Package,
  Truck,
  FolderKanban,
  LayoutDashboard,
  Settings,
  HelpCircle,
  ClipboardList,
  Calendar,
  GitBranch,
  BarChart3,
  FileText,
  Scan,
  ClipboardCheck,
  BoxSelect,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  children?: NavItem[];
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  href: string;
  icon: LucideIcon;
  items: NavItem[];
  adminOnly?: boolean;
}

export const navSections: NavSection[] = [
  {
    title: "Supply List",
    href: "/supply-list",
    icon: Package,
    items: [
      {
        title: "Browse Items",
        href: "/supply-list",
        icon: ClipboardList,
        description: "View and filter all supply items",
      },
      {
        title: "Move-In",
        href: "/supply-list/move-in",
        icon: Scan,
        description: "Scan and track case arrivals",
      },
      {
        title: "Inventory",
        href: "/supply-list/inventory",
        icon: ClipboardCheck,
        description: "Verify inventory counts",
      },
      {
        title: "Picking",
        href: "/supply-list/picking",
        icon: BoxSelect,
        description: "Pick parts for work packages",
      },
      {
        title: "Field Dashboard",
        href: "/supply-list/field-dashboard",
        icon: LayoutDashboard,
        description: "Field operations overview",
      },
    ],
  },
  {
    title: "Logistics",
    href: "/logistics",
    icon: Truck,
    items: [
      {
        title: "Shipment Board",
        href: "/logistics",
        icon: FolderKanban,
        description: "Track shipment milestones",
      },
      {
        title: "Arrival Calendar",
        href: "/logistics/calendar",
        icon: Calendar,
        description: "View upcoming arrivals",
      },
    ],
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    items: [
      {
        title: "All Projects",
        href: "/projects",
        icon: FolderKanban,
        description: "Manage all projects",
      },
      {
        title: "Dependencies",
        href: "/projects/dependencies",
        icon: GitBranch,
        description: "View PWBS dependencies",
      },
    ],
  },
  {
    title: "Dashboard",
    href: "/dashboard/evm",
    icon: LayoutDashboard,
    items: [
      {
        title: "EVM Overview",
        href: "/dashboard/evm",
        icon: BarChart3,
        description: "Earned value metrics",
      },
      {
        title: "Reports",
        href: "/reports/evm",
        icon: FileText,
        description: "Generate EVM reports",
      },
    ],
  },
  {
    title: "Admin",
    href: "/admin/feature-requests",
    icon: Settings,
    adminOnly: true,
    items: [
      {
        title: "Feature Requests",
        href: "/admin/feature-requests",
        icon: Settings,
        description: "Manage feature requests",
      },
    ],
  },
];

export const utilityNavItems: NavItem[] = [
  {
    title: "Help",
    href: "/help",
    icon: HelpCircle,
    description: "User guides and documentation",
  },
];

// Helper to check if a route is active
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  // Exact match for specific routes
  if (pathname === href) {
    return true;
  }
  // Section match (e.g., /supply-list matches /supply-list/*)
  return pathname.startsWith(href + "/");
}

// Helper to check if any child route is active
export function isSectionActive(
  pathname: string,
  section: NavSection,
): boolean {
  return section.items.some(
    (item) => isRouteActive(pathname, item.href) || pathname === section.href,
  );
}
