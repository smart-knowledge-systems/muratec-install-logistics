import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Set a default PWBS dependency that applies to all projects unless overridden
 * Default dependencies serve as templates for new projects
 */
export const setDefaultDependency = mutation({
  args: {
    fromPwbs: v.string(),
    toPwbs: v.string(),
    dependencyType: v.union(
      v.literal("finish_to_start"),
      v.literal("start_to_start"),
      v.literal("none"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if this default dependency already exists
    const existing = await ctx.db
      .query("pwbsDependencies")
      .withIndex("by_from", (q) => q.eq("fromPwbs", args.fromPwbs))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .filter((q) => q.eq(q.field("toPwbs"), args.toPwbs))
      .first();

    if (existing) {
      // Update existing default dependency
      await ctx.db.patch(existing._id, {
        dependencyType: args.dependencyType,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new default dependency
      const id = await ctx.db.insert("pwbsDependencies", {
        fromPwbs: args.fromPwbs,
        toPwbs: args.toPwbs,
        dependencyType: args.dependencyType,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});

/**
 * Set a project-specific PWBS dependency that overrides the default
 * Use this to customize dependencies for specific project requirements
 */
export const setProjectDependency = mutation({
  args: {
    projectNumber: v.string(),
    fromPwbs: v.string(),
    toPwbs: v.string(),
    dependencyType: v.union(
      v.literal("finish_to_start"),
      v.literal("start_to_start"),
      v.literal("none"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if this project-specific dependency already exists
    const existing = await ctx.db
      .query("pwbsDependencies")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .filter((q) => q.eq(q.field("fromPwbs"), args.fromPwbs))
      .filter((q) => q.eq(q.field("toPwbs"), args.toPwbs))
      .first();

    if (existing) {
      // Update existing project dependency
      await ctx.db.patch(existing._id, {
        dependencyType: args.dependencyType,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new project-specific dependency
      const id = await ctx.db.insert("pwbsDependencies", {
        fromPwbs: args.fromPwbs,
        toPwbs: args.toPwbs,
        dependencyType: args.dependencyType,
        isDefault: false,
        projectNumber: args.projectNumber,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    }
  },
});

/**
 * Remove a default PWBS dependency
 */
export const removeDefaultDependency = mutation({
  args: {
    fromPwbs: v.string(),
    toPwbs: v.string(),
  },
  handler: async (ctx, args) => {
    const dependency = await ctx.db
      .query("pwbsDependencies")
      .withIndex("by_from", (q) => q.eq("fromPwbs", args.fromPwbs))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .filter((q) => q.eq(q.field("toPwbs"), args.toPwbs))
      .first();

    if (dependency) {
      await ctx.db.delete(dependency._id);
      return { success: true };
    }

    return { success: false, error: "Dependency not found" };
  },
});

/**
 * Remove a project-specific PWBS dependency override
 */
export const removeProjectDependency = mutation({
  args: {
    projectNumber: v.string(),
    fromPwbs: v.string(),
    toPwbs: v.string(),
  },
  handler: async (ctx, args) => {
    const dependency = await ctx.db
      .query("pwbsDependencies")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .filter((q) => q.eq(q.field("fromPwbs"), args.fromPwbs))
      .filter((q) => q.eq(q.field("toPwbs"), args.toPwbs))
      .first();

    if (dependency) {
      await ctx.db.delete(dependency._id);
      return { success: true };
    }

    return { success: false, error: "Dependency not found" };
  },
});

/**
 * Get all dependencies for a project
 * Returns default dependencies merged with project-specific overrides
 * Project-specific overrides take precedence over defaults
 */
export const getDependencies = query({
  args: {
    projectNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all default dependencies
    const defaultDeps = await ctx.db
      .query("pwbsDependencies")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();

    // If no project specified, return only defaults
    if (!args.projectNumber) {
      return defaultDeps;
    }

    // Get project-specific dependencies
    const projectDeps = await ctx.db
      .query("pwbsDependencies")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();

    // Create a map to track which dependencies have been overridden
    const overrideMap = new Map<string, boolean>();
    for (const dep of projectDeps) {
      const key = `${dep.fromPwbs}->${dep.toPwbs}`;
      overrideMap.set(key, true);
    }

    // Filter out defaults that have been overridden
    const effectiveDefaults = defaultDeps.filter((dep) => {
      const key = `${dep.fromPwbs}->${dep.toPwbs}`;
      return !overrideMap.has(key);
    });

    // Return combined set (project overrides + non-overridden defaults)
    return [...projectDeps, ...effectiveDefaults];
  },
});

/**
 * Get dependencies for a specific PWBS category
 * Returns all dependencies where the given PWBS is the "from" node
 */
export const getDependenciesForPwbs = query({
  args: {
    pwbs: v.string(),
    projectNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all dependencies for this PWBS
    const allDeps = await ctx.db
      .query("pwbsDependencies")
      .withIndex("by_from", (q) => q.eq("fromPwbs", args.pwbs))
      .collect();

    // If no project specified, return only defaults
    if (!args.projectNumber) {
      return allDeps.filter((d) => d.isDefault);
    }

    // Separate defaults and project-specific
    const defaults = allDeps.filter((d) => d.isDefault);
    const projectSpecific = allDeps.filter(
      (d) => !d.isDefault && d.projectNumber === args.projectNumber,
    );

    // Create a map to track which dependencies have been overridden
    const overrideMap = new Map<string, boolean>();
    for (const dep of projectSpecific) {
      const key = `${dep.fromPwbs}->${dep.toPwbs}`;
      overrideMap.set(key, true);
    }

    // Filter out defaults that have been overridden
    const effectiveDefaults = defaults.filter((dep) => {
      const key = `${dep.fromPwbs}->${dep.toPwbs}`;
      return !overrideMap.has(key);
    });

    // Return combined set
    return [...projectSpecific, ...effectiveDefaults];
  },
});

/**
 * Get all default dependencies (template)
 * Useful for showing the base dependency configuration
 */
export const getDefaultDependencies = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("pwbsDependencies")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .collect();
  },
});

/**
 * Get project-specific overrides only
 * Useful for showing what has been customized for a project
 */
export const getProjectOverrides = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pwbsDependencies")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .collect();
  },
});
