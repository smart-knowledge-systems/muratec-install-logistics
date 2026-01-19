import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all PWBS categories
 * Returns all PWBS categories from the reference table
 */
export const getAllCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pwbsCategories").collect();
  },
});

/**
 * Get a PWBS category by code
 */
export const getCategoryByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pwbsCategories")
      .filter((q) => q.eq(q.field("code"), args.code))
      .first();
  },
});

/**
 * Get PWBS categories by prefix
 * Useful for grouping by system type (K, F, H)
 */
export const getCategoriesByPrefix = query({
  args: {
    prefix: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pwbsCategories")
      .filter((q) => q.eq(q.field("prefix"), args.prefix))
      .collect();
  },
});
