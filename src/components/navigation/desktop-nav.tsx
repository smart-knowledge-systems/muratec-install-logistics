"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NavDropdown } from "./nav-dropdown";
import { UserMenu } from "./user-menu";
import { navSections } from "./nav-config";

export function DesktopNav() {
  const { user } = useAuth();

  // Filter sections based on user role
  const visibleSections = navSections.filter(
    (section) => !section.adminOnly || user?.role === "admin",
  );

  return (
    <nav className="hidden lg:flex items-center justify-between w-full">
      {/* Left: Logo and main navigation */}
      <div className="flex items-center gap-1">
        <Link href="/" className="font-semibold text-lg mr-4 shrink-0">
          Muratec Logistics
        </Link>
        {visibleSections.map((section) => (
          <NavDropdown key={section.title} section={section} />
        ))}
      </div>

      {/* Right: Utility items */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/help">
            <HelpCircle className="h-5 w-5" />
          </Link>
        </Button>
        {user && <NotificationBell userId={user._id} />}
        <UserMenu />
      </div>
    </nav>
  );
}
