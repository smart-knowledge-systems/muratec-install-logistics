import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  featureRequests: defineTable({
    title: v.string(),
    description: v.string(),
    prdContent: v.string(),
    userStories: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        asA: v.string(),
        iWant: v.string(),
        soThat: v.string(),
        acceptanceCriteria: v.array(v.string()),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low"),
        ),
        estimatedEffort: v.optional(
          v.union(
            v.literal("XS"),
            v.literal("S"),
            v.literal("M"),
            v.literal("L"),
            v.literal("XL"),
          ),
        ),
      }),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
    generationStatus: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("error"),
      ),
    ),
    prompts: v.optional(
      v.array(
        v.object({
          content: v.string(),
          createdAt: v.number(),
        }),
      ),
    ),
    submittedAt: v.optional(v.number()),
    authorId: v.optional(v.id("users")),
    authorEmail: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorEmail"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  analytics: defineTable({
    featureRequestId: v.id("featureRequests"),
    eventType: v.union(
      v.literal("prd_read_more"),
      v.literal("story_field_edit"),
    ),
    fieldType: v.optional(v.string()),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_feature_request", ["featureRequestId"])
    .index("by_event_type", ["eventType"]),
});
