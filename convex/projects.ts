import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all projects with optional filtering
 * Returns projects sorted by plannedStart date (earliest first)
 */
export const getProjects = query({
  args: {
    customer: v.optional(v.string()),
    site: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("active"),
        v.literal("on_hold"),
        v.literal("complete"),
      ),
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let projects = await ctx.db.query("projects").collect();

    // Apply filters
    if (args.customer) {
      projects = projects.filter((p) => p.customer === args.customer);
    }
    if (args.site) {
      projects = projects.filter((p) => p.site === args.site);
    }
    if (args.status) {
      projects = projects.filter((p) => p.status === args.status);
    }

    // Date range filter (projects that overlap with the date range)
    if (args.startDate || args.endDate) {
      projects = projects.filter((p) => {
        if (!p.plannedStart || !p.plannedEnd) return false;

        // Check if project timeline overlaps with filter range
        const projectStart = p.plannedStart;
        const projectEnd = p.plannedEnd;

        const rangeStart = args.startDate ?? 0;
        const rangeEnd = args.endDate ?? Number.MAX_SAFE_INTEGER;

        // Overlaps if: project starts before range ends AND project ends after range starts
        return projectStart <= rangeEnd && projectEnd >= rangeStart;
      });
    }

    // Sort by plannedStart date (earliest first), then by projectNumber
    return projects.sort((a, b) => {
      if (a.plannedStart && b.plannedStart) {
        if (a.plannedStart !== b.plannedStart) {
          return a.plannedStart - b.plannedStart;
        }
      } else if (a.plannedStart) {
        return -1; // a has start date, b doesn't - a comes first
      } else if (b.plannedStart) {
        return 1; // b has start date, a doesn't - b comes first
      }

      // Fallback to projectNumber sort
      if (a.projectNumber < b.projectNumber) return -1;
      if (a.projectNumber > b.projectNumber) return 1;
      return 0;
    });
  },
});

/**
 * Get a single project by project number
 */
export const getProjectByNumber = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_project_number", (q) =>
        q.eq("projectNumber", args.projectNumber),
      )
      .first();

    return project;
  },
});

/**
 * Get all unique customers from projects
 */
export const getCustomers = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    const customers = new Set<string>();

    for (const project of projects) {
      if (project.customer) {
        customers.add(project.customer);
      }
    }

    return Array.from(customers).sort();
  },
});

/**
 * Get all unique sites from projects
 */
export const getSites = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    const sites = new Set<string>();

    for (const project of projects) {
      if (project.site) {
        sites.add(project.site);
      }
    }

    return Array.from(sites).sort();
  },
});
