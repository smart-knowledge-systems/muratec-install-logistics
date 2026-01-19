import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Filter options result type
 */
export interface FilterOptions {
  pwbs: string[];
  caseNumbers: string[];
  palletNumbers: string[];
  plNumbers: string[];
  projectNumbers: string[];
}

/**
 * Get filter options from cache
 * Falls back to computing if cache is stale or missing
 */
export const get = query({
  args: {
    projectNumber: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<FilterOptions> => {
    const { projectNumber } = args;

    // Try to get cached filter options
    const cached = await ctx.db
      .query("supplyItemFilterOptions")
      .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
      .first();

    if (cached) {
      return {
        pwbs: cached.pwbs,
        caseNumbers: cached.caseNumbers,
        palletNumbers: cached.palletNumbers,
        plNumbers: cached.plNumbers,
        projectNumbers: cached.projectNumbers,
      };
    }

    // Cache miss - compute from supply items
    // This is the fallback path and should be rare after initial cache population
    return await computeFilterOptions(ctx, projectNumber);
  },
});

/**
 * Internal helper to compute filter options from supply items
 * Used for cache population and fallback
 * Accepts either QueryCtx or MutationCtx (both have db.query)
 */
async function computeFilterOptions(
  ctx: QueryCtx | MutationCtx,
  projectNumber: string | undefined,
): Promise<FilterOptions> {
  let items;

  if (projectNumber) {
    items = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
      .collect();
  } else {
    // For global options, we need to collect unique values
    // This is expensive but only happens on cache miss
    items = await ctx.db.query("supplyItems").collect();
  }

  const pwbsSet = new Set<string>();
  const caseNumbersSet = new Set<string>();
  const palletNumbersSet = new Set<string>();
  const plNumbersSet = new Set<string>();
  const projectNumbersSet = new Set<string>();

  for (const item of items) {
    if (item.pwbs) pwbsSet.add(item.pwbs);
    if (item.caseNumber) caseNumbersSet.add(item.caseNumber);
    if (item.palletNumber) palletNumbersSet.add(item.palletNumber);
    if (item.plNumber) plNumbersSet.add(item.plNumber);
    if (item.projectNumber) projectNumbersSet.add(item.projectNumber);
  }

  return {
    pwbs: Array.from(pwbsSet).sort(),
    caseNumbers: Array.from(caseNumbersSet).sort(),
    palletNumbers: Array.from(palletNumbersSet).sort(),
    plNumbers: Array.from(plNumbersSet).sort(),
    projectNumbers: Array.from(projectNumbersSet).sort(),
  };
}

/**
 * Rebuild filter options cache for a specific project or globally
 * Called after supply items are modified
 */
export const rebuild = mutation({
  args: {
    projectNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectNumber } = args;

    // Compute fresh filter options
    const options = await computeFilterOptions(ctx, projectNumber);

    // Find existing cache entry
    const existing = await ctx.db
      .query("supplyItemFilterOptions")
      .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing cache entry
      await ctx.db.patch(existing._id, {
        pwbs: options.pwbs,
        caseNumbers: options.caseNumbers,
        palletNumbers: options.palletNumbers,
        plNumbers: options.plNumbers,
        projectNumbers: options.projectNumbers,
        updatedAt: now,
      });
    } else {
      // Create new cache entry
      await ctx.db.insert("supplyItemFilterOptions", {
        projectNumber,
        pwbs: options.pwbs,
        caseNumbers: options.caseNumbers,
        palletNumbers: options.palletNumbers,
        plNumbers: options.plNumbers,
        projectNumbers: options.projectNumbers,
        updatedAt: now,
      });
    }

    return { success: true, projectNumber, updatedAt: now };
  },
});

/**
 * Internal mutation to rebuild cache - can be called from other mutations
 */
export const rebuildInternal = internalMutation({
  args: {
    projectNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectNumber } = args;

    // Compute fresh filter options
    const options = await computeFilterOptions(ctx, projectNumber);

    // Find existing cache entry
    const existing = await ctx.db
      .query("supplyItemFilterOptions")
      .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pwbs: options.pwbs,
        caseNumbers: options.caseNumbers,
        palletNumbers: options.palletNumbers,
        plNumbers: options.plNumbers,
        projectNumbers: options.projectNumbers,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("supplyItemFilterOptions", {
        projectNumber,
        pwbs: options.pwbs,
        caseNumbers: options.caseNumbers,
        palletNumbers: options.palletNumbers,
        plNumbers: options.plNumbers,
        projectNumbers: options.projectNumbers,
        updatedAt: now,
      });
    }
  },
});

/**
 * Rebuild all filter option caches (global + per-project)
 * Used for initial setup or full refresh
 */
export const rebuildAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all unique project numbers
    const projectNumbersSet = new Set<string>();
    const items = await ctx.db.query("supplyItems").collect();

    for (const item of items) {
      if (item.projectNumber) {
        projectNumbersSet.add(item.projectNumber);
      }
    }

    const projectNumbers = Array.from(projectNumbersSet);

    // Rebuild global cache first
    const globalOptions = await computeFilterOptions(ctx, undefined);
    const existingGlobal = await ctx.db
      .query("supplyItemFilterOptions")
      .withIndex("by_project", (q) => q.eq("projectNumber", undefined))
      .first();

    const now = Date.now();

    if (existingGlobal) {
      await ctx.db.patch(existingGlobal._id, {
        ...globalOptions,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("supplyItemFilterOptions", {
        projectNumber: undefined,
        ...globalOptions,
        updatedAt: now,
      });
    }

    // Rebuild per-project caches
    for (const projectNumber of projectNumbers) {
      const options = await computeFilterOptions(ctx, projectNumber);
      const existing = await ctx.db
        .query("supplyItemFilterOptions")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...options,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("supplyItemFilterOptions", {
          projectNumber,
          ...options,
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      projectsUpdated: projectNumbers.length + 1, // +1 for global
      updatedAt: now,
    };
  },
});
