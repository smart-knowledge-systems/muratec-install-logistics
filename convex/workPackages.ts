import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Aggregate supply items into work packages
 * Creates or updates workPackageSchedule records from supplyItems
 * Computes summary statistics: itemCount, totalQuantity, totalWeightKg, pwbsCategories
 */
export const aggregateWorkPackages = mutation({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all non-deleted supply items for the project
    const supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    // Group items by plNumber
    const workPackageMap = new Map<
      string,
      {
        plName: string | undefined;
        items: (typeof supplyItems)[0][];
        itemCount: number;
        totalQuantity: number;
        totalWeightKg: number;
        pwbsSet: Set<string>;
      }
    >();

    for (const item of supplyItems) {
      // Skip items without plNumber
      if (!item.plNumber) continue;

      if (!workPackageMap.has(item.plNumber)) {
        workPackageMap.set(item.plNumber, {
          plName: item.plName,
          items: [],
          itemCount: 0,
          totalQuantity: 0,
          totalWeightKg: 0,
          pwbsSet: new Set(),
        });
      }

      const wp = workPackageMap.get(item.plNumber)!;
      wp.items.push(item);
      wp.itemCount++;
      wp.totalQuantity += item.quantity ?? 0;
      wp.totalWeightKg += item.weightKg ?? 0;
      if (item.pwbs) {
        wp.pwbsSet.add(item.pwbs);
      }
    }

    const now = Date.now();
    const createdIds: string[] = [];
    const updatedIds: string[] = [];

    // Create or update workPackageSchedule records
    for (const [plNumber, data] of workPackageMap) {
      const pwbsCategories = Array.from(data.pwbsSet).sort();

      // Check if work package already exists
      const existing = await ctx.db
        .query("workPackageSchedule")
        .withIndex("by_pl", (q) =>
          q.eq("projectNumber", args.projectNumber).eq("plNumber", plNumber),
        )
        .first();

      if (existing) {
        // Update existing record with new aggregated data
        await ctx.db.patch(existing._id, {
          plName: data.plName,
          itemCount: data.itemCount,
          totalQuantity: data.totalQuantity,
          totalWeightKg: data.totalWeightKg,
          pwbsCategories,
          updatedAt: now,
        });
        updatedIds.push(existing._id);
      } else {
        // Create new work package schedule record
        const id = await ctx.db.insert("workPackageSchedule", {
          projectNumber: args.projectNumber,
          plNumber,
          plName: data.plName,
          itemCount: data.itemCount,
          totalQuantity: data.totalQuantity,
          totalWeightKg: data.totalWeightKg,
          pwbsCategories,
          scheduleStatus: "unscheduled",
          readinessStatus: "blocked",
          createdAt: now,
          updatedAt: now,
        });
        createdIds.push(id);
      }
    }

    return {
      created: createdIds.length,
      updated: updatedIds.length,
      totalWorkPackages: workPackageMap.size,
    };
  },
});

/**
 * Get all work packages for a project
 * Returns work packages sorted by plNumber
 */
export const getWorkPackages = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const workPackages = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Sort by plNumber for consistent ordering
    return workPackages.sort((a, b) => {
      if (a.plNumber < b.plNumber) return -1;
      if (a.plNumber > b.plNumber) return 1;
      return 0;
    });
  },
});

/**
 * Get a single work package by plNumber with its items
 * Returns the work package schedule record and all associated supply items
 */
export const getWorkPackageByPlNumber = query({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the work package schedule record
    const workPackage = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_pl", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .first();

    if (!workPackage) {
      return null;
    }

    // Get all supply items for this work package
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_pl_number", (q) => q.eq("plNumber", args.plNumber))
      .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    return {
      workPackage,
      items,
    };
  },
});

/**
 * Get work packages that have installation issues
 * Returns work packages with count of items in "issue" status
 */
export const getWorkPackagesWithIssues = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all work packages for the project
    const workPackages = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Get all installation statuses with issues for this project
    const issueStatuses = await ctx.db
      .query("installationStatus")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .filter((q) => q.eq(q.field("status"), "issue"))
      .collect();

    // Count issues per work package
    const issueCountByWp = new Map<string, number>();
    for (const status of issueStatuses) {
      if (status.plNumber) {
        issueCountByWp.set(
          status.plNumber,
          (issueCountByWp.get(status.plNumber) || 0) + 1,
        );
      }
    }

    // Filter to only work packages with issues and add issue count
    const workPackagesWithIssues = workPackages
      .filter((wp) => issueCountByWp.has(wp.plNumber))
      .map((wp) => ({
        ...wp,
        issueCount: issueCountByWp.get(wp.plNumber) || 0,
      }))
      .sort((a, b) => b.issueCount - a.issueCount); // Sort by issue count descending

    return workPackagesWithIssues;
  },
});
