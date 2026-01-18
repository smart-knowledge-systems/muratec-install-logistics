import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const incrementEventCount = mutation({
  args: {
    featureRequestId: v.id("featureRequests"),
    eventType: v.union(
      v.literal("prd_read_more"),
      v.literal("story_field_edit"),
    ),
    fieldType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing record for this featureRequestId+eventType+fieldType combination
    const existing = await ctx.db
      .query("analytics")
      .withIndex("by_feature_request", (q) =>
        q.eq("featureRequestId", args.featureRequestId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("eventType"), args.eventType),
          args.fieldType !== undefined
            ? q.eq(q.field("fieldType"), args.fieldType)
            : q.eq(q.field("fieldType"), undefined),
        ),
      )
      .first();

    if (existing) {
      // Increment existing record
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        updatedAt: now,
      });
    } else {
      // Create new record with count=1
      await ctx.db.insert("analytics", {
        featureRequestId: args.featureRequestId,
        eventType: args.eventType,
        fieldType: args.fieldType,
        count: 1,
        updatedAt: now,
      });
    }
  },
});
