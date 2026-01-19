import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate pick list for a work package (plNumber)
 * Creates pickingTasks for all items in the work package
 * Sorted by case location for efficient routing
 */
export const generatePickList = mutation({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all supply items for this work package
    const supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_pl_number", (q) => q.eq("plNumber", args.plNumber))
      .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
      .collect();

    if (supplyItems.length === 0) {
      throw new Error(
        `No supply items found for work package ${args.plNumber} in project ${args.projectNumber}`,
      );
    }

    // Check if picking tasks already exist for this work package
    const existingTasks = await ctx.db
      .query("pickingTasks")
      .withIndex("by_work_package", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .collect();

    // If tasks already exist, don't create duplicates
    if (existingTasks.length > 0) {
      return {
        message: `Pick list already exists for work package ${args.plNumber}`,
        tasksCreated: 0,
        existingTasks: existingTasks.length,
      };
    }

    // Get case locations from case tracking
    const caseTrackingMap = new Map<string, string>();
    const caseNumbers = new Set(
      supplyItems.map((item) => item.caseNumber).filter(Boolean) as string[],
    );

    for (const caseNumber of caseNumbers) {
      const caseTracking = await ctx.db
        .query("caseTracking")
        .withIndex("by_case", (q) =>
          q
            .eq("projectNumber", args.projectNumber)
            .eq("caseNumber", caseNumber),
        )
        .first();

      if (caseTracking?.caseLocation) {
        caseTrackingMap.set(caseNumber, caseTracking.caseLocation);
      }
    }

    // Create picking tasks
    const taskIds = [];
    for (const item of supplyItems) {
      const taskId = await ctx.db.insert("pickingTasks", {
        projectNumber: args.projectNumber,
        plNumber: args.plNumber,
        supplyItemId: item._id,
        status: "pending",
        requiredQuantity: item.quantity ?? 0,
        caseNumber: item.caseNumber,
        caseLocation: item.caseNumber
          ? caseTrackingMap.get(item.caseNumber)
          : undefined,
      });
      taskIds.push(taskId);
    }

    return {
      message: `Pick list generated for work package ${args.plNumber}`,
      tasksCreated: taskIds.length,
      existingTasks: 0,
    };
  },
});

/**
 * Update picking status for an item
 * Marks item as picked, partial, or unavailable
 */
export const updatePickStatus = mutation({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
    supplyItemId: v.id("supplyItems"),
    status: v.union(
      v.literal("pending"),
      v.literal("picked"),
      v.literal("partial"),
      v.literal("unavailable"),
    ),
    pickedQuantity: v.optional(v.number()),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the picking task
    const pickingTask = await ctx.db
      .query("pickingTasks")
      .withIndex("by_work_package", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .filter((q) => q.eq(q.field("supplyItemId"), args.supplyItemId))
      .first();

    if (!pickingTask) {
      throw new Error(
        `Picking task not found for supply item ${args.supplyItemId} in work package ${args.plNumber}`,
      );
    }

    // Update picking task
    await ctx.db.patch(pickingTask._id, {
      status: args.status,
      pickedQuantity: args.pickedQuantity,
      pickedAt:
        args.status === "picked" || args.status === "partial" ? now : undefined,
      pickedBy:
        args.status === "picked" || args.status === "partial"
          ? args.userId
          : undefined,
      notes: args.notes,
    });

    return pickingTask._id;
  },
});

/**
 * Get pick list for a work package with current statuses
 * Returns items sorted by case location for efficient routing
 * Includes inventory status to warn about uninventoried cases
 */
export const getPickListByWorkPackage = query({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all picking tasks for this work package
    const pickingTasks = await ctx.db
      .query("pickingTasks")
      .withIndex("by_work_package", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .collect();

    // Get supply item details and inventory status for each task
    const pickListItems = await Promise.all(
      pickingTasks.map(async (task) => {
        const supplyItem = await ctx.db.get(task.supplyItemId);

        // Get case tracking status for inventory info
        let caseInventoried = false;
        if (task.caseNumber) {
          const caseTracking = await ctx.db
            .query("caseTracking")
            .withIndex("by_case", (q) =>
              q
                .eq("projectNumber", args.projectNumber)
                .eq("caseNumber", task.caseNumber as string),
            )
            .first();

          caseInventoried =
            caseTracking?.inventoryStatus === "complete" ||
            caseTracking?.inventoryStatus === "discrepancy";
        }

        return {
          taskId: task._id,
          supplyItemId: task.supplyItemId,
          itemNumber: supplyItem?.itemNumber,
          partNumber: supplyItem?.partNumber,
          description: supplyItem?.description,
          requiredQuantity: task.requiredQuantity,
          pickedQuantity: task.pickedQuantity,
          caseNumber: task.caseNumber,
          caseLocation: task.caseLocation,
          status: task.status,
          pickedAt: task.pickedAt,
          pickedBy: task.pickedBy,
          notes: task.notes,
          caseInventoried,
        };
      }),
    );

    // Sort by case location (nulls last), then by case number
    const sortedItems = pickListItems.sort((a, b) => {
      // Sort by location first (nulls go to end)
      if (!a.caseLocation && !b.caseLocation) return 0;
      if (!a.caseLocation) return 1;
      if (!b.caseLocation) return -1;

      const locCompare = a.caseLocation.localeCompare(b.caseLocation);
      if (locCompare !== 0) return locCompare;

      // Then by case number
      if (!a.caseNumber && !b.caseNumber) return 0;
      if (!a.caseNumber) return 1;
      if (!b.caseNumber) return -1;
      return a.caseNumber.localeCompare(b.caseNumber);
    });

    return sortedItems;
  },
});

/**
 * Get kit readiness status for a work package
 * Returns complete, partial, or not_started based on picking status
 * Considers inventory status when determining readiness
 */
export const getKitReadiness = query({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all picking tasks for this work package
    const pickingTasks = await ctx.db
      .query("pickingTasks")
      .withIndex("by_work_package", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .collect();

    const totalItems = pickingTasks.length;

    if (totalItems === 0) {
      return {
        projectNumber: args.projectNumber,
        plNumber: args.plNumber,
        status: "not_started" as const,
        totalItems: 0,
        pickedItems: 0,
        partialItems: 0,
        unavailableItems: 0,
        pendingItems: 0,
        uninventoriedItems: 0,
        percentComplete: 0,
      };
    }

    // Check inventory status for each task
    let uninventoriedItems = 0;
    for (const task of pickingTasks) {
      if (task.caseNumber) {
        const caseTracking = await ctx.db
          .query("caseTracking")
          .withIndex("by_case", (q) =>
            q
              .eq("projectNumber", args.projectNumber)
              .eq("caseNumber", task.caseNumber as string),
          )
          .first();

        const isInventoried =
          caseTracking?.inventoryStatus === "complete" ||
          caseTracking?.inventoryStatus === "discrepancy";

        if (!isInventoried) {
          uninventoriedItems++;
        }
      }
    }

    // Count items by status
    const pickedItems = pickingTasks.filter(
      (task) => task.status === "picked",
    ).length;
    const partialItems = pickingTasks.filter(
      (task) => task.status === "partial",
    ).length;
    const unavailableItems = pickingTasks.filter(
      (task) => task.status === "unavailable",
    ).length;
    const pendingItems = pickingTasks.filter(
      (task) => task.status === "pending",
    ).length;

    // Determine overall status (considering inventory)
    let status: "not_started" | "partial" | "complete";
    if (pickedItems === totalItems && uninventoriedItems === 0) {
      status = "complete";
    } else if (pickedItems === 0 && partialItems === 0) {
      status = "not_started";
    } else {
      status = "partial";
    }

    // Calculate percent complete (picked + partial items count as progress)
    const completedQuantity = pickingTasks.reduce((sum, task) => {
      if (task.status === "picked") {
        return sum + task.requiredQuantity;
      } else if (task.status === "partial" && task.pickedQuantity) {
        return sum + task.pickedQuantity;
      }
      return sum;
    }, 0);

    const totalQuantity = pickingTasks.reduce(
      (sum, task) => sum + task.requiredQuantity,
      0,
    );

    const percentComplete =
      totalQuantity > 0
        ? Math.round((completedQuantity / totalQuantity) * 100)
        : 0;

    return {
      projectNumber: args.projectNumber,
      plNumber: args.plNumber,
      status,
      totalItems,
      pickedItems,
      partialItems,
      unavailableItems,
      pendingItems,
      uninventoriedItems,
      percentComplete,
    };
  },
});
