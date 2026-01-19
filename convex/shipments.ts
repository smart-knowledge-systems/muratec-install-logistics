import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { NotFoundError } from "./lib/errors";

/**
 * Create a new shipment
 */
export const createShipment = mutation({
  args: {
    shipmentId: v.string(),
    vesselName: v.optional(v.string()),
    voyageNumber: v.optional(v.string()),
    portOfOrigin: v.optional(v.string()),
    portOfDestination: v.optional(v.string()),
    factoryOutDate: v.optional(v.number()),
    etd: v.optional(v.number()),
    atd: v.optional(v.number()),
    eta: v.optional(v.number()),
    ata: v.optional(v.number()),
    customsClearedDate: v.optional(v.number()),
    deliveredDate: v.optional(v.number()),
    status: v.union(
      v.literal("at_factory"),
      v.literal("in_transit"),
      v.literal("at_port"),
      v.literal("customs"),
      v.literal("delivered"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const shipmentDocId = await ctx.db.insert("shipments", {
      shipmentId: args.shipmentId,
      vesselName: args.vesselName,
      voyageNumber: args.voyageNumber,
      portOfOrigin: args.portOfOrigin,
      portOfDestination: args.portOfDestination,
      factoryOutDate: args.factoryOutDate,
      etd: args.etd,
      atd: args.atd,
      eta: args.eta,
      ata: args.ata,
      customsClearedDate: args.customsClearedDate,
      deliveredDate: args.deliveredDate,
      originalEta: args.eta, // Store initial ETA for delay tracking
      status: args.status,
      caseCount: 0, // Will be updated when cases are assigned
      totalWeightKg: 0,
      projectNumbers: [],
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return shipmentDocId;
  },
});

/**
 * Update shipment details (general update)
 */
export const updateShipment = mutation({
  args: {
    id: v.id("shipments"),
    shipmentId: v.optional(v.string()),
    vesselName: v.optional(v.string()),
    voyageNumber: v.optional(v.string()),
    portOfOrigin: v.optional(v.string()),
    portOfDestination: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("at_factory"),
        v.literal("in_transit"),
        v.literal("at_port"),
        v.literal("customs"),
        v.literal("delivered"),
      ),
    ),
    notes: v.optional(v.string()),
    delayReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, {
        ...filteredUpdates,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Update specific milestone date
 */
export const updateShipmentMilestone = mutation({
  args: {
    id: v.id("shipments"),
    milestone: v.union(
      v.literal("factoryOutDate"),
      v.literal("etd"),
      v.literal("atd"),
      v.literal("eta"),
      v.literal("ata"),
      v.literal("customsClearedDate"),
      v.literal("deliveredDate"),
    ),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, number> = {
      [args.milestone]: args.date,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Update shipment status with automatic milestone date update
 * Used for drag-and-drop status changes in Kanban board
 */
export const updateShipmentStatus = mutation({
  args: {
    id: v.id("shipments"),
    status: v.union(
      v.literal("at_factory"),
      v.literal("in_transit"),
      v.literal("at_port"),
      v.literal("customs"),
      v.literal("delivered"),
    ),
    statusDate: v.number(),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, string | number> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    // Map status to appropriate milestone field
    switch (args.status) {
      case "at_factory":
        updates.factoryOutDate = args.statusDate;
        break;
      case "in_transit":
        updates.atd = args.statusDate; // Actual Time of Departure
        break;
      case "at_port":
        updates.ata = args.statusDate; // Actual Time of Arrival
        break;
      case "customs":
        updates.customsClearedDate = args.statusDate;
        break;
      case "delivered":
        updates.deliveredDate = args.statusDate;
        break;
    }

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Get shipments with optional filters
 */
export const getShipments = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("at_factory"),
        v.literal("in_transit"),
        v.literal("at_port"),
        v.literal("customs"),
        v.literal("delivered"),
      ),
    ),
    projectNumber: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;

    // Use index when filtering by status
    if (args.status) {
      results = await ctx.db
        .query("shipments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      results = await ctx.db.query("shipments").collect();
    }

    // Filter by project number
    if (args.projectNumber) {
      results = results.filter((shipment) =>
        shipment.projectNumbers.includes(args.projectNumber!),
      );
    }

    // Filter by date range (using ETA)
    if (args.startDate || args.endDate) {
      results = results.filter((shipment) => {
        if (!shipment.eta) return false;
        if (args.startDate && shipment.eta < args.startDate) return false;
        if (args.endDate && shipment.eta > args.endDate) return false;
        return true;
      });
    }

    return results;
  },
});

/**
 * Get a single shipment by ID
 */
export const getShipmentById = query({
  args: {
    id: v.id("shipments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Helper function to recalculate and update shipment summary fields
 */
async function updateShipmentSummary(
  ctx: MutationCtx,
  shipmentId: Id<"shipments">,
) {
  // Get all cases for this shipment
  const caseShipments = await ctx.db
    .query("caseShipments")
    .withIndex("by_shipment", (q) => q.eq("shipmentId", shipmentId))
    .collect();

  // Count unique cases
  const caseCount = caseShipments.length;

  // Get unique project numbers
  const projectNumbers = [
    ...new Set(caseShipments.map((cs) => cs.projectNumber)),
  ];

  // Calculate total weight from supply items
  let totalWeightKg = 0;
  for (const caseShipment of caseShipments) {
    const items = await ctx.db
      .query("supplyItems")
      .withIndex("by_case_number", (q) =>
        q.eq("caseNumber", caseShipment.caseNumber),
      )
      .filter((q) => q.eq(q.field("projectNumber"), caseShipment.projectNumber))
      .collect();

    // Sum weightKg for all items in this case
    for (const item of items) {
      if (item.weightKg) {
        totalWeightKg += item.weightKg;
      }
    }
  }

  // Update shipment summary fields
  await ctx.db.patch(shipmentId, {
    caseCount,
    totalWeightKg,
    projectNumbers,
    updatedAt: Date.now(),
  });
}

/**
 * Assign multiple cases to a shipment
 */
export const assignCasesToShipment = mutation({
  args: {
    shipmentId: v.id("shipments"),
    cases: v.array(
      v.object({
        projectNumber: v.string(),
        caseNumber: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const assignedCaseIds = [];

    // Check if shipment exists
    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment) {
      throw new NotFoundError("Shipment", args.shipmentId);
    }

    for (const caseData of args.cases) {
      // Check if case is already assigned to a shipment
      const existing = await ctx.db
        .query("caseShipments")
        .withIndex("by_case", (q) =>
          q
            .eq("projectNumber", caseData.projectNumber)
            .eq("caseNumber", caseData.caseNumber),
        )
        .first();

      if (existing) {
        if (existing.shipmentId === args.shipmentId) {
          // Already assigned to this shipment, skip
          assignedCaseIds.push(existing._id);
          continue;
        } else {
          // Already assigned to a different shipment, update
          await ctx.db.patch(existing._id, {
            shipmentId: args.shipmentId,
            updatedAt: now,
          });
          assignedCaseIds.push(existing._id);

          // Update old shipment summary
          if (existing.shipmentId) {
            await updateShipmentSummary(ctx, existing.shipmentId);
          }
        }
      } else {
        // Create new case-shipment record
        const caseShipmentId = await ctx.db.insert("caseShipments", {
          projectNumber: caseData.projectNumber,
          caseNumber: caseData.caseNumber,
          shipmentId: args.shipmentId,
          createdAt: now,
          updatedAt: now,
        });
        assignedCaseIds.push(caseShipmentId);
      }
    }

    // Update shipment summary
    await updateShipmentSummary(ctx, args.shipmentId);

    return { assignedCount: assignedCaseIds.length, caseIds: assignedCaseIds };
  },
});

/**
 * Remove cases from a shipment
 */
export const removeCasesFromShipment = mutation({
  args: {
    shipmentId: v.id("shipments"),
    cases: v.array(
      v.object({
        projectNumber: v.string(),
        caseNumber: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const removedCount = [];

    // Check if shipment exists
    const shipment = await ctx.db.get(args.shipmentId);
    if (!shipment) {
      throw new NotFoundError("Shipment", args.shipmentId);
    }

    for (const caseData of args.cases) {
      // Find the case-shipment record
      const caseShipment = await ctx.db
        .query("caseShipments")
        .withIndex("by_case", (q) =>
          q
            .eq("projectNumber", caseData.projectNumber)
            .eq("caseNumber", caseData.caseNumber),
        )
        .first();

      if (caseShipment && caseShipment.shipmentId === args.shipmentId) {
        // Clear the shipmentId (unlink from shipment)
        await ctx.db.patch(caseShipment._id, {
          shipmentId: undefined,
          updatedAt: Date.now(),
        });
        removedCount.push(caseShipment._id);
      }
    }

    // Update shipment summary
    await updateShipmentSummary(ctx, args.shipmentId);

    return { removedCount: removedCount.length };
  },
});

/**
 * Get all cases assigned to a shipment
 */
export const getCasesByShipment = query({
  args: {
    shipmentId: v.id("shipments"),
  },
  handler: async (ctx, args) => {
    const caseShipments = await ctx.db
      .query("caseShipments")
      .withIndex("by_shipment", (q) => q.eq("shipmentId", args.shipmentId))
      .collect();

    return caseShipments;
  },
});

/**
 * Get the shipment for a specific case
 */
export const getShipmentForCase = query({
  args: {
    projectNumber: v.string(),
    caseNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the case-shipment record
    const caseShipment = await ctx.db
      .query("caseShipments")
      .withIndex("by_case", (q) =>
        q
          .eq("projectNumber", args.projectNumber)
          .eq("caseNumber", args.caseNumber),
      )
      .first();

    if (!caseShipment || !caseShipment.shipmentId) {
      return null;
    }

    // Get the shipment
    const shipment = await ctx.db.get(caseShipment.shipmentId);
    return shipment;
  },
});
