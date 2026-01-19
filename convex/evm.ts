import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";

/**
 * EVM Metrics Result
 */
export interface EvmMetrics {
  // Scope identification
  projectNumber: string;
  scope: "project" | "pwbs" | "work_package";
  scopeId?: string; // pwbs code or plNumber if not project-level
  asOfDate: number;

  // Core metrics
  bac: number; // Budget at Completion (total items in scope)
  pv: number; // Planned Value (items scheduled by date)
  ev: number; // Earned Value (items installed by date)
  sv: number; // Schedule Variance (EV - PV)
  spi: number; // Schedule Performance Index (EV / PV)

  // Derived metrics
  percentComplete: number; // (EV / BAC) * 100
  itemsRemaining: number; // BAC - EV
  eac: number | null; // Estimate at Completion (BAC / SPI), null if SPI = 0
  vac: number | null; // Variance at Completion (BAC - EAC), null if EAC is null

  // Breakdowns
  notStartedCount: number;
  inProgressCount: number;
  installedCount: number;
  issueCount: number;
}

/**
 * Calculate Planned Value (PV) - count of items scheduled by asOfDate
 * PV is based on work packages with plannedStart/plannedEnd dates
 */
async function calculatePV(
  ctx: QueryCtx,
  projectNumber: string,
  scope: "project" | "pwbs" | "work_package",
  scopeId: string | undefined,
  asOfDate: number,
): Promise<number> {
  // Get work packages scheduled to be in progress by asOfDate
  const workPackages = await ctx.db
    .query("workPackageSchedule")
    .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
    .collect();

  // Filter work packages that should have started by asOfDate
  const scheduledWorkPackages = workPackages.filter((wp) => {
    // Skip unscheduled work packages
    if (!wp.plannedStart) return false;

    // For work package scope, filter to specific plNumber
    if (scope === "work_package" && wp.plNumber !== scopeId) return false;

    // For PWBS scope, filter to work packages containing that PWBS
    if (scope === "pwbs" && !wp.pwbsCategories.includes(scopeId ?? ""))
      return false;

    // Work package should have started by asOfDate
    return wp.plannedStart <= asOfDate;
  });

  // Count items from scheduled work packages
  let pvCount = 0;

  for (const wp of scheduledWorkPackages) {
    // Get supply items for this work package
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_pl_number", (q) => q.eq("plNumber", wp.plNumber))
      .filter((q) => q.eq(q.field("projectNumber"), projectNumber))
      .collect();

    // For PWBS scope, only count items with matching PWBS
    if (scope === "pwbs") {
      const filtered = items.filter((item) => item.pwbs === scopeId);
      pvCount += filtered.length;
    } else {
      pvCount += items.length;
    }
  }

  return pvCount;
}

/**
 * Calculate Earned Value (EV) - count of items actually installed by asOfDate
 */
async function calculateEV(
  ctx: QueryCtx,
  projectNumber: string,
  scope: "project" | "pwbs" | "work_package",
  scopeId: string | undefined,
  asOfDate: number,
): Promise<{ ev: number; statusCounts: Record<string, number> }> {
  // Get all supply items for the scope
  let supplyItems;

  if (scope === "work_package") {
    // Get items for specific work package
    supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_pl_number", (q) => q.eq("plNumber", scopeId ?? ""))
      .filter((q) => q.eq(q.field("projectNumber"), projectNumber))
      .collect();
  } else if (scope === "pwbs") {
    // Get items for specific PWBS
    supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_pwbs", (q) => q.eq("pwbs", scopeId ?? ""))
      .filter((q) => q.eq(q.field("projectNumber"), projectNumber))
      .collect();
  } else {
    // Get all items for project
    supplyItems = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
      .collect();
  }

  // Batch fetch all installation statuses for this project to avoid N+1
  const allStatuses = await ctx.db
    .query("installationStatus")
    .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
    .collect();

  // Create lookup map by supplyItemId
  const statusMap = new Map(
    allStatuses.map((s) => [s.supplyItemId.toString(), s]),
  );

  // Count items by installation status
  let evCount = 0;
  const statusCounts = {
    not_started: 0,
    in_progress: 0,
    installed: 0,
    issue: 0,
  };

  for (const item of supplyItems) {
    // Get installation status from map (O(1) lookup)
    const installStatus = statusMap.get(item._id.toString());

    const status = installStatus?.status ?? "not_started";

    // Count for status breakdown
    statusCounts[status]++;

    // EV only counts items installed by asOfDate
    if (
      status === "installed" &&
      installStatus?.installedAt &&
      installStatus.installedAt <= asOfDate
    ) {
      evCount++;
    }
  }

  return { ev: evCount, statusCounts };
}

/**
 * Internal helper to calculate EVM metrics
 * Can be called from other queries
 */
async function calculateEvmInternal(
  ctx: QueryCtx,
  args: {
    projectNumber: string;
    scope: "project" | "pwbs" | "work_package";
    scopeId?: string;
    asOfDate: number;
  },
): Promise<EvmMetrics> {
  // Validate scope parameters
  if (args.scope !== "project" && !args.scopeId) {
    throw new Error(`scopeId is required for scope type '${args.scope}'`);
  }

  // Calculate BAC (Budget at Completion) - total items in scope
  let bac = 0;
  if (args.scope === "work_package") {
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_pl_number", (q) => q.eq("plNumber", args.scopeId ?? ""))
      .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
      .collect();
    bac = items.length;
  } else if (args.scope === "pwbs") {
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_pwbs", (q) => q.eq("pwbs", args.scopeId ?? ""))
      .filter((q) => q.eq(q.field("projectNumber"), args.projectNumber))
      .collect();
    bac = items.length;
  } else {
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();
    bac = items.length;
  }

  // Calculate PV (Planned Value)
  const pv = await calculatePV(
    ctx,
    args.projectNumber,
    args.scope,
    args.scopeId,
    args.asOfDate,
  );

  // Calculate EV (Earned Value) and status counts
  const { ev, statusCounts } = await calculateEV(
    ctx,
    args.projectNumber,
    args.scope,
    args.scopeId,
    args.asOfDate,
  );

  // Calculate derived metrics
  const sv = ev - pv; // Schedule Variance
  const spi = pv > 0 ? ev / pv : 0; // Schedule Performance Index
  const percentComplete = bac > 0 ? (ev / bac) * 100 : 0;
  const itemsRemaining = bac - ev;
  const eac = spi > 0 ? bac / spi : null; // Estimate at Completion
  const vac = eac !== null ? bac - eac : null; // Variance at Completion

  return {
    projectNumber: args.projectNumber,
    scope: args.scope,
    scopeId: args.scopeId,
    asOfDate: args.asOfDate,
    bac,
    pv,
    ev,
    sv,
    spi,
    percentComplete,
    itemsRemaining,
    eac,
    vac,
    notStartedCount: statusCounts.not_started,
    inProgressCount: statusCounts.in_progress,
    installedCount: statusCounts.installed,
    issueCount: statusCounts.issue,
  };
}

/**
 * Calculate EVM metrics for a given scope (project, PWBS, or work package)
 * Supports historical calculation with asOfDate parameter
 */
export const calculateEvm = query({
  args: {
    projectNumber: v.string(),
    scope: v.union(
      v.literal("project"),
      v.literal("pwbs"),
      v.literal("work_package"),
    ),
    scopeId: v.optional(v.string()), // pwbs code or plNumber
    asOfDate: v.optional(v.number()), // defaults to now
  },
  handler: async (ctx, args): Promise<EvmMetrics> => {
    const asOfDate = args.asOfDate ?? Date.now();

    return await calculateEvmInternal(ctx, {
      projectNumber: args.projectNumber,
      scope: args.scope,
      scopeId: args.scopeId,
      asOfDate,
    });
  },
});

/**
 * Get current EVM metrics for a project
 * Convenience query that calls calculateEvmInternal with current date
 */
export const getEvmByProject = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args): Promise<EvmMetrics> => {
    return await calculateEvmInternal(ctx, {
      projectNumber: args.projectNumber,
      scope: "project",
      asOfDate: Date.now(),
    });
  },
});

/**
 * Get current EVM metrics for a PWBS category
 */
export const getEvmByPwbs = query({
  args: {
    projectNumber: v.string(),
    pwbsCode: v.string(),
  },
  handler: async (ctx, args): Promise<EvmMetrics> => {
    return await calculateEvmInternal(ctx, {
      projectNumber: args.projectNumber,
      scope: "pwbs",
      scopeId: args.pwbsCode,
      asOfDate: Date.now(),
    });
  },
});

/**
 * Get current EVM metrics for a work package
 */
export const getEvmByWorkPackage = query({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
  },
  handler: async (ctx, args): Promise<EvmMetrics> => {
    return await calculateEvmInternal(ctx, {
      projectNumber: args.projectNumber,
      scope: "work_package",
      scopeId: args.plNumber,
      asOfDate: Date.now(),
    });
  },
});

/**
 * Get EVM metrics for all PWBS categories in a project
 * Useful for dashboard breakdowns
 */
export const getEvmByAllPwbs = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all unique PWBS codes for this project
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    const pwbsCodes = new Set<string>();
    for (const item of items) {
      if (item.pwbs) {
        pwbsCodes.add(item.pwbs);
      }
    }

    // Calculate EVM for each PWBS
    const evmByPwbs: EvmMetrics[] = [];
    for (const pwbsCode of pwbsCodes) {
      const metrics = await calculateEvmInternal(ctx, {
        projectNumber: args.projectNumber,
        scope: "pwbs",
        scopeId: pwbsCode,
        asOfDate: Date.now(),
      });
      evmByPwbs.push(metrics);
    }

    // Sort by SPI ascending (worst first)
    evmByPwbs.sort((a, b) => a.spi - b.spi);

    return evmByPwbs;
  },
});

/**
 * Get EVM metrics for all work packages in a project
 * Useful for Gantt chart coloring and risk identification
 */
export const getEvmByAllWorkPackages = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all work packages for this project
    const workPackages = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Calculate EVM for each work package
    const evmByWorkPackage: EvmMetrics[] = [];
    for (const wp of workPackages) {
      const metrics = await calculateEvmInternal(ctx, {
        projectNumber: args.projectNumber,
        scope: "work_package",
        scopeId: wp.plNumber,
        asOfDate: Date.now(),
      });
      evmByWorkPackage.push(metrics);
    }

    // Sort by SPI ascending (worst first)
    evmByWorkPackage.sort((a, b) => a.spi - b.spi);

    return evmByWorkPackage;
  },
});

/**
 * Get EVM trend data for a project over a date range
 * Returns daily snapshots from evmSnapshots table
 */
export const getEvmTrend = query({
  args: {
    projectNumber: v.string(),
    days: v.number(), // number of days to look back
    scope: v.optional(
      v.union(
        v.literal("project"),
        v.literal("pwbs"),
        v.literal("work_package"),
      ),
    ),
    scopeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = now - args.days * 24 * 60 * 60 * 1000;

    // Get snapshots from the date range
    const snapshots = await ctx.db
      .query("evmSnapshots")
      .withIndex("by_project_date", (q) =>
        q.eq("projectNumber", args.projectNumber),
      )
      .filter((q) => q.gte(q.field("snapshotDate"), startDate))
      .collect();

    // Filter by scope if specified
    const filteredSnapshots = args.scope
      ? snapshots.filter(
          (s) => s.scope === args.scope && s.scopeId === args.scopeId,
        )
      : snapshots.filter((s) => s.scope === "project");

    // Sort by date ascending
    filteredSnapshots.sort((a, b) => a.snapshotDate - b.snapshotDate);

    return filteredSnapshots;
  },
});
