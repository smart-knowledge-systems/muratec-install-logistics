import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

/**
 * Internal helper function to calculate readiness for a work package
 * Shared logic used by both single and batch calculations
 */
async function calculateReadinessInternal(
  ctx: MutationCtx,
  args: { projectNumber: string; plNumber: string },
) {
  // Get the work package schedule record
  const workPackage = await ctx.db
    .query("workPackageSchedule")
    .withIndex("by_pl", (q) =>
      q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
    )
    .first();

  if (!workPackage) {
    throw new Error(
      `Work package ${args.plNumber} not found in project ${args.projectNumber}`,
    );
  }

  // Get all supply items for this work package
  const supplyItems = await ctx.db
    .query("supplyItems")
    .withIndex("by_pl_number", (q) => q.eq("plNumber", args.plNumber))
    .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
    .collect();

  if (supplyItems.length === 0) {
    // No items means we can't assess readiness - mark as blocked
    return {
      workPackageId: workPackage._id,
      projectNumber: args.projectNumber,
      plNumber: args.plNumber,
      readinessStatus: "blocked" as const,
      totalItems: 0,
      inventoriedItems: 0,
      pickedItems: 0,
      inTransitItems: 0,
      missingItems: 0,
      blockedCases: [],
      etaInfo: [],
    };
  }

  const totalItems = supplyItems.length;
  let inventoriedItems = 0;
  let pickedItems = 0;
  let inTransitItems = 0;
  let missingItems = 0;
  const blockedCases = new Set<string>();
  const etaInfo: Array<{
    caseNumber: string;
    shipmentId: string;
    eta: number | undefined;
    status: string;
  }> = [];

  // Check inventory status for each item
  for (const item of supplyItems) {
    if (!item.caseNumber) continue;

    // Check if case has been inventoried
    const caseTracking = await ctx.db
      .query("caseTracking")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", item.caseNumber as string),
      )
      .first();

    const isInventoried =
      caseTracking?.inventoryStatus === "complete" ||
      caseTracking?.inventoryStatus === "discrepancy";

    if (isInventoried) {
      inventoriedItems++;

      // Check if this specific item is verified or has an issue
      const inventoryItem = await ctx.db
        .query("inventoryItems")
        .withIndex("by_case", (q) =>
          q
            .eq("projectNumber", args.projectNumber)
            .eq("caseNumber", item.caseNumber as string),
        )
        .filter((q) => q.eq(q.field("supplyItemId"), item._id))
        .first();

      if (
        inventoryItem?.status === "missing" ||
        inventoryItem?.status === "damaged"
      ) {
        missingItems++;
      }
    } else {
      // Case not inventoried - check if it's in transit
      const caseShipment = await ctx.db
        .query("caseShipments")
        .withIndex("by_case", (q) =>
          q
            .eq("projectNumber", args.projectNumber)
            .eq("caseNumber", item.caseNumber as string),
        )
        .first();

      if (caseShipment?.shipmentId) {
        const shipment = await ctx.db.get(caseShipment.shipmentId);

        if (
          shipment &&
          (shipment.status === "at_factory" ||
            shipment.status === "in_transit" ||
            shipment.status === "at_port" ||
            shipment.status === "customs")
        ) {
          inTransitItems++;
          blockedCases.add(item.caseNumber);

          // Track ETA info for this case (avoid duplicates)
          if (
            !etaInfo.some((info) => info.caseNumber === item.caseNumber) &&
            shipment.eta
          ) {
            etaInfo.push({
              caseNumber: item.caseNumber,
              shipmentId: shipment.shipmentId,
              eta: shipment.eta,
              status: shipment.status,
            });
          }
        }
      }
    }
  }

  // Check picking status
  const pickingTasks = await ctx.db
    .query("pickingTasks")
    .withIndex("by_work_package", (q) =>
      q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
    )
    .collect();

  pickedItems = pickingTasks.filter((task) => task.status === "picked").length;

  // Determine overall readiness status
  let readinessStatus: "ready" | "partial" | "blocked";

  // Blocked: significant items in transit or missing
  const criticalThreshold = 0.2; // 20% or more missing/in-transit is critical
  const unavailableRatio = (inTransitItems + missingItems) / totalItems;

  if (unavailableRatio >= criticalThreshold) {
    readinessStatus = "blocked";
  } else if (inventoriedItems === totalItems && missingItems === 0) {
    // All items inventoried and available
    readinessStatus = "ready";
  } else {
    // Some items available, some pending
    readinessStatus = "partial";
  }

  return {
    workPackageId: workPackage._id,
    projectNumber: args.projectNumber,
    plNumber: args.plNumber,
    readinessStatus,
    totalItems,
    inventoriedItems,
    pickedItems,
    inTransitItems,
    missingItems,
    blockedCases: Array.from(blockedCases),
    etaInfo,
  };
}

/**
 * Calculate material readiness for a work package
 * Checks inventory and picking status for all items in the work package
 * Returns: ready (all available), partial (some available), blocked (critical missing)
 * Also checks if materials are still in transit via shipments
 */
export const calculateReadiness = mutation({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await calculateReadinessInternal(ctx, args);

    // Update work package schedule with readiness status
    await ctx.db.patch(result.workPackageId, {
      readinessStatus: result.readinessStatus,
      updatedAt: Date.now(),
    });

    // Return result without internal workPackageId
    const { workPackageId: _workPackageId, ...publicResult } = result;
    return publicResult;
  },
});

/**
 * Get current readiness status for a work package
 * Read-only query version that doesn't update the database
 */
export const getReadinessStatus = query({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const workPackage = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_pl", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .first();

    if (!workPackage) {
      return null;
    }

    return {
      projectNumber: workPackage.projectNumber,
      plNumber: workPackage.plNumber,
      readinessStatus: workPackage.readinessStatus,
      updatedAt: workPackage.updatedAt,
    };
  },
});

/**
 * Batch calculate readiness for all work packages in a project
 * Useful for updating the entire project after material arrivals or inventory updates
 */
export const calculateProjectReadiness = mutation({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all work packages for this project
    const workPackages = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const results = [];

    // Calculate readiness for each work package
    for (const wp of workPackages) {
      // Use the internal helper function
      const result = await calculateReadinessInternal(ctx, {
        projectNumber: args.projectNumber,
        plNumber: wp.plNumber,
      });

      // Update work package schedule with readiness status
      await ctx.db.patch(result.workPackageId, {
        readinessStatus: result.readinessStatus,
        updatedAt: Date.now(),
      });

      // Store result without internal workPackageId
      const { workPackageId: _workPackageId, ...publicResult } = result;
      results.push(publicResult);
    }

    return {
      projectNumber: args.projectNumber,
      totalWorkPackages: workPackages.length,
      readyCount: results.filter((r) => r.readinessStatus === "ready").length,
      partialCount: results.filter((r) => r.readinessStatus === "partial")
        .length,
      blockedCount: results.filter((r) => r.readinessStatus === "blocked")
        .length,
      results,
    };
  },
});
