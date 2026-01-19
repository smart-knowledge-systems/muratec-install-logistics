"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { navSections, isSectionActive, isRouteActive } from "./nav-config";

export function MobileNavSheet() {
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Filter sections based on user role
  const visibleSections = navSections.filter(
    (section) => !section.adminOnly || user?.role === "admin",
  );

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const handleNavigation = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <nav className="px-2">
            {visibleSections.map((section) => {
              const isActive = isSectionActive(pathname, section);
              const isExpanded =
                expandedSections.includes(section.title) || isActive;
              const SectionIcon = section.icon;

              return (
                <Collapsible
                  key={section.title}
                  open={isExpanded}
                  onOpenChange={() => toggleSection(section.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between mb-1",
                        isActive && "bg-accent",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <SectionIcon className="h-4 w-4" />
                        {section.title}
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded && "rotate-90",
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 border-l pl-2 mb-2">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive = isRouteActive(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavigation}
                            className={cn(
                              "flex items-start gap-3 rounded-md p-2 text-sm transition-colors",
                              "hover:bg-accent hover:text-accent-foreground",
                              itemActive && "bg-accent text-accent-foreground",
                            )}
                          >
                            <ItemIcon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="grid gap-0.5">
                              <span className="font-medium">{item.title}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            <Separator className="my-2" />

            {/* Help Link */}
            <Link
              href="/help"
              onClick={handleNavigation}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isRouteActive(pathname, "/help") &&
                  "bg-accent text-accent-foreground",
              )}
            >
              <HelpCircle className="h-4 w-4" />
              Help & Documentation
            </Link>
          </nav>
        </ScrollArea>

        {/* User section at bottom */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="grid gap-0.5 overflow-hidden">
                {user.name && (
                  <span className="font-medium truncate text-sm">
                    {user.name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
                {user.role === "admin" && (
                  <Badge variant="secondary" className="w-fit text-xs mt-1">
                    Admin
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
