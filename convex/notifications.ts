import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { NotFoundError } from "./lib/errors";

/**
 * Create a new notification for a user
 */
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("arrival_reminder"),
      v.literal("eta_change"),
      v.literal("shipment_arrived"),
      v.literal("delay_alert"),
    ),
    title: v.string(),
    message: v.string(),
    relatedShipmentId: v.optional(v.id("shipments")),
    relatedProjectNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      relatedShipmentId: args.relatedShipmentId,
      relatedProjectNumber: args.relatedProjectNumber,
      read: false,
      createdAt: now,
    });

    return notificationId;
  },
});

/**
 * Mark a notification as read
 */
export const markNotificationRead = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);

    if (!notification) {
      throw new NotFoundError("Notification", args.id);
    }

    await ctx.db.patch(args.id, {
      read: true,
      readAt: Date.now(),
    });
  },
});

/**
 * Mark multiple notifications as read
 */
export const markNotificationsRead = mutation({
  args: {
    ids: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const id of args.ids) {
      const notification = await ctx.db.get(id);
      if (notification && !notification.read) {
        await ctx.db.patch(id, {
          read: true,
          readAt: now,
        });
      }
    }
  },
});

/**
 * Mark all unread notifications as read for a user
 */
export const markAllRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("read", false),
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
      });
    }

    return { count: unreadNotifications.length };
  },
});

/**
 * Get unread notifications for a user
 */
export const getUnreadNotifications = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("read", false),
      )
      .order("desc")
      .collect();

    return notifications;
  },
});

/**
 * Get all notifications for a user (with pagination)
 */
export const getNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

/**
 * Get unread notification count for a user
 */
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("read", false),
      )
      .collect();

    return notifications.length;
  },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Delete all read notifications for a user (cleanup)
 */
export const deleteReadNotifications = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const readNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("read"), true))
      .collect();

    for (const notification of readNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { deletedCount: readNotifications.length };
  },
});
