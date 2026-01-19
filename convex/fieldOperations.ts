import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";

/**
 * Get expected contents of a case from supply items
 * Returns all supply items for a given case
 */
export const getExpectedContents = query({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_case_number", (q) => q.eq("caseNumber", args.caseNumber))
      .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
      .collect();

    return supplyItems;
  },
});

/**
 * Update item verification status during inventory
 * Creates or updates an inventory item record
 */
export const updateItemStatus = mutation({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
    supplyItemId: v.id("supplyItems"),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("missing"),
      v.literal("damaged"),
      v.literal("extra"),
    ),
    expectedQuantity: v.number(),
    actualQuantity: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if inventory item already exists
    const existing = await ctx.db
      .query("inventoryItems")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .filter((q) => q.eq(q.field("supplyItemId"), args.supplyItemId))
      .first();

    if (existing) {
      // Update existing inventory item
      await ctx.db.patch(existing._id, {
        status: args.status,
        actualQuantity: args.actualQuantity,
        verifiedAt: now,
        verifiedBy: args.userId,
      });
      return existing._id;
    } else {
      // Create new inventory item
      const inventoryItemId = await ctx.db.insert("inventoryItems", {
        projectNumber: args.projectNumber,
        caseNumber: args.caseNumber,
        supplyItemId: args.supplyItemId,
        status: args.status,
        expectedQuantity: args.expectedQuantity,
        actualQuantity: args.actualQuantity,
        verifiedAt: now,
        verifiedBy: args.userId,
      });
      return inventoryItemId;
    }
  },
});

/**
 * Add discrepancy details (notes and photos) to an inventory item
 */
export const addDiscrepancyDetails = mutation({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
    supplyItemId: v.id("supplyItems"),
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Find the inventory item
    const inventoryItem = await ctx.db
      .query("inventoryItems")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .filter((q) => q.eq(q.field("supplyItemId"), args.supplyItemId))
      .first();

    if (!inventoryItem) {
      throw new Error(
        `Inventory item not found for supply item ${args.supplyItemId} in case ${args.caseNumber}`,
      );
    }

    // Update with discrepancy details
    await ctx.db.patch(inventoryItem._id, {
      notes: args.notes,
      photos: args.photos,
    });

    return inventoryItem._id;
  },
});

/**
 * Helper to calculate inventory progress for a case (shared by query and mutation)
 */
async function calculateCaseInventoryProgress(
  ctx: QueryCtx | MutationCtx,
  args: { projectNumber: string; caseNumber: string },
) {
  // Get all expected items for this case
  const expectedItems = await ctx.db
    .query("supplyItems")
    .withIndex("by_case_number", (q) => q.eq("caseNumber", args.caseNumber))
    .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
    .collect();

  const totalItems = expectedItems.length;

  // Get all inventory items for this case
  const inventoryItems = await ctx.db
    .query("inventoryItems")
    .withIndex("by_case", (q) =>
      q
        .eq("projectNumber", args.projectNumber)
        .eq("caseNumber", args.caseNumber),
    )
    .collect();

  // Count by status
  const verifiedCount = inventoryItems.filter(
    (item) => item.status === "verified",
  ).length;
  const missingCount = inventoryItems.filter(
    (item) => item.status === "missing",
  ).length;
  const damagedCount = inventoryItems.filter(
    (item) => item.status === "damaged",
  ).length;
  const extraCount = inventoryItems.filter(
    (item) => item.status === "extra",
  ).length;
  const pendingCount = totalItems - inventoryItems.length;

  // Determine overall status
  let overallStatus: "pending" | "in_progress" | "complete" | "discrepancy" =
    "pending";
  if (inventoryItems.length === 0) {
    overallStatus = "pending";
  } else if (verifiedCount === totalItems) {
    overallStatus = "complete";
  } else if (missingCount > 0 || damagedCount > 0 || extraCount > 0) {
    overallStatus = "discrepancy";
  } else {
    overallStatus = "in_progress";
  }

  return {
    projectNumber: args.projectNumber,
    caseNumber: args.caseNumber,
    totalItems,
    verifiedCount,
    missingCount,
    damagedCount,
    extraCount,
    pendingCount,
    percentComplete:
      totalItems > 0 ? Math.round((verifiedCount / totalItems) * 100) : 0,
    overallStatus,
    lastVerifiedBy: inventoryItems[inventoryItems.length - 1]?.verifiedBy,
  };
}

/**
 * Get inventory verification progress for a case (read-only)
 * Returns counts of verified/missing/damaged/pending items
 */
export const getCaseInventoryProgress = query({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return calculateCaseInventoryProgress(ctx, args);
  },
});

/**
 * Sync case tracking with current inventory status
 * Call this after making inventory updates to keep case tracking in sync
 */
export const syncCaseInventoryStatus = mutation({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const progress = await calculateCaseInventoryProgress(ctx, args);

    // Update case tracking with inventory status
    const caseTracking = await ctx.db
      .query("caseTracking")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .first();

    if (caseTracking) {
      await ctx.db.patch(caseTracking._id, {
        inventoryStatus: progress.overallStatus,
        inventoryAt:
          progress.overallStatus === "complete" ||
          progress.overallStatus === "discrepancy"
            ? Date.now()
            : caseTracking.inventoryAt,
        inventoryBy:
          progress.overallStatus === "complete" ||
          progress.overallStatus === "discrepancy"
            ? progress.lastVerifiedBy
            : caseTracking.inventoryBy,
        updatedAt: Date.now(),
      });
    }

    return progress;
  },
});

/**
 * Get overall inventory progress for a project
 * Returns aggregated inventory status across all cases
 */
export const getProjectInventoryProgress = query({
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
    const totalItems = supplyItems.length;

    // Get all case tracking records for this project
    const caseTrackingRecords = await ctx.db
      .query("caseTracking")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Count cases by inventory status
    const completedCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "complete",
    ).length;
    const inProgressCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "in_progress",
    ).length;
    const discrepancyCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "discrepancy",
    ).length;
    const pendingCases =
      totalCases - completedCases - inProgressCases - discrepancyCases;

    // Get all inventory items for this project using index
    const allInventoryItems = await ctx.db
      .query("inventoryItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Count items by status
    const verifiedItemsCount = allInventoryItems.filter(
      (item) => item.status === "verified",
    ).length;
    const missingItemsCount = allInventoryItems.filter(
      (item) => item.status === "missing",
    ).length;
    const damagedItemsCount = allInventoryItems.filter(
      (item) => item.status === "damaged",
    ).length;
    const extraItemsCount = allInventoryItems.filter(
      (item) => item.status === "extra",
    ).length;

    return {
      projectNumber: args.projectNumber,
      totalCases,
      completedCases,
      inProgressCases,
      discrepancyCases,
      pendingCases,
      percentCasesComplete:
        totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0,
      totalItems,
      verifiedItemsCount,
      missingItemsCount,
      damagedItemsCount,
      extraItemsCount,
      percentItemsVerified:
        totalItems > 0
          ? Math.round((verifiedItemsCount / totalItems) * 100)
          : 0,
    };
  },
});
