import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const filtersValidator = v.object({
  projectNumber: v.optional(v.string()),
  pwbs: v.optional(v.array(v.string())),
  caseNumbers: v.optional(v.array(v.string())),
  palletNumbers: v.optional(v.array(v.string())),
  plNumbers: v.optional(v.array(v.string())),
  isDeleted: v.optional(v.boolean()),
});

/**
 * Create a new saved view
 */
export const createSavedView = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    isShared: v.boolean(),
    filters: filtersValidator,
    columns: v.array(v.string()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const savedViewId = await ctx.db.insert("savedViews", {
      name: args.name,
      description: args.description,
      createdBy: args.createdBy,
      isShared: args.isShared,
      filters: args.filters,
      columns: args.columns,
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });

    return savedViewId;
  },
});

/**
 * Update an existing saved view
 */
export const updateSavedView = mutation({
  args: {
    id: v.id("savedViews"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
    filters: v.optional(filtersValidator),
    columns: v.optional(v.array(v.string())),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
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

/**
 * Delete a saved view
 */
export const deleteSavedView = mutation({
  args: {
    id: v.id("savedViews"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Get saved views for a user (their own views + shared views)
 */
export const getSavedViews = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user's own views
    const userViews = await ctx.db
      .query("savedViews")
      .withIndex("by_creator", (q) => q.eq("createdBy", args.userId))
      .order("desc")
      .collect();

    // Get shared views (excluding user's own shared views)
    const sharedViews = await ctx.db
      .query("savedViews")
      .withIndex("by_shared", (q) => q.eq("isShared", true))
      .order("desc")
      .collect();

    // Filter out duplicates (user's own shared views are already in userViews)
    const uniqueSharedViews = sharedViews.filter(
      (view) => view.createdBy !== args.userId,
    );

    return {
      userViews,
      sharedViews: uniqueSharedViews,
    };
  },
});

/**
 * Get a single saved view by ID
 */
export const getById = query({
  args: { id: v.id("savedViews") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get pre-built default views
 * These are not stored in the database but generated on-demand
 */
export const getDefaultViews = query({
  args: {},
  handler: async () => {
    const defaultViews = [
      {
        id: "default-by-pwbs",
        name: "By PWBS",
        description: "Items grouped by PWBS category",
        isDefault: true,
        filters: {},
        columns: [
          "pwbs",
          "pwbsName",
          "itemNumber",
          "partNumber",
          "description",
          "quantity",
          "caseNumber",
        ],
        sortBy: "pwbs",
        sortOrder: "asc" as const,
      },
      {
        id: "default-by-work-package",
        name: "By Work Package",
        description: "Items grouped by work package (plNumber)",
        isDefault: true,
        filters: {},
        columns: [
          "plNumber",
          "plName",
          "itemNumber",
          "partNumber",
          "description",
          "quantity",
          "caseNumber",
          "pwbs",
        ],
        sortBy: "plNumber",
        sortOrder: "asc" as const,
      },
      {
        id: "default-by-case",
        name: "By Case",
        description: "Items grouped by case number",
        isDefault: true,
        filters: {},
        columns: [
          "caseNumber",
          "itemNumber",
          "partNumber",
          "description",
          "quantity",
          "weightKg",
          "palletNumber",
        ],
        sortBy: "caseNumber",
        sortOrder: "asc" as const,
      },
      {
        id: "default-by-pallet",
        name: "By Pallet",
        description: "Items grouped by pallet number",
        isDefault: true,
        filters: {},
        columns: [
          "palletNumber",
          "caseNumber",
          "itemNumber",
          "partNumber",
          "description",
          "quantity",
          "weightKg",
        ],
        sortBy: "palletNumber",
        sortOrder: "asc" as const,
      },
    ];

    return defaultViews;
  },
});
