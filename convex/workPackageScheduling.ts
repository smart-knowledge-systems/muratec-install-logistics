import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Type for partial work package schedule updates
 */
type WorkPackageScheduleUpdate = {
  scheduleStatus?:
    | "unscheduled"
    | "scheduled"
    | "in_progress"
    | "complete"
    | "on_hold";
  actualStart?: number;
  actualEnd?: number;
  updatedAt: number;
};

/**
 * Validation result for dependency checks
 */
interface DependencyValidation {
  isValid: boolean;
  warnings: string[];
}

/**
 * Validate work package schedule against PWBS dependencies
 * Returns warnings (not hard blocks) for dependency violations
 */
async function validateDependencies(
  ctx: MutationCtx,
  projectNumber: string,
  workPackage: Doc<"workPackageSchedule">,
  plannedStart: number,
  plannedEnd: number,
): Promise<DependencyValidation> {
  // plannedEnd is reserved for future finish-to-finish dependency validation
  void plannedEnd;

  const warnings: string[] = [];

  // Get all dependencies (defaults + project overrides)
  const allDeps = await ctx.db
    .query("pwbsDependencies")
    .filter((q) => q.eq(q.field("isDefault"), true))
    .collect();

  const projectDeps = await ctx.db
    .query("pwbsDependencies")
    .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
    .collect();

  // Build override map
  const overrideMap = new Map<string, Doc<"pwbsDependencies">>();
  for (const dep of projectDeps) {
    const key = `${dep.fromPwbs}->${dep.toPwbs}`;
    overrideMap.set(key, dep);
  }

  // Get effective dependencies for this work package's PWBS categories
  const effectiveDeps: Doc<"pwbsDependencies">[] = [];
  for (const defaultDep of allDeps) {
    const key = `${defaultDep.fromPwbs}->${defaultDep.toPwbs}`;
    if (overrideMap.has(key)) {
      effectiveDeps.push(overrideMap.get(key)!);
      overrideMap.delete(key);
    } else {
      effectiveDeps.push(defaultDep);
    }
  }
  // Add remaining project-specific deps
  effectiveDeps.push(...overrideMap.values());

  // Check dependencies for each PWBS category in this work package
  for (const pwbs of workPackage.pwbsCategories) {
    // Find dependencies where this PWBS depends on another (toPwbs = pwbs)
    const dependsOn = effectiveDeps.filter((d) => d.toPwbs === pwbs);

    for (const dep of dependsOn) {
      // Skip if dependency type is "none" (parallel)
      if (dep.dependencyType === "none") continue;

      // Find predecessor work packages with the fromPwbs category
      const predecessors = await ctx.db
        .query("workPackageSchedule")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect();

      // Filter in memory for PWBS categories (cannot use .includes in Convex filter)
      const filteredPredecessors = predecessors.filter(
        (p) =>
          p._id !== workPackage._id && p.pwbsCategories.includes(dep.fromPwbs),
      );

      for (const pred of filteredPredecessors) {
        if (!pred.plannedStart || !pred.plannedEnd) {
          warnings.push(
            `Work package ${pred.plNumber} (${dep.fromPwbs}) is not scheduled yet but is a predecessor`,
          );
          continue;
        }

        // Validate based on dependency type
        if (dep.dependencyType === "finish_to_start") {
          // This work package should start after predecessor ends
          if (plannedStart < pred.plannedEnd) {
            warnings.push(
              `Finish-to-Start violation: ${workPackage.plNumber} (${pwbs}) should start after ${pred.plNumber} (${dep.fromPwbs}) ends`,
            );
          }
        } else if (dep.dependencyType === "start_to_start") {
          // This work package should start after predecessor starts
          if (plannedStart < pred.plannedStart) {
            warnings.push(
              `Start-to-Start violation: ${workPackage.plNumber} (${pwbs}) should start after ${pred.plNumber} (${dep.fromPwbs}) starts`,
            );
          }
        }
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Calculate downstream work package dates based on dependencies
 * Returns work packages that should be updated
 */
async function calculateDownstreamDates(
  ctx: MutationCtx,
  projectNumber: string,
  updatedWorkPackage: Doc<"workPackageSchedule">,
  plannedEnd: number,
): Promise<Array<{ id: string; plNumber: string; newStart: number }>> {
  const updates: Array<{ id: string; plNumber: string; newStart: number }> = [];

  if (!plannedEnd) return updates;

  // Get all dependencies
  const allDeps = await ctx.db
    .query("pwbsDependencies")
    .filter((q) => q.eq(q.field("isDefault"), true))
    .collect();

  const projectDeps = await ctx.db
    .query("pwbsDependencies")
    .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
    .collect();

  // Build override map
  const overrideMap = new Map<string, Doc<"pwbsDependencies">>();
  for (const dep of projectDeps) {
    const key = `${dep.fromPwbs}->${dep.toPwbs}`;
    overrideMap.set(key, dep);
  }

  // Get effective dependencies
  const effectiveDeps: Doc<"pwbsDependencies">[] = [];
  for (const defaultDep of allDeps) {
    const key = `${defaultDep.fromPwbs}->${defaultDep.toPwbs}`;
    if (overrideMap.has(key)) {
      effectiveDeps.push(overrideMap.get(key)!);
      overrideMap.delete(key);
    } else {
      effectiveDeps.push(defaultDep);
    }
  }
  effectiveDeps.push(...overrideMap.values());

  // Find dependent work packages (where this WP is a predecessor)
  for (const pwbs of updatedWorkPackage.pwbsCategories) {
    // Find dependencies where this PWBS is the predecessor (fromPwbs = pwbs)
    const dependents = effectiveDeps.filter((d) => d.fromPwbs === pwbs);

    for (const dep of dependents) {
      // Skip if dependency type is "none" (parallel)
      if (dep.dependencyType === "none") continue;

      // Find successor work packages with the toPwbs category
      const successors = await ctx.db
        .query("workPackageSchedule")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect();

      // Filter in memory for PWBS categories (cannot use .includes in Convex filter)
      const filteredSuccessors = successors.filter(
        (s) =>
          s._id !== updatedWorkPackage._id &&
          s.pwbsCategories.includes(dep.toPwbs),
      );

      for (const succ of filteredSuccessors) {
        // Calculate suggested new start date based on dependency type
        let suggestedStart: number | null = null;

        if (dep.dependencyType === "finish_to_start") {
          // Successor should start after this WP ends
          suggestedStart = plannedEnd;
        } else if (dep.dependencyType === "start_to_start") {
          // We don't auto-adjust start-to-start, just validate
          continue;
        }

        if (
          suggestedStart &&
          (!succ.plannedStart || succ.plannedStart < suggestedStart)
        ) {
          updates.push({
            id: succ._id,
            plNumber: succ.plNumber,
            newStart: suggestedStart,
          });
        }
      }
    }
  }

  return updates;
}

/**
 * Schedule a work package by setting planned start and end dates
 * Validates against PWBS dependencies and returns warnings
 * Optionally auto-calculates downstream dates when predecessor moves
 */
export const scheduleWorkPackage = mutation({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
    plannedStart: v.number(),
    plannedEnd: v.number(),
    estimatedDuration: v.optional(v.number()), // days
    dependencyOverride: v.optional(v.boolean()), // true to ignore warnings
    cascadeDownstream: v.optional(v.boolean()), // true to auto-update dependent WPs
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the work package
    const workPackage = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_pl", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .first();

    if (!workPackage) {
      throw new Error(
        `Work package ${args.plNumber} not found for project ${args.projectNumber}`,
      );
    }

    // Validate dates
    if (args.plannedStart >= args.plannedEnd) {
      throw new Error("Planned start must be before planned end");
    }

    // Validate against dependencies (unless override is true)
    let validation: DependencyValidation = { isValid: true, warnings: [] };
    if (!args.dependencyOverride) {
      validation = await validateDependencies(
        ctx,
        args.projectNumber,
        workPackage,
        args.plannedStart,
        args.plannedEnd,
      );
    }

    // Update the work package
    await ctx.db.patch(workPackage._id, {
      plannedStart: args.plannedStart,
      plannedEnd: args.plannedEnd,
      estimatedDuration: args.estimatedDuration,
      dependencyOverride: args.dependencyOverride,
      scheduleStatus:
        workPackage.scheduleStatus === "unscheduled"
          ? "scheduled"
          : workPackage.scheduleStatus,
      updatedAt: now,
    });

    // Calculate downstream dates if requested
    let downstreamUpdates: Array<{
      id: string;
      plNumber: string;
      newStart: number;
    }> = [];
    if (args.cascadeDownstream) {
      downstreamUpdates = await calculateDownstreamDates(
        ctx,
        args.projectNumber,
        workPackage,
        args.plannedEnd,
      );
    }

    return {
      success: true,
      workPackageId: workPackage._id,
      validation,
      downstreamUpdates,
    };
  },
});

/**
 * Update work package schedule status
 * Status transitions: unscheduled -> scheduled -> in_progress -> complete
 * Can also set to on_hold from any status
 */
export const updateWorkPackageStatus = mutation({
  args: {
    projectNumber: v.string(),
    plNumber: v.string(),
    scheduleStatus: v.union(
      v.literal("unscheduled"),
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("on_hold"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the work package
    const workPackage = await ctx.db
      .query("workPackageSchedule")
      .withIndex("by_pl", (q) =>
        q.eq("projectNumber", args.projectNumber).eq("plNumber", args.plNumber),
      )
      .first();

    if (!workPackage) {
      throw new Error(
        `Work package ${args.plNumber} not found for project ${args.projectNumber}`,
      );
    }

    // Update status and set actual dates if transitioning to in_progress or complete
    const updates: WorkPackageScheduleUpdate = {
      scheduleStatus: args.scheduleStatus,
      updatedAt: now,
    };

    if (args.scheduleStatus === "in_progress" && !workPackage.actualStart) {
      updates.actualStart = now;
    }

    if (args.scheduleStatus === "complete" && !workPackage.actualEnd) {
      updates.actualEnd = now;
      if (!workPackage.actualStart) {
        updates.actualStart = now;
      }
    }

    await ctx.db.patch(workPackage._id, updates);

    return {
      success: true,
      workPackageId: workPackage._id,
      previousStatus: workPackage.scheduleStatus,
      newStatus: args.scheduleStatus,
    };
  },
});

/**
 * Bulk update downstream work package dates
 * Used after scheduleWorkPackage when cascadeDownstream is true
 */
export const applyDownstreamUpdates = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("workPackageSchedule"),
        newStart: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updated: string[] = [];

    for (const update of args.updates) {
      const workPackage = await ctx.db.get(update.id);
      if (!workPackage) continue;

      // Calculate new end date maintaining duration
      const duration =
        workPackage.plannedEnd && workPackage.plannedStart
          ? workPackage.plannedEnd - workPackage.plannedStart
          : 0;

      const newEnd =
        duration > 0 ? update.newStart + duration : update.newStart;

      await ctx.db.patch(update.id, {
        plannedStart: update.newStart,
        plannedEnd: newEnd,
        updatedAt: now,
      });

      updated.push(workPackage._id);
    }

    return {
      success: true,
      updatedCount: updated.length,
      updatedIds: updated,
    };
  },
});
