"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { DesktopNav } from "./desktop-nav";
import { MobileNavSheet } from "./mobile-nav-sheet";
import { UserMenu } from "./user-menu";

export function AppNavbar() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Don't render navbar if not authenticated or still loading
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Mobile: Hamburger menu */}
        <MobileNavSheet />

        {/* Mobile: Center logo */}
        <div className="flex flex-1 items-center justify-center lg:hidden">
          <Link href="/" className="font-semibold">
            Muratec Logistics
          </Link>
        </div>

        {/* Mobile: Right side utilities */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/help">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </Button>
          {user && <NotificationBell userId={user._id} />}
          <UserMenu />
        </div>

        {/* Desktop: Full navigation */}
        <DesktopNav />
      </div>
    </header>
  );
}
