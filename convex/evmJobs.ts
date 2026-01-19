import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Helper to get start of day timestamp (midnight UTC)
 */
function getStartOfDay(date: Date): number {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  return startOfDay.getTime();
}

/**
 * Helper to calculate EVM metrics for a given scope
 * Replicates calculateEvmInternal logic from evm.ts but for internal mutations
 */
async function calculateAndStoreEvmSnapshot(
  ctx: MutationCtx,
  projectNumber: string,
  scope: "project" | "pwbs" | "work_package",
  scopeId: string | undefined,
  snapshotDate: number,
) {
  // Get work packages scheduled to be in progress by snapshotDate
  const workPackages = await ctx.db
    .query("workPackageSchedule")
    .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
    .collect();

  // Calculate BAC (Budget at Completion) - total items in scope
  let supplyItems: Doc<"supplyItems">[] = [];
  if (scope === "work_package") {
    supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_pl_number", (q) => q.eq("plNumber", scopeId ?? ""))
      .filter((q) => q.eq(q.field("projectNumber"), projectNumber))
      .collect();
  } else if (scope === "pwbs") {
    supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_pwbs", (q) => q.eq("pwbs", scopeId ?? ""))
      .filter((q) => q.eq(q.field("projectNumber"), projectNumber))
      .collect();
  } else {
    supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
      .collect();
  }
  const bac = supplyItems.length;

  // Calculate PV (Planned Value) - items scheduled by snapshotDate
  const scheduledWorkPackages = workPackages.filter(
    (wp: Doc<"workPackageSchedule">) => {
      if (!wp.plannedStart) return false;
      if (scope === "work_package" && wp.plNumber !== scopeId) return false;
      if (scope === "pwbs" && !wp.pwbsCategories.includes(scopeId ?? ""))
        return false;
      return wp.plannedStart <= snapshotDate;
    },
  );

  let pv = 0;
  for (const wp of scheduledWorkPackages) {
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_pl_number", (q) => q.eq("plNumber", wp.plNumber))
      .filter((q) => q.eq(q.field("projectNumber"), projectNumber))
      .collect();

    if (scope === "pwbs") {
      const filtered = items.filter(
        (item: Doc<"supplyItems">) => item.pwbs === scopeId,
      );
      pv += filtered.length;
    } else {
      pv += items.length;
    }
  }

  // Calculate EV (Earned Value) - items installed by snapshotDate
  let ev = 0;
  for (const item of supplyItems) {
    const installStatus = await ctx.db
      .query("installationStatus")
      .withIndex("by_supply_item", (q) => q.eq("supplyItemId", item._id))
      .first();

    if (
      installStatus?.status === "installed" &&
      installStatus?.installedAt &&
      installStatus.installedAt <= snapshotDate
    ) {
      ev++;
    }
  }

  // Calculate derived metrics
  const sv = ev - pv;
  const spi = pv > 0 ? ev / pv : 0;
  const percentComplete = bac > 0 ? (ev / bac) * 100 : 0;
  const itemsRemaining = bac - ev;
  const eac = spi > 0 ? bac / spi : undefined;

  // Check if snapshot already exists for this date and scope
  const existingSnapshot = await ctx.db
    .query("evmSnapshots")
    .withIndex("by_project_date", (q) =>
      q.eq("projectNumber", projectNumber).eq("snapshotDate", snapshotDate),
    )
    .filter((q) =>
      q.and(
        q.eq(q.field("scope"), scope),
        scopeId
          ? q.eq(q.field("scopeId"), scopeId)
          : q.eq(q.field("scopeId"), undefined),
      ),
    )
    .first();

  if (existingSnapshot) {
    // Update existing snapshot
    await ctx.db.patch(existingSnapshot._id, {
      bac,
      pv,
      ev,
      sv,
      spi,
      percentComplete,
      itemsRemaining,
      eac,
    });
  } else {
    // Create new snapshot
    await ctx.db.insert("evmSnapshots", {
      projectNumber,
      snapshotDate,
      scope,
      scopeId,
      bac,
      pv,
      ev,
      sv,
      spi,
      percentComplete,
      itemsRemaining,
      eac,
      createdAt: Date.now(),
    });
  }
}

/**
 * Scheduled job to create daily EVM snapshots
 * Runs daily at midnight UTC to:
 * 1. Calculate EVM metrics for each active project at project level
 * 2. Calculate EVM metrics for each PWBS category
 * 3. Calculate EVM metrics for each work package
 */
export const snapshotDailyEvm = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const snapshotDate = getStartOfDay(new Date(now));

    // Get all active projects
    const projects = await ctx.db
      .query("projects")
      .filter((q) => q.neq(q.field("status"), "complete"))
      .collect();

    let projectCount = 0;
    let pwbsCount = 0;
    let workPackageCount = 0;

    for (const project of projects) {
      // 1. Create project-level snapshot
      await calculateAndStoreEvmSnapshot(
        ctx,
        project.projectNumber,
        "project",
        undefined,
        snapshotDate,
      );
      projectCount++;

      // 2. Get all unique PWBS codes for this project
      const items = await ctx.db
        .query("supplyItems")
        .withIndex("by_project", (q) =>
          q.eq("projectNumber", project.projectNumber),
        )
        .collect();

      const pwbsCodes = new Set<string>();
      for (const item of items) {
        if (item.pwbs) {
          pwbsCodes.add(item.pwbs);
        }
      }

      // Create snapshot for each PWBS
      for (const pwbsCode of pwbsCodes) {
        await calculateAndStoreEvmSnapshot(
          ctx,
          project.projectNumber,
          "pwbs",
          pwbsCode,
          snapshotDate,
        );
        pwbsCount++;
      }

      // 3. Get all work packages for this project
      const workPackages = await ctx.db
        .query("workPackageSchedule")
        .withIndex("by_project", (q) =>
          q.eq("projectNumber", project.projectNumber),
        )
        .collect();

      // Create snapshot for each work package
      for (const wp of workPackages) {
        await calculateAndStoreEvmSnapshot(
          ctx,
          project.projectNumber,
          "work_package",
          wp.plNumber,
          snapshotDate,
        );
        workPackageCount++;
      }
    }

    return {
      snapshotDate,
      projectsProcessed: projectCount,
      pwbsSnapshotsCreated: pwbsCount,
      workPackageSnapshotsCreated: workPackageCount,
      timestamp: now,
    };
  },
});
