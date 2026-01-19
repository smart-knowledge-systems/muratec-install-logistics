"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Bell,
  Calendar,
  Package,
  TrendingDown,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

interface NotificationItemProps {
  notification: Doc<"notifications">;
  onClose?: () => void;
}

const NOTIFICATION_ICONS = {
  arrival_reminder: Calendar,
  eta_change: Bell,
  shipment_arrived: Package,
  delay_alert: TrendingDown,
} as const;

const NOTIFICATION_COLORS = {
  arrival_reminder: "text-blue-500",
  eta_change: "text-orange-500",
  shipment_arrived: "text-green-500",
  delay_alert: "text-red-500",
} as const;

export function NotificationItem({
  notification,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const markNotificationRead = useMutation(
    api.notifications.markNotificationRead,
  );

  const Icon = NOTIFICATION_ICONS[notification.type] || AlertCircle;
  const iconColor = NOTIFICATION_COLORS[notification.type] || "text-gray-500";

  const handleClick = async () => {
    try {
      // Mark as read
      if (!notification.read) {
        await markNotificationRead({ id: notification._id });
      }

      // Navigate to related resource
      if (notification.relatedShipmentId) {
        router.push(`/logistics/shipments/${notification.relatedShipmentId}`);
      } else if (notification.relatedProjectNumber) {
        router.push(`/logistics?project=${notification.relatedProjectNumber}`);
      } else {
        router.push("/logistics");
      }

      // Close the dropdown
      onClose?.();
    } catch (error) {
      console.error("Failed to handle notification click:", error);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <Button
      variant="ghost"
      className="w-full justify-start p-4 h-auto hover:bg-accent"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 w-full">
        <div className={`mt-1 flex-shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 text-left space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">
              {notification.title}
            </p>
            {!notification.read && (
              <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </div>
    </Button>
  );
}
