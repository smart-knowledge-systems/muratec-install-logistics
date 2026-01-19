import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  featureRequests: defineTable({
    title: v.string(),
    description: v.string(),
    prdContent: v.string(),
    userStories: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        asA: v.string(),
        iWant: v.string(),
        soThat: v.string(),
        acceptanceCriteria: v.array(v.string()),
        priority: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low"),
        ),
        estimatedEffort: v.optional(
          v.union(
            v.literal("XS"),
            v.literal("S"),
            v.literal("M"),
            v.literal("L"),
            v.literal("XL"),
          ),
        ),
      }),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
    generationStatus: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("error"),
      ),
    ),
    prompts: v.optional(
      v.array(
        v.object({
          content: v.string(),
          createdAt: v.number(),
        }),
      ),
    ),
    submittedAt: v.optional(v.number()),
    authorId: v.optional(v.id("users")),
    authorEmail: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorEmail"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  analytics: defineTable({
    featureRequestId: v.id("featureRequests"),
    eventType: v.union(
      v.literal("prd_read_more"),
      v.literal("story_field_edit"),
    ),
    fieldType: v.optional(v.string()),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_feature_request", ["featureRequestId"])
    .index("by_event_type", ["eventType"]),

  // Supply List Tables
  supplyItems: defineTable({
    // Row identification
    rowId: v.number(), // Auto-generated consolidated row ID
    sourceRowNumber: v.number(), // Original row in source Excel

    // Source file identification
    sourceFilename: v.string(),
    sourceFileId: v.string(),
    projectNumber: v.string(),
    pwbs: v.string(), // e.g., "K11W"
    pwbsName: v.optional(v.string()), // Denormalized: "Electrical Infrastructure"
    serialNumber: v.string(),
    variant: v.string(),
    detailId: v.optional(v.string()),
    jobNumber: v.optional(v.string()),
    customer: v.optional(v.string()),
    modelCategory: v.optional(v.string()),

    // Item identification
    revision: v.optional(v.string()),
    revisionNote: v.optional(v.string()),
    itemNumber: v.optional(v.string()), // e.g., "K11W-004-001"
    itemSuffix: v.optional(v.string()), // e.g., "001"
    balloonMarker: v.optional(v.string()),
    partNumber: v.optional(v.string()),
    description: v.optional(v.string()),

    // Quantities
    quantity: v.optional(v.number()),
    assemblyCount: v.optional(v.number()),
    packingCount: v.optional(v.number()),

    // Shipping/location
    unitNumber: v.optional(v.string()),
    palletNumber: v.optional(v.string()),
    caseNumber: v.optional(v.string()),
    weightGrams: v.optional(v.number()),
    weightKg: v.optional(v.number()),

    // Notes
    note1: v.optional(v.string()),
    note2: v.optional(v.string()),

    // Part list reference
    plNumber: v.optional(v.string()),
    plName: v.optional(v.string()),

    // Status flags
    isDeleted: v.boolean(),
    deletionNote: v.optional(v.string()),

    // Continuation row linking (packing splits)
    isContinuation: v.boolean(),
    parentItemSuffix: v.optional(v.string()),
    originalDescription: v.optional(v.string()),

    // Metadata
    importedAt: v.number(),
  })
    .index("by_pwbs", ["pwbs"])
    .index("by_project", ["projectNumber"])
    .index("by_item_number", ["itemNumber"])
    .index("by_part_number", ["partNumber"])
    .index("by_case_number", ["caseNumber"])
    .index("by_source_file", ["sourceFileId"])
    .index("by_pallet", ["palletNumber"])
    .index("by_pl_number", ["plNumber"]),

  pwbsCategories: defineTable({
    code: v.string(), // e.g., "K11W"
    name: v.string(), // e.g., "Electrical Infrastructure"
    prefix: v.string(), // "K", "F", or "H"
    prefixDescription: v.string(), // "OHT System", "Stacker/Shelf/Crane", etc.
  })
    .index("by_code", ["code"])
    .index("by_prefix", ["prefix"]),

  supplyImports: defineTable({
    sourceFileId: v.string(),
    sourceFilename: v.string(),
    projectNumber: v.string(),
    rowCount: v.number(),
    importedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  })
    .index("by_file_id", ["sourceFileId"])
    .index("by_project", ["projectNumber"]),

  savedViews: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    isShared: v.boolean(),
    filters: v.object({
      projectNumber: v.optional(v.string()),
      pwbs: v.optional(v.array(v.string())),
      caseNumbers: v.optional(v.array(v.string())),
      palletNumbers: v.optional(v.array(v.string())),
      plNumbers: v.optional(v.array(v.string())),
      isDeleted: v.optional(v.boolean()),
    }),
    columns: v.array(v.string()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_shared", ["isShared"]),
});
