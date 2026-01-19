"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isRouteActive, type NavItem as NavItemType } from "./nav-config";

interface NavItemProps {
  item: NavItemType;
  variant?: "default" | "compact";
  onClick?: () => void;
}

export function NavItem({ item, variant = "default", onClick }: NavItemProps) {
  const pathname = usePathname();
  const isActive = isRouteActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Button
      variant="ghost"
      asChild
      className={cn(
        "justify-start gap-2",
        variant === "compact" && "h-9 px-3",
        isActive && "bg-accent text-accent-foreground",
      )}
      onClick={onClick}
    >
      <Link href={item.href}>
        <Icon className="h-4 w-4" />
        <span>{item.title}</span>
      </Link>
    </Button>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = isRouteActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}
