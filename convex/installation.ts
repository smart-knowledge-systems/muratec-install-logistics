import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Internal helper function to update installation status
 * Used by both single and bulk update mutations
 */
async function updateInstallationStatusHelper(
  ctx: MutationCtx,
  args: {
    supplyItemId: Id<"supplyItems">;
    projectNumber: string;
    plNumber?: string;
    status: "not_started" | "in_progress" | "installed" | "issue";
    userId: Id<"users">;
    issueType?:
      | "missing_part"
      | "damaged_part"
      | "wrong_part"
      | "site_condition"
      | "other";
    issueNotes?: string;
    issuePhotos?: string[];
  },
) {
  const now = Date.now();

  // Check if item has been picked (warning only, not blocking)
  let pickingWarning: string | null = null;
  if (args.status === "installed" && args.plNumber) {
    const pickingTask = await ctx.db
      .query("pickingTasks")
      .withIndex("by_work_package", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("plNumber", args.plNumber as string),
      )
      .filter((q) => q.eq(q.field("supplyItemId"), args.supplyItemId))
      .first();

    if (pickingTask && pickingTask.status !== "picked") {
      pickingWarning = `Warning: Item has not been picked yet (status: ${pickingTask.status})`;
    }
  }

  // Check if installation status record exists
  const existing = await ctx.db
    .query("installationStatus")
    .withIndex("by_supply_item", (q) => q.eq("supplyItemId", args.supplyItemId))
    .first();

  if (existing) {
    // Update existing record
    const updateData: {
      status: "not_started" | "in_progress" | "installed" | "issue";
      updatedAt: number;
      startedAt?: number;
      installedAt?: number;
      installedBy?: Id<"users">;
      issueType?:
        | "missing_part"
        | "damaged_part"
        | "wrong_part"
        | "site_condition"
        | "other";
      issueNotes?: string;
      issuePhotos?: string[];
      issueReportedAt?: number;
      issueReportedBy?: Id<"users">;
      issueResolvedAt?: number;
    } = {
      status: args.status,
      updatedAt: now,
    };

    // Update timestamps based on status
    if (args.status === "in_progress" && !existing.startedAt) {
      updateData.startedAt = now;
    }

    if (args.status === "installed") {
      updateData.installedAt = now;
      updateData.installedBy = args.userId;
    }

    // Handle issue tracking
    if (args.status === "issue") {
      updateData.issueType = args.issueType;
      updateData.issueNotes = args.issueNotes;
      updateData.issuePhotos = args.issuePhotos;
      updateData.issueReportedAt = now;
      updateData.issueReportedBy = args.userId;
    } else if (existing.status === "issue") {
      // Resolving an issue
      updateData.issueResolvedAt = now;
    }

    await ctx.db.patch(existing._id, updateData);

    return {
      installationStatusId: existing._id,
      warning: pickingWarning,
    };
  } else {
    // Create new installation status record
    const installationStatusId = await ctx.db.insert("installationStatus", {
      supplyItemId: args.supplyItemId,
      projectNumber: args.projectNumber,
      plNumber: args.plNumber,
      status: args.status,
      startedAt: args.status === "in_progress" ? now : undefined,
      installedAt: args.status === "installed" ? now : undefined,
      installedBy: args.status === "installed" ? args.userId : undefined,
      issueType: args.status === "issue" ? args.issueType : undefined,
      issueNotes: args.status === "issue" ? args.issueNotes : undefined,
      issuePhotos: args.status === "issue" ? args.issuePhotos : undefined,
      issueReportedAt: args.status === "issue" ? now : undefined,
      issueReportedBy: args.status === "issue" ? args.userId : undefined,
      updatedAt: now,
    });

    return {
      installationStatusId,
      warning: pickingWarning,
    };
  }
}

/**
 * Update installation status for a single supply item
 * Records installer user and timestamp
 * Warns (not blocks) if marking installed before item was picked
 */
export const updateInstallationStatus = mutation({
  args: {
    supplyItemId: v.id("supplyItems"),
    projectNumber: v.string(),
    plNumber: v.optional(v.string()),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("installed"),
      v.literal("issue"),
    ),
    userId: v.id("users"),
    issueType: v.optional(
      v.union(
        v.literal("missing_part"),
        v.literal("damaged_part"),
        v.literal("wrong_part"),
        v.literal("site_condition"),
        v.literal("other"),
      ),
    ),
    issueNotes: v.optional(v.string()),
    issuePhotos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await updateInstallationStatusHelper(ctx, args);
  },
});

/**
 * Bulk update installation status for multiple items in a work package
 * Useful for marking multiple items as installed at once
 */
export const bulkUpdateInstallStatus = mutation({
  args: {
    supplyItemIds: v.array(v.id("supplyItems")),
    projectNumber: v.string(),
    plNumber: v.optional(v.string()),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("installed"),
      v.literal("issue"),
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const results = [];
    const warnings = [];

    for (const supplyItemId of args.supplyItemIds) {
      const result = await updateInstallationStatusHelper(ctx, {
        supplyItemId,
        projectNumber: args.projectNumber,
        plNumber: args.plNumber,
        status: args.status,
        userId: args.userId,
      });

      results.push(result.installationStatusId);
      if (result.warning) {
        warnings.push({
          supplyItemId,
          warning: result.warning,
        });
      }
    }

    return {
      updatedCount: results.length,
      installationStatusIds: results,
      warnings,
    };
  },
});

/**
 * Get installation status for all items in a work package
 * Returns supply item details with installation status
 * Includes picking status to show readiness for installation
 */
export const getInstallationStatusByWorkPackage = query({
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

    // Get installation status for each item
    const itemsWithStatus = await Promise.all(
      supplyItems.map(async (item) => {
        // Get installation status
        const installStatus = await ctx.db
          .query("installationStatus")
          .withIndex("by_supply_item", (q) => q.eq("supplyItemId", item._id))
          .first();

        // Get picking status
        const pickingTask = await ctx.db
          .query("pickingTasks")
          .withIndex("by_work_package", (q) =>
            q
              .eq("projectNumber", args.projectNumber)
              .eq("plNumber", args.plNumber),
          )
          .filter((q) => q.eq(q.field("supplyItemId"), item._id))
          .first();

        return {
          supplyItemId: item._id,
          itemNumber: item.itemNumber,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity,
          caseNumber: item.caseNumber,
          installationStatus: installStatus?.status ?? "not_started",
          startedAt: installStatus?.startedAt,
          installedAt: installStatus?.installedAt,
          installedBy: installStatus?.installedBy,
          issueType: installStatus?.issueType,
          issueNotes: installStatus?.issueNotes,
          issuePhotos: installStatus?.issuePhotos,
          issueReportedAt: installStatus?.issueReportedAt,
          issueReportedBy: installStatus?.issueReportedBy,
          issueResolvedAt: installStatus?.issueResolvedAt,
          pickingStatus: pickingTask?.status ?? "pending",
          pickedAt: pickingTask?.pickedAt,
        };
      }),
    );

    // Sort by installation status (issues first, then in_progress, not_started, installed last)
    const statusOrder = {
      issue: 0,
      in_progress: 1,
      not_started: 2,
      installed: 3,
    };

    const sortedItems = itemsWithStatus.sort(
      (a, b) =>
        statusOrder[a.installationStatus] - statusOrder[b.installationStatus],
    );

    return sortedItems;
  },
});

/**
 * Get installation progress summary for a work package
 * Returns counts and percentages for each status
 */
export const getWorkPackageInstallationProgress = query({
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

    const totalItems = supplyItems.length;
    const totalQuantity = supplyItems.reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0,
    );

    if (totalItems === 0) {
      return {
        projectNumber: args.projectNumber,
        plNumber: args.plNumber,
        totalItems: 0,
        totalQuantity: 0,
        notStartedCount: 0,
        inProgressCount: 0,
        installedCount: 0,
        issueCount: 0,
        percentComplete: 0,
      };
    }

    // Count items by installation status
    let notStartedCount = 0;
    let inProgressCount = 0;
    let installedCount = 0;
    let issueCount = 0;

    for (const item of supplyItems) {
      const installStatus = await ctx.db
        .query("installationStatus")
        .withIndex("by_supply_item", (q) => q.eq("supplyItemId", item._id))
        .first();

      const status = installStatus?.status ?? "not_started";

      if (status === "not_started") notStartedCount++;
      else if (status === "in_progress") inProgressCount++;
      else if (status === "installed") installedCount++;
      else if (status === "issue") issueCount++;
    }

    const percentComplete =
      totalItems > 0 ? Math.round((installedCount / totalItems) * 100) : 0;

    return {
      projectNumber: args.projectNumber,
      plNumber: args.plNumber,
      totalItems,
      totalQuantity,
      notStartedCount,
      inProgressCount,
      installedCount,
      issueCount,
      percentComplete,
    };
  },
});

/**
 * Get installation progress summary for an entire project
 * Aggregates across all work packages
 */
export const getProjectInstallationProgress = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all supply items for this project
    const supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const totalItems = supplyItems.length;
    const totalQuantity = supplyItems.reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0,
    );

    if (totalItems === 0) {
      return {
        projectNumber: args.projectNumber,
        totalItems: 0,
        totalQuantity: 0,
        notStartedCount: 0,
        inProgressCount: 0,
        installedCount: 0,
        issueCount: 0,
        percentComplete: 0,
      };
    }

    // Count items by installation status
    let notStartedCount = 0;
    let inProgressCount = 0;
    let installedCount = 0;
    let issueCount = 0;

    for (const item of supplyItems) {
      const installStatus = await ctx.db
        .query("installationStatus")
        .withIndex("by_supply_item", (q) => q.eq("supplyItemId", item._id))
        .first();

      const status = installStatus?.status ?? "not_started";

      if (status === "not_started") notStartedCount++;
      else if (status === "in_progress") inProgressCount++;
      else if (status === "installed") installedCount++;
      else if (status === "issue") issueCount++;
    }

    const percentComplete =
      totalItems > 0 ? Math.round((installedCount / totalItems) * 100) : 0;

    return {
      projectNumber: args.projectNumber,
      totalItems,
      totalQuantity,
      notStartedCount,
      inProgressCount,
      installedCount,
      issueCount,
      percentComplete,
    };
  },
});

/**
 * Report an issue during installation
 * Updates status to 'issue' and records issue details
 */
export const reportInstallationIssue = mutation({
  args: {
    supplyItemId: v.id("supplyItems"),
    projectNumber: v.string(),
    plNumber: v.optional(v.string()),
    userId: v.id("users"),
    issueType: v.union(
      v.literal("missing_part"),
      v.literal("damaged_part"),
      v.literal("wrong_part"),
      v.literal("site_condition"),
      v.literal("other"),
    ),
    issueNotes: v.optional(v.string()),
    issuePhotos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await updateInstallationStatusHelper(ctx, {
      supplyItemId: args.supplyItemId,
      projectNumber: args.projectNumber,
      plNumber: args.plNumber,
      status: "issue",
      userId: args.userId,
      issueType: args.issueType,
      issueNotes: args.issueNotes,
      issuePhotos: args.issuePhotos,
    });
  },
});

/**
 * Resolve an installation issue
 * Changes status from 'issue' to 'in_progress' or 'installed'
 */
export const resolveInstallationIssue = mutation({
  args: {
    supplyItemId: v.id("supplyItems"),
    projectNumber: v.string(),
    plNumber: v.optional(v.string()),
    userId: v.id("users"),
    newStatus: v.union(
      v.literal("in_progress"),
      v.literal("installed"),
      v.literal("not_started"),
    ),
  },
  handler: async (ctx, args) => {
    // Get existing installation status
    const existing = await ctx.db
      .query("installationStatus")
      .withIndex("by_supply_item", (q) => q.eq("supplyItemId", args.supplyItemId))
      .first();

    if (!existing || existing.status !== "issue") {
      throw new Error(
        `No installation issue found for supply item ${args.supplyItemId}`,
      );
    }

    // Update status and mark issue as resolved
    return await updateInstallationStatusHelper(ctx, {
      supplyItemId: args.supplyItemId,
      projectNumber: args.projectNumber,
      plNumber: args.plNumber,
      status: args.newStatus,
      userId: args.userId,
    });
  },
});
