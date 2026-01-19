import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

/**
 * Query supply items with comprehensive filtering, text search, pagination, and sorting
 *
 * Filters:
 * - projectNumber: exact match on project
 * - pwbs: multi-select array of PWBS codes (OR logic)
 * - caseNumbers: multi-select array of case numbers (OR logic)
 * - palletNumbers: multi-select array of pallet numbers (OR logic)
 * - plNumbers: multi-select array of work package numbers (OR logic)
 * - isDeleted: filter by deletion status
 * - searchText: searches across itemNumber, partNumber, and description
 *
 * Sorting:
 * - sortBy: column name to sort by
 * - sortOrder: "asc" or "desc"
 *
 * Pagination:
 * - Uses Convex cursor-based pagination
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    projectNumber: v.optional(v.string()),
    pwbs: v.optional(v.array(v.string())),
    caseNumbers: v.optional(v.array(v.string())),
    palletNumbers: v.optional(v.array(v.string())),
    plNumbers: v.optional(v.array(v.string())),
    isDeleted: v.optional(v.boolean()),
    searchText: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const {
      paginationOpts,
      projectNumber,
      pwbs,
      caseNumbers,
      palletNumbers,
      plNumbers,
      isDeleted,
      searchText,
      sortBy,
      sortOrder,
    } = args;

    // Use indexed query when possible for better performance
    let results;
    if (projectNumber) {
      results = await ctx.db
        .query("supplyItems")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect();
    } else if (pwbs && pwbs.length === 1) {
      results = await ctx.db
        .query("supplyItems")
        .withIndex("by_pwbs", (q) => q.eq("pwbs", pwbs[0]))
        .collect();
    } else if (caseNumbers && caseNumbers.length === 1) {
      results = await ctx.db
        .query("supplyItems")
        .withIndex("by_case_number", (q) => q.eq("caseNumber", caseNumbers[0]))
        .collect();
    } else if (palletNumbers && palletNumbers.length === 1) {
      results = await ctx.db
        .query("supplyItems")
        .withIndex("by_pallet", (q) => q.eq("palletNumber", palletNumbers[0]))
        .collect();
    } else if (plNumbers && plNumbers.length === 1) {
      results = await ctx.db
        .query("supplyItems")
        .withIndex("by_pl_number", (q) => q.eq("plNumber", plNumbers[0]))
        .collect();
    } else {
      results = await ctx.db.query("supplyItems").collect();
    }

    let filteredResults = results;

    // Filter by pwbs array (OR logic)
    if (pwbs && pwbs.length > 0) {
      filteredResults = filteredResults.filter((item) =>
        pwbs.includes(item.pwbs),
      );
    }

    // Filter by caseNumbers array (OR logic)
    if (caseNumbers && caseNumbers.length > 0) {
      filteredResults = filteredResults.filter(
        (item) => item.caseNumber && caseNumbers.includes(item.caseNumber),
      );
    }

    // Filter by palletNumbers array (OR logic)
    if (palletNumbers && palletNumbers.length > 0) {
      filteredResults = filteredResults.filter(
        (item) =>
          item.palletNumber && palletNumbers.includes(item.palletNumber),
      );
    }

    // Filter by plNumbers array (OR logic)
    if (plNumbers && plNumbers.length > 0) {
      filteredResults = filteredResults.filter(
        (item) => item.plNumber && plNumbers.includes(item.plNumber),
      );
    }

    // Filter by deletion status
    if (isDeleted !== undefined) {
      filteredResults = filteredResults.filter(
        (item) => item.isDeleted === isDeleted,
      );
    }

    // Text search across itemNumber, partNumber, description
    if (searchText && searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filteredResults = filteredResults.filter((item) => {
        const itemNumberMatch = item.itemNumber
          ?.toLowerCase()
          .includes(searchLower);
        const partNumberMatch = item.partNumber
          ?.toLowerCase()
          .includes(searchLower);
        const descriptionMatch = item.description
          ?.toLowerCase()
          .includes(searchLower);
        return itemNumberMatch || partNumberMatch || descriptionMatch;
      });
    }

    // Sort results
    if (sortBy) {
      const order = sortOrder === "desc" ? -1 : 1;
      filteredResults.sort((a, b) => {
        const aValue = (a as Record<string, unknown>)[sortBy];
        const bValue = (b as Record<string, unknown>)[sortBy];

        // Handle null/undefined values
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        // Compare values
        if (aValue < bValue) return -order;
        if (aValue > bValue) return order;
        return 0;
      });
    } else {
      // Default sort by rowId for consistent ordering
      filteredResults.sort((a, b) => a.rowId - b.rowId);
    }

    // Manual pagination since we did client-side filtering
    const { cursor, numItems } = paginationOpts;
    const startIndex = cursor ? parseInt(cursor as string, 10) : 0;
    const endIndex = startIndex + numItems;

    const paginatedResults = filteredResults.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredResults.length;
    const newCursor = hasMore ? endIndex.toString() : null;

    return {
      page: paginatedResults,
      continueCursor: newCursor,
      isDone: !hasMore,
    };
  },
});

/**
 * Get a single supply item by ID
 */
export const getById = query({
  args: { id: v.id("supplyItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get unique values for filter dropdowns
 */
export const getFilterOptions = query({
  args: {
    projectNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items;

    const { projectNumber } = args;
    if (projectNumber) {
      items = await ctx.db
        .query("supplyItems")
        .withIndex("by_project", (q) => q.eq("projectNumber", projectNumber))
        .collect();
    } else {
      items = await ctx.db.query("supplyItems").collect();
    }

    // Extract unique values for each filter
    const pwbsSet = new Set<string>();
    const caseNumbersSet = new Set<string>();
    const palletNumbersSet = new Set<string>();
    const plNumbersSet = new Set<string>();
    const projectNumbersSet = new Set<string>();

    for (const item of items) {
      if (item.pwbs) pwbsSet.add(item.pwbs);
      if (item.caseNumber) caseNumbersSet.add(item.caseNumber);
      if (item.palletNumber) palletNumbersSet.add(item.palletNumber);
      if (item.plNumber) plNumbersSet.add(item.plNumber);
      if (item.projectNumber) projectNumbersSet.add(item.projectNumber);
    }

    return {
      pwbs: Array.from(pwbsSet).sort(),
      caseNumbers: Array.from(caseNumbersSet).sort(),
      palletNumbers: Array.from(palletNumbersSet).sort(),
      plNumbers: Array.from(plNumbersSet).sort(),
      projectNumbers: Array.from(projectNumbersSet).sort(),
    };
  },
});

/**
 * Get summary statistics for a project
 */
export const getProjectSummary = query({
  args: {
    projectNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_project", (q) => q.eq("projectNumber", args.projectNumber))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();

    const totalItems = items.length;
    const totalQuantity = items.reduce(
      (sum, item) => sum + (item.quantity ?? 0),
      0,
    );
    const totalWeightKg = items.reduce(
      (sum, item) => sum + (item.weightKg ?? 0),
      0,
    );

    const cases = new Set(
      items.map((item) => item.caseNumber).filter((c) => c),
    );
    const pallets = new Set(
      items.map((item) => item.palletNumber).filter((p) => p),
    );

    return {
      totalItems,
      totalQuantity,
      totalWeightKg,
      totalCases: cases.size,
      totalPallets: pallets.size,
    };
  },
});
