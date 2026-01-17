import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const userStoryValidator = v.object({
  id: v.string(),
  title: v.string(),
  asA: v.string(),
  iWant: v.string(),
  soThat: v.string(),
  acceptanceCriteria: v.array(v.string()),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  estimatedEffort: v.optional(
    v.union(
      v.literal("XS"),
      v.literal("S"),
      v.literal("M"),
      v.literal("L"),
      v.literal("XL"),
    ),
  ),
});

export const createDraft = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    authorId: v.optional(v.id("users")),
    authorEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const featureRequestId = await ctx.db.insert("featureRequests", {
      title: args.title,
      description: args.description,
      prdContent: "",
      userStories: [],
      status: "draft",
      generationStatus: "generating",
      prompts: [{ content: args.description, createdAt: now }],
      authorId: args.authorId,
      authorEmail: args.authorEmail,
      createdAt: now,
      updatedAt: now,
    });

    return featureRequestId;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    prdContent: v.string(),
    userStories: v.array(userStoryValidator),
    authorEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.authorEmail))
      .first();

    const featureRequestId = await ctx.db.insert("featureRequests", {
      title: args.title,
      description: args.description,
      prdContent: args.prdContent,
      userStories: args.userStories,
      status: "submitted",
      authorId: user?._id,
      authorEmail: args.authorEmail,
      createdAt: now,
      updatedAt: now,
    });

    return featureRequestId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("featureRequests"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("featureRequests"),
    title: v.optional(v.string()),
    prdContent: v.optional(v.string()),
    userStories: v.optional(v.array(userStoryValidator)),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, {
        ...filteredUpdates,
        updatedAt: Date.now(),
      });
    }
  },
});

export const get = query({
  args: { id: v.id("featureRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listAll = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("in_review"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("in_progress"),
        v.literal("completed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("featureRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("featureRequests")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const listByAuthor = query({
  args: { authorEmail: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("featureRequests")
      .withIndex("by_author", (q) => q.eq("authorEmail", args.authorEmail))
      .order("desc")
      .collect();
  },
});

export const remove = mutation({
  args: { id: v.id("featureRequests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateGeneratedContent = mutation({
  args: {
    id: v.id("featureRequests"),
    prdContent: v.optional(v.string()),
    userStories: v.optional(v.array(userStoryValidator)),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
  },
});

export const updateGenerationStatus = mutation({
  args: {
    id: v.id("featureRequests"),
    generationStatus: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      generationStatus: args.generationStatus,
      updatedAt: Date.now(),
    });
  },
});
