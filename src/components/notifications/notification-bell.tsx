"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { NotificationItem } from "./notification-item";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface NotificationBellProps {
  userId: Id<"users">;
  className?: string;
}

export function NotificationBell({ userId, className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const notifications = useQuery(api.notifications.getUnreadNotifications, {
    userId,
  });
  const markAllRead = useMutation(api.notifications.markAllRead);

  const unreadCount = notifications?.length || 0;

  const handleMarkAllRead = async () => {
    try {
      await markAllRead({ userId });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications === undefined ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
