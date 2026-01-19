"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isSectionActive, type NavSection } from "./nav-config";

interface NavDropdownProps {
  section: NavSection;
}

export function NavDropdown({ section }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = isSectionActive(pathname, section);
  const Icon = section.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "gap-1",
            isActive && "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="h-4 w-4 mr-1" />
          {section.title}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <nav className="grid gap-1">
          {section.items.map((item) => {
            const ItemIcon = item.icon;
            const itemActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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
        </nav>
      </PopoverContent>
    </Popover>
  );
}
