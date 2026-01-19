"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, Workflow, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavGroup {
  title: string;
  icon: typeof BookOpen;
  items: { title: string; href: string }[];
  basePath: string;
}

const navGroups: NavGroup[] = [
  {
    title: "Getting Started",
    icon: BookOpen,
    basePath: "/help",
    items: [
      { title: "Overview", href: "/help" },
      { title: "Navigation", href: "/help/navigation" },
    ],
  },
  {
    title: "Persona Guides",
    icon: Users,
    basePath: "/help/personas",
    items: [
      { title: "Field Worker", href: "/help/personas/field-worker" },
      { title: "Site Manager", href: "/help/personas/site-manager" },
      { title: "Project Scheduler", href: "/help/personas/project-scheduler" },
      { title: "Project Manager", href: "/help/personas/project-manager" },
      {
        title: "Import Coordinator",
        href: "/help/personas/import-coordinator",
      },
      { title: "Warehouse Manager", href: "/help/personas/warehouse-manager" },
      { title: "Installer", href: "/help/personas/installer" },
    ],
  },
  {
    title: "Workflow Guides",
    icon: Workflow,
    basePath: "/help/workflows",
    items: [
      { title: "Case Move-In", href: "/help/workflows/case-move-in" },
      {
        title: "Inventory Verification",
        href: "/help/workflows/inventory-verification",
      },
      { title: "Parts Picking", href: "/help/workflows/parts-picking" },
      { title: "Shipment Tracking", href: "/help/workflows/shipment-tracking" },
      {
        title: "Project Scheduling",
        href: "/help/workflows/project-scheduling",
      },
      { title: "EVM Reporting", href: "/help/workflows/evm-reporting" },
    ],
  },
];

export function HelpSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r">
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="p-4 space-y-2">
          {navGroups.map((group) => {
            const isGroupActive = pathname.startsWith(group.basePath);
            const Icon = group.icon;

            return (
              <Collapsible
                key={group.title}
                defaultOpen={isGroupActive || group.basePath === "/help"}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {group.title}
                    </span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 border-l pl-2 mt-1 space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "block rounded-md px-3 py-1.5 text-sm transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive &&
                              "bg-accent text-accent-foreground font-medium",
                          )}
                        >
                          {item.title}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
