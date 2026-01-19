import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

/**
 * Get field operations dashboard summary for a project
 * Returns move-in progress, inventory progress, picking queue status, and pending actions
 */
export const getFieldDashboard = query({
  args: {
    projectNumber: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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
    let caseTrackingRecords = await ctx.db
      .query("caseTracking")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      caseTrackingRecords = caseTrackingRecords.filter((ct) => {
        if (args.startDate && ct.createdAt < args.startDate) return false;
        if (args.endDate && ct.createdAt > args.endDate) return false;
        return true;
      });
    }

    // Move-in Progress
    const arrivedCases = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "arrived",
    ).length;
    const overdueCases = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "overdue",
    ).length;
    const expectedCases = totalCases - arrivedCases - overdueCases;
    const damagedCases = caseTrackingRecords.filter(
      (ct) => ct.damageReported,
    ).length;

    // Inventory Progress
    const completedInventoryCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "complete",
    ).length;
    const inProgressInventoryCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "in_progress",
    ).length;
    const discrepancyCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "discrepancy",
    ).length;
    const pendingInventoryCases =
      totalCases -
      completedInventoryCases -
      inProgressInventoryCases -
      discrepancyCases;

    // Get all inventory items for discrepancy count
    const inventoryItems = await ctx.db
      .query("inventoryItems")
      .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
      .collect();

    const discrepancyItems = inventoryItems.filter(
      (item) =>
        item.status === "missing" ||
        item.status === "damaged" ||
        item.status === "extra",
    );

    // Get unique work packages for picking progress
    const workPackages = new Set<string>();
    for (const item of supplyItems) {
      if (item.plNumber) {
        workPackages.add(item.plNumber);
      }
    }

    const totalWorkPackages = workPackages.size;

    // Get all picking tasks
    const pickingTasks = await ctx.db
      .query("pickingTasks")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Count work packages with any picking activity
    const workPackagesWithPicking = new Set(
      pickingTasks.map((task) => task.plNumber),
    );
    const workPackagesStarted = workPackagesWithPicking.size;

    // Count completed work packages (all items picked)
    const workPackagePickingStatus = new Map<
      string,
      { total: number; picked: number }
    >();
    for (const task of pickingTasks) {
      const current = workPackagePickingStatus.get(task.plNumber) || {
        total: 0,
        picked: 0,
      };
      current.total++;
      if (task.status === "picked") {
        current.picked++;
      }
      workPackagePickingStatus.set(task.plNumber, current);
    }

    let workPackagesComplete = 0;
    for (const status of workPackagePickingStatus.values()) {
      if (status.total > 0 && status.picked === status.total) {
        workPackagesComplete++;
      }
    }

    const workPackagesPending = totalWorkPackages - workPackagesStarted;

    // Build pending actions list
    const pendingActions = [];

    // Cases to move-in (expected cases)
    const casesToMoveIn = Array.from(uniqueCaseNumbers).filter(
      (caseNumber) =>
        !caseTrackingRecords.some(
          (ct) => ct.caseNumber === caseNumber && ct.moveInStatus === "arrived",
        ),
    );

    if (casesToMoveIn.length > 0) {
      pendingActions.push({
        type: "move_in" as const,
        count: casesToMoveIn.length,
        description: `${casesToMoveIn.length} case${casesToMoveIn.length !== 1 ? "s" : ""} awaiting move-in`,
        priority: "high" as const,
      });
    }

    // Cases to inventory (arrived but not inventoried)
    const casesToInventory = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "arrived" && ct.inventoryStatus === "pending",
    ).length;

    if (casesToInventory > 0) {
      pendingActions.push({
        type: "inventory" as const,
        count: casesToInventory,
        description: `${casesToInventory} case${casesToInventory !== 1 ? "s" : ""} awaiting inventory verification`,
        priority: "medium" as const,
      });
    }

    // Work packages ready for picking (cases inventoried but not picked)
    const workPackagesReadyForPicking = totalWorkPackages - workPackagesStarted;

    if (workPackagesReadyForPicking > 0) {
      pendingActions.push({
        type: "picking" as const,
        count: workPackagesReadyForPicking,
        description: `${workPackagesReadyForPicking} work package${workPackagesReadyForPicking !== 1 ? "s" : ""} ready for picking`,
        priority: "medium" as const,
      });
    }

    // Discrepancies to resolve
    if (discrepancyCases > 0) {
      pendingActions.push({
        type: "discrepancy" as const,
        count: discrepancyCases,
        description: `${discrepancyCases} case${discrepancyCases !== 1 ? "s" : ""} with discrepancies`,
        priority: "high" as const,
      });
    }

    return {
      projectNumber: args.projectNumber,
      summary: {
        moveIn: {
          totalCases,
          arrivedCases,
          expectedCases,
          overdueCases,
          damagedCases,
          percentComplete:
            totalCases > 0 ? Math.round((arrivedCases / totalCases) * 100) : 0,
        },
        inventory: {
          totalCases,
          completedCases: completedInventoryCases,
          inProgressCases: inProgressInventoryCases,
          pendingCases: pendingInventoryCases,
          discrepancyCases,
          percentComplete:
            totalCases > 0
              ? Math.round((completedInventoryCases / totalCases) * 100)
              : 0,
        },
        picking: {
          totalWorkPackages,
          completedWorkPackages: workPackagesComplete,
          inProgressWorkPackages: workPackagesStarted - workPackagesComplete,
          pendingWorkPackages: workPackagesPending,
          percentComplete:
            totalWorkPackages > 0
              ? Math.round((workPackagesComplete / totalWorkPackages) * 100)
              : 0,
        },
      },
      pendingActions,
      discrepancies: {
        totalItems: discrepancyItems.length,
        missingItems: discrepancyItems.filter(
          (item) => item.status === "missing",
        ).length,
        damagedItems: discrepancyItems.filter(
          (item) => item.status === "damaged",
        ).length,
        extraItems: discrepancyItems.filter((item) => item.status === "extra")
          .length,
      },
    };
  },
});

/**
 * Get detailed discrepancy report for a project
 * Returns items with missing, damaged, or extra status
 */
export const getDiscrepancyReport = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all inventory items with discrepancies
    const inventoryItems = await ctx.db
      .query("inventoryItems")
      .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
      .collect();

    const discrepancyItems = inventoryItems.filter(
      (item) =>
        item.status === "missing" ||
        item.status === "damaged" ||
        item.status === "extra",
    );

    // Get supply item details for each discrepancy
    const discrepancies = await Promise.all(
      discrepancyItems.map(async (item) => {
        const supplyItem = await ctx.db.get(item.supplyItemId);
        return {
          inventoryItemId: item._id,
          caseNumber: item.caseNumber,
          status: item.status,
          expectedQuantity: item.expectedQuantity,
          actualQuantity: item.actualQuantity,
          notes: item.notes,
          photos: item.photos,
          verifiedAt: item.verifiedAt,
          verifiedBy: item.verifiedBy,
          supplyItem: {
            itemNumber: supplyItem?.itemNumber,
            partNumber: supplyItem?.partNumber,
            description: supplyItem?.description,
            plNumber: supplyItem?.plNumber,
            pwbs: supplyItem?.pwbs,
          },
        };
      }),
    );

    // Sort by case number, then by status (missing, damaged, extra)
    const sortedDiscrepancies = discrepancies.sort((a, b) => {
      // First by case number
      const caseCompare = (a.caseNumber || "").localeCompare(
        b.caseNumber || "",
      );
      if (caseCompare !== 0) return caseCompare;

      // Then by status priority (missing > damaged > extra)
      const statusPriority: Record<"missing" | "damaged" | "extra", number> = {
        missing: 1,
        damaged: 2,
        extra: 3,
      };
      return (
        (statusPriority[a.status as keyof typeof statusPriority] || 99) -
        (statusPriority[b.status as keyof typeof statusPriority] || 99)
      );
    });

    return sortedDiscrepancies;
  },
});

/**
 * Get cases needing move-in
 * Returns cases that exist in supply items but not in case tracking
 */
export const getCasesNeedingMoveIn = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all unique case numbers from supply items
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

    // Get case tracking records
    const caseTrackingRecords = await ctx.db
      .query("caseTracking")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const arrivedCases = new Set(
      caseTrackingRecords
        .filter((ct) => ct.moveInStatus === "arrived")
        .map((ct) => ct.caseNumber),
    );

    // Find cases not yet arrived
    const casesNeedingMoveIn = Array.from(uniqueCaseNumbers).filter(
      (caseNumber) => !arrivedCases.has(caseNumber),
    );

    return casesNeedingMoveIn.map((caseNumber) => ({
      projectNumber: args.projectNumber,
      caseNumber,
    }));
  },
});

/**
 * Get cases needing inventory verification
 * Returns cases that have arrived but haven't been inventoried
 */
export const getCasesNeedingInventory = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const caseTrackingRecords = await ctx.db
      .query("caseTracking")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const casesNeedingInventory = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "arrived" && ct.inventoryStatus === "pending",
    );

    return casesNeedingInventory.map((ct) => ({
      projectNumber: ct.projectNumber,
      caseNumber: ct.caseNumber,
      moveInAt: ct.moveInAt,
      caseLocation: ct.caseLocation,
    }));
  },
});

/**
 * Get work packages ready for picking
 * Returns work packages that don't have picking tasks yet
 */
export const getWorkPackagesReadyForPicking = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all unique plNumbers from supply items
    const supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const workPackages = new Map<
      string,
      { plNumber: string; plName?: string; itemCount: number }
    >();
    for (const item of supplyItems) {
      if (item.plNumber) {
        const current = workPackages.get(item.plNumber);
        if (current) {
          current.itemCount++;
        } else {
          workPackages.set(item.plNumber, {
            plNumber: item.plNumber,
            plName: item.plName,
            itemCount: 1,
          });
        }
      }
    }

    // Get work packages that already have picking tasks
    const pickingTasks = await ctx.db
      .query("pickingTasks")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const workPackagesWithPicking = new Set(
      pickingTasks.map((task) => task.plNumber),
    );

    // Filter to work packages without picking tasks
    const readyForPicking = Array.from(workPackages.values()).filter(
      (wp) => !workPackagesWithPicking.has(wp.plNumber),
    );

    return readyForPicking.map((wp) => ({
      projectNumber: args.projectNumber,
      plNumber: wp.plNumber,
      plName: wp.plName,
      itemCount: wp.itemCount,
    }));
  },
});

// ========== DASHBOARD CACHE FUNCTIONS ==========

/**
 * Internal helper to calculate dashboard summary stats
 * Used for cache population
 */
async function calculateDashboardStats(
  ctx: MutationCtx,
  projectNumber: string,
) {
  // Batch fetch all relevant data upfront (4 queries instead of unbounded)
  const [supplyItems, caseTrackingRecords, inventoryItems, pickingTasks] =
    await Promise.all([
      ctx.db
        .query("supplyItems")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect(),
      ctx.db
        .query("caseTracking")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect(),
      ctx.db
        .query("inventoryItems")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect(),
      ctx.db
        .query("pickingTasks")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect(),
    ]);

  // Extract unique case numbers and work packages
  const uniqueCaseNumbers = new Set<string>();
  const workPackages = new Set<string>();

  for (const item of supplyItems) {
    if (item.caseNumber) uniqueCaseNumbers.add(item.caseNumber);
    if (item.plNumber) workPackages.add(item.plNumber);
  }

  const totalCases = uniqueCaseNumbers.size;
  const totalWorkPackages = workPackages.size;

  // Calculate move-in stats (single pass)
  let arrivedCases = 0;
  let overdueCases = 0;
  let damagedCases = 0;
  let completedInventoryCases = 0;
  let inProgressInventoryCases = 0;
  let discrepancyCases = 0;

  for (const ct of caseTrackingRecords) {
    if (ct.moveInStatus === "arrived") arrivedCases++;
    if (ct.moveInStatus === "overdue") overdueCases++;
    if (ct.damageReported) damagedCases++;
    if (ct.inventoryStatus === "complete") completedInventoryCases++;
    if (ct.inventoryStatus === "in_progress") inProgressInventoryCases++;
    if (ct.inventoryStatus === "discrepancy") discrepancyCases++;
  }

  // Calculate discrepancy item counts (single pass)
  let missingItems = 0;
  let damagedItems = 0;
  let extraItems = 0;

  for (const item of inventoryItems) {
    if (item.status === "missing") missingItems++;
    if (item.status === "damaged") damagedItems++;
    if (item.status === "extra") extraItems++;
  }

  // Calculate picking stats (single pass)
  const workPackagePickingStatus = new Map<
    string,
    { total: number; picked: number }
  >();

  for (const task of pickingTasks) {
    const current = workPackagePickingStatus.get(task.plNumber) || {
      total: 0,
      picked: 0,
    };
    current.total++;
    if (task.status === "picked") current.picked++;
    workPackagePickingStatus.set(task.plNumber, current);
  }

  let completedWorkPackages = 0;
  let inProgressWorkPackages = 0;

  for (const status of workPackagePickingStatus.values()) {
    if (status.total > 0 && status.picked === status.total) {
      completedWorkPackages++;
    } else if (status.picked > 0) {
      inProgressWorkPackages++;
    }
  }

  return {
    totalCases,
    arrivedCases,
    overdueCases,
    damagedCases,
    completedInventoryCases,
    inProgressInventoryCases,
    discrepancyCases,
    totalWorkPackages,
    completedWorkPackages,
    inProgressWorkPackages,
    missingItems,
    damagedItems,
    extraItems,
  };
}

/**
 * Refresh dashboard cache for a project
 * Call after move-in, inventory, or picking changes
 */
export const refreshDashboardCache = mutation({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const stats = await calculateDashboardStats(ctx, args.projectNumber);

    // Find existing cache entry
    const existing = await ctx.db
      .query("dashboardSummaryCache")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...stats,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("dashboardSummaryCache", {
        projectNumber: args.projectNumber,
        ...stats,
        updatedAt: now,
      });
    }

    return { success: true, updatedAt: now };
  },
});

/**
 * Internal mutation to refresh dashboard cache
 */
export const refreshDashboardCacheInternal = internalMutation({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const stats = await calculateDashboardStats(ctx, args.projectNumber);

    const existing = await ctx.db
      .query("dashboardSummaryCache")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...stats,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("dashboardSummaryCache", {
        projectNumber: args.projectNumber,
        ...stats,
        updatedAt: now,
      });
    }
  },
});

/**
 * Get field dashboard from cache (optimized)
 * Falls back to live calculation if cache is empty
 */
export const getFieldDashboardCached = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to get from cache first
    const cached = await ctx.db
      .query("dashboardSummaryCache")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .first();

    if (cached) {
      const expectedCases =
        cached.totalCases - cached.arrivedCases - cached.overdueCases;
      const pendingInventoryCases =
        cached.totalCases -
        cached.completedInventoryCases -
        cached.inProgressInventoryCases -
        cached.discrepancyCases;
      const pendingWorkPackages =
        cached.totalWorkPackages -
        cached.completedWorkPackages -
        cached.inProgressWorkPackages;

      // Build pending actions
      const pendingActions = [];

      const casesToMoveIn = expectedCases + cached.overdueCases;
      if (casesToMoveIn > 0) {
        pendingActions.push({
          type: "move_in" as const,
          count: casesToMoveIn,
          description: `${casesToMoveIn} case${casesToMoveIn !== 1 ? "s" : ""} awaiting move-in`,
          priority: "high" as const,
        });
      }

      if (pendingInventoryCases > 0) {
        pendingActions.push({
          type: "inventory" as const,
          count: pendingInventoryCases,
          description: `${pendingInventoryCases} case${pendingInventoryCases !== 1 ? "s" : ""} awaiting inventory verification`,
          priority: "medium" as const,
        });
      }

      if (pendingWorkPackages > 0) {
        pendingActions.push({
          type: "picking" as const,
          count: pendingWorkPackages,
          description: `${pendingWorkPackages} work package${pendingWorkPackages !== 1 ? "s" : ""} ready for picking`,
          priority: "medium" as const,
        });
      }

      if (cached.discrepancyCases > 0) {
        pendingActions.push({
          type: "discrepancy" as const,
          count: cached.discrepancyCases,
          description: `${cached.discrepancyCases} case${cached.discrepancyCases !== 1 ? "s" : ""} with discrepancies`,
          priority: "high" as const,
        });
      }

      return {
        projectNumber: args.projectNumber,
        summary: {
          moveIn: {
            totalCases: cached.totalCases,
            arrivedCases: cached.arrivedCases,
            expectedCases,
            overdueCases: cached.overdueCases,
            damagedCases: cached.damagedCases,
            percentComplete:
              cached.totalCases > 0
                ? Math.round((cached.arrivedCases / cached.totalCases) * 100)
                : 0,
          },
          inventory: {
            totalCases: cached.totalCases,
            completedCases: cached.completedInventoryCases,
            inProgressCases: cached.inProgressInventoryCases,
            pendingCases: pendingInventoryCases,
            discrepancyCases: cached.discrepancyCases,
            percentComplete:
              cached.totalCases > 0
                ? Math.round(
                    (cached.completedInventoryCases / cached.totalCases) * 100,
                  )
                : 0,
          },
          picking: {
            totalWorkPackages: cached.totalWorkPackages,
            completedWorkPackages: cached.completedWorkPackages,
            inProgressWorkPackages: cached.inProgressWorkPackages,
            pendingWorkPackages,
            percentComplete:
              cached.totalWorkPackages > 0
                ? Math.round(
                    (cached.completedWorkPackages / cached.totalWorkPackages) *
                      100,
                  )
                : 0,
          },
        },
        pendingActions,
        discrepancies: {
          totalItems:
            cached.missingItems + cached.damagedItems + cached.extraItems,
          missingItems: cached.missingItems,
          damagedItems: cached.damagedItems,
          extraItems: cached.extraItems,
        },
        cachedAt: cached.updatedAt,
      };
    }

    // Fallback to live calculation (expensive)
    // This calls the original getFieldDashboard logic
    const supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const uniqueCaseNumbers = new Set<string>();
    for (const item of supplyItems) {
      if (item.caseNumber) uniqueCaseNumbers.add(item.caseNumber);
    }

    const totalCases = uniqueCaseNumbers.size;

    const caseTrackingRecords = await ctx.db
      .query("caseTracking")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const arrivedCases = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "arrived",
    ).length;
    const overdueCases = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "overdue",
    ).length;
    const expectedCases = totalCases - arrivedCases - overdueCases;
    const damagedCases = caseTrackingRecords.filter(
      (ct) => ct.damageReported,
    ).length;

    const completedInventoryCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "complete",
    ).length;
    const inProgressInventoryCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "in_progress",
    ).length;
    const discrepancyCases = caseTrackingRecords.filter(
      (ct) => ct.inventoryStatus === "discrepancy",
    ).length;
    const pendingInventoryCases =
      totalCases -
      completedInventoryCases -
      inProgressInventoryCases -
      discrepancyCases;

    const inventoryItems = await ctx.db
      .query("inventoryItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const discrepancyItems = inventoryItems.filter(
      (item) =>
        item.status === "missing" ||
        item.status === "damaged" ||
        item.status === "extra",
    );

    const workPackages = new Set<string>();
    for (const item of supplyItems) {
      if (item.plNumber) workPackages.add(item.plNumber);
    }
    const totalWorkPackages = workPackages.size;

    const pickingTasks = await ctx.db
      .query("pickingTasks")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const workPackagePickingStatus = new Map<
      string,
      { total: number; picked: number }
    >();
    for (const task of pickingTasks) {
      const current = workPackagePickingStatus.get(task.plNumber) || {
        total: 0,
        picked: 0,
      };
      current.total++;
      if (task.status === "picked") current.picked++;
      workPackagePickingStatus.set(task.plNumber, current);
    }

    let workPackagesComplete = 0;
    const workPackagesWithPicking = new Set(
      pickingTasks.map((task) => task.plNumber),
    );
    for (const status of workPackagePickingStatus.values()) {
      if (status.total > 0 && status.picked === status.total) {
        workPackagesComplete++;
      }
    }
    const workPackagesPending =
      totalWorkPackages - workPackagesWithPicking.size;

    const pendingActions = [];

    if (expectedCases + overdueCases > 0) {
      const count = expectedCases + overdueCases;
      pendingActions.push({
        type: "move_in" as const,
        count,
        description: `${count} case${count !== 1 ? "s" : ""} awaiting move-in`,
        priority: "high" as const,
      });
    }

    const casesToInventory = caseTrackingRecords.filter(
      (ct) => ct.moveInStatus === "arrived" && ct.inventoryStatus === "pending",
    ).length;
    if (casesToInventory > 0) {
      pendingActions.push({
        type: "inventory" as const,
        count: casesToInventory,
        description: `${casesToInventory} case${casesToInventory !== 1 ? "s" : ""} awaiting inventory verification`,
        priority: "medium" as const,
      });
    }

    if (workPackagesPending > 0) {
      pendingActions.push({
        type: "picking" as const,
        count: workPackagesPending,
        description: `${workPackagesPending} work package${workPackagesPending !== 1 ? "s" : ""} ready for picking`,
        priority: "medium" as const,
      });
    }

    if (discrepancyCases > 0) {
      pendingActions.push({
        type: "discrepancy" as const,
        count: discrepancyCases,
        description: `${discrepancyCases} case${discrepancyCases !== 1 ? "s" : ""} with discrepancies`,
        priority: "high" as const,
      });
    }

    return {
      projectNumber: args.projectNumber,
      summary: {
        moveIn: {
          totalCases,
          arrivedCases,
          expectedCases,
          overdueCases,
          damagedCases,
          percentComplete:
            totalCases > 0 ? Math.round((arrivedCases / totalCases) * 100) : 0,
        },
        inventory: {
          totalCases,
          completedCases: completedInventoryCases,
          inProgressCases: inProgressInventoryCases,
          pendingCases: pendingInventoryCases,
          discrepancyCases,
          percentComplete:
            totalCases > 0
              ? Math.round((completedInventoryCases / totalCases) * 100)
              : 0,
        },
        picking: {
          totalWorkPackages,
          completedWorkPackages: workPackagesComplete,
          inProgressWorkPackages:
            workPackagesWithPicking.size - workPackagesComplete,
          pendingWorkPackages: workPackagesPending,
          percentComplete:
            totalWorkPackages > 0
              ? Math.round((workPackagesComplete / totalWorkPackages) * 100)
              : 0,
        },
      },
      pendingActions,
      discrepancies: {
        totalItems: discrepancyItems.length,
        missingItems: discrepancyItems.filter(
          (item) => item.status === "missing",
        ).length,
        damagedItems: discrepancyItems.filter(
          (item) => item.status === "damaged",
        ).length,
        extraItems: discrepancyItems.filter((item) => item.status === "extra")
          .length,
      },
    };
  },
});
