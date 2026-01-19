import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Record case arrival at the site
 * Sets moveInStatus to 'arrived' with timestamp and user
 */
export const recordCaseArrival = mutation({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
    userId: v.id("users"),
    caseLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if case tracking record already exists
    const existing = await ctx.db
      .query("caseTracking")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        moveInStatus: "arrived",
        moveInAt: now,
        moveInBy: args.userId,
        caseLocation: args.caseLocation,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new case tracking record
      const caseTrackingId = await ctx.db.insert("caseTracking", {
        projectNumber: args.projectNumber,
        caseNumber: args.caseNumber,
        moveInStatus: "arrived",
        moveInAt: now,
        moveInBy: args.userId,
        caseLocation: args.caseLocation,
        damageReported: false,
        inventoryStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });
      return caseTrackingId;
    }
  },
});

/**
 * Update case location within the site/warehouse
 */
export const setCaseLocation = mutation({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
    caseLocation: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the case tracking record
    const caseTracking = await ctx.db
      .query("caseTracking")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .first();

    if (!caseTracking) {
      throw new Error(
        `Case tracking record not found for project ${args.projectNumber}, case ${args.caseNumber}`,
      );
    }

    // Update location
    await ctx.db.patch(caseTracking._id, {
      caseLocation: args.caseLocation,
      updatedAt: now,
    });

    return caseTracking._id;
  },
});

/**
 * Report damage to a case with notes and photos
 */
export const reportDamage = mutation({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
    damageNotes: v.string(),
    damagePhotos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the case tracking record
    const caseTracking = await ctx.db
      .query("caseTracking")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .first();

    if (!caseTracking) {
      throw new Error(
        `Case tracking record not found for project ${args.projectNumber}, case ${args.caseNumber}`,
      );
    }

    // Update damage information
    await ctx.db.patch(caseTracking._id, {
      damageReported: true,
      damageNotes: args.damageNotes,
      damagePhotos: args.damagePhotos,
      updatedAt: now,
    });

    return caseTracking._id;
  },
});

/**
 * Get move-in progress for a project
 * Returns cases arrived vs total expected
 */
export const getMoveInProgress = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all unique case numbers from supply items for this project
    const supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const uniqueCaseNumbers = new Set<string>();
    for (const item of supplyItems) {
      if (item.caseNumber) {
        uniqueCaseNumbers.add(item.caseNumber);
      }
    }

    const totalCases = uniqueCaseNumbers.size;

    // Get all case tracking records for this project
    const caseTrackingRecords = await ctx.db
      .query("caseTracking")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Count arrived cases
    const arrivedCases = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "arrived",
    ).length;

    // Count overdue cases
    const overdueCases = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "overdue",
    ).length;

    // Count expected cases (not yet arrived or overdue)
    const expectedCases = totalCases - arrivedCases - overdueCases;

    return {
      projectNumber: args.projectNumber,
      totalCases,
      arrivedCases,
      overdueCases,
      expectedCases,
      percentComplete:
        totalCases > 0 ? Math.round((arrivedCases / totalCases) * 100) : 0,
    };
  },
});

/**
 * Get case tracking record by case number
 */
export const getCaseByNumber = query({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const caseTracking = await ctx.db
      .query("caseTracking")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .first();

    return caseTracking;
  },
});

/**
 * Get all case tracking records for a project
 */
export const getCasesByProject = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const caseTrackingRecords = await ctx.db
      .query("caseTracking")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    return caseTrackingRecords;
  },
});
