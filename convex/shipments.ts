import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
