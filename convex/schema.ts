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
    .index("by_pl_number", ["plNumber"])
    // Compound indexes for optimized filtering
    .index("by_project_pwbs", ["projectNumber", "pwbs"])
    .index("by_project_case", ["projectNumber", "caseNumber"])
    .index("by_project_pallet", ["projectNumber", "palletNumber"])
    .index("by_project_pl", ["projectNumber", "plNumber"])
    // Search index for text search on description
    .searchIndex("search_items", {
      searchField: "description",
      filterFields: [
        "projectNumber",
        "pwbs",
        "caseNumber",
        "palletNumber",
        "plNumber",
      ],
    }),

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

  // Logistics Tracking Tables
  shipments: defineTable({
    shipmentId: v.string(), // User-defined or auto-generated
    vesselName: v.optional(v.string()),
    voyageNumber: v.optional(v.string()),

    // Ports
    portOfOrigin: v.optional(v.string()), // e.g., "Yokohama"
    portOfDestination: v.optional(v.string()), // e.g., "Long Beach"

    // Milestones
    factoryOutDate: v.optional(v.number()),
    etd: v.optional(v.number()),
    atd: v.optional(v.number()),
    eta: v.optional(v.number()),
    ata: v.optional(v.number()),
    customsClearedDate: v.optional(v.number()),
    deliveredDate: v.optional(v.number()),

    // Original ETA for delay tracking
    originalEta: v.optional(v.number()),

    // Status
    status: v.union(
      v.literal("at_factory"),
      v.literal("in_transit"),
      v.literal("at_port"),
      v.literal("customs"),
      v.literal("delivered"),
    ),

    // Summary (cached)
    caseCount: v.number(),
    totalWeightKg: v.number(),
    projectNumbers: v.array(v.string()),

    // Notes
    notes: v.optional(v.string()),
    delayReason: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_eta", ["eta"])
    .index("by_vessel", ["vesselName", "voyageNumber"]),

  caseShipments: defineTable({
    projectNumber: v.string(),
    caseNumber: v.string(),
    shipmentId: v.optional(v.id("shipments")),

    // Case-specific overrides (if differs from shipment)
    deliveredDate: v.optional(v.number()),
    deliveryNotes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_case", ["projectNumber", "caseNumber"])
    .index("by_shipment", ["shipmentId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("arrival_reminder"),
      v.literal("eta_change"),
      v.literal("shipment_arrived"),
      v.literal("delay_alert"),
    ),
    title: v.string(),
    message: v.string(),
    relatedShipmentId: v.optional(v.id("shipments")),
    relatedProjectNumber: v.optional(v.string()),

    read: v.boolean(),
    readAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // Field Operations Tables
  caseTracking: defineTable({
    projectNumber: v.string(),
    caseNumber: v.string(),

    // Move-in
    moveInStatus: v.union(
      v.literal("expected"),
      v.literal("arrived"),
      v.literal("overdue"),
    ),
    moveInAt: v.optional(v.number()),
    moveInBy: v.optional(v.id("users")),
    caseLocation: v.optional(v.string()),
    damageReported: v.boolean(),
    damageNotes: v.optional(v.string()),
    damagePhotos: v.optional(v.array(v.string())), // file storage IDs

    // Inventory
    inventoryStatus: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("discrepancy"),
    ),
    inventoryAt: v.optional(v.number()),
    inventoryBy: v.optional(v.id("users")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectNumber"])
    .index("by_case", ["projectNumber", "caseNumber"])
    .index("by_move_in_status", ["moveInStatus"])
    .index("by_inventory_status", ["inventoryStatus"]),

  inventoryItems: defineTable({
    projectNumber: v.string(),
    caseNumber: v.string(),
    supplyItemId: v.id("supplyItems"),

    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("missing"),
      v.literal("damaged"),
      v.literal("extra"),
    ),
    expectedQuantity: v.number(),
    actualQuantity: v.optional(v.number()),
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),

    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.id("users")),
  })
    .index("by_case", ["projectNumber", "caseNumber"])
    .index("by_project", ["projectNumber"])
    .index("by_status", ["status"]),

  pickingTasks: defineTable({
    projectNumber: v.string(),
    plNumber: v.string(), // work package
    supplyItemId: v.id("supplyItems"),

    status: v.union(
      v.literal("pending"),
      v.literal("picked"),
      v.literal("partial"),
      v.literal("unavailable"),
    ),
    requiredQuantity: v.number(),
    pickedQuantity: v.optional(v.number()),
    caseNumber: v.optional(v.string()),
    caseLocation: v.optional(v.string()),

    pickedAt: v.optional(v.number()),
    pickedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  })
    .index("by_project", ["projectNumber"])
    .index("by_work_package", ["projectNumber", "plNumber"])
    .index("by_status", ["status"]),

  // Project Scheduling Tables
  pwbsDependencies: defineTable({
    fromPwbs: v.string(),
    toPwbs: v.string(),
    dependencyType: v.union(
      v.literal("finish_to_start"),
      v.literal("start_to_start"),
      v.literal("none"), // parallel
    ),
    isDefault: v.boolean(), // true = applies to all projects unless overridden
    projectNumber: v.optional(v.string()), // set for project-specific override

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_from", ["fromPwbs"])
    .index("by_project", ["projectNumber"]),

  workPackageSchedule: defineTable({
    projectNumber: v.string(),
    plNumber: v.string(),
    plName: v.optional(v.string()),

    // Scheduling
    plannedStart: v.optional(v.number()),
    plannedEnd: v.optional(v.number()),
    actualStart: v.optional(v.number()),
    actualEnd: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()), // days

    // Dependencies (within project)
    predecessors: v.optional(v.array(v.string())), // plNumber references
    dependencyOverride: v.optional(v.boolean()), // true if ignoring PWBS rules

    // Computed/cached fields
    itemCount: v.number(),
    totalQuantity: v.number(),
    totalWeightKg: v.number(),
    pwbsCategories: v.array(v.string()),

    // Status
    scheduleStatus: v.union(
      v.literal("unscheduled"),
      v.literal("scheduled"),
      v.literal("in_progress"),
      v.literal("complete"),
      v.literal("on_hold"),
    ),
    readinessStatus: v.union(
      v.literal("ready"),
      v.literal("partial"),
      v.literal("blocked"),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectNumber"])
    .index("by_pl", ["projectNumber", "plNumber"])
    .index("by_status", ["scheduleStatus"])
    .index("by_planned_start", ["plannedStart"]),

  projects: defineTable({
    projectNumber: v.string(),
    projectName: v.optional(v.string()),
    customer: v.optional(v.string()),
    site: v.optional(v.string()),

    // Timeline
    plannedStart: v.optional(v.number()),
    plannedEnd: v.optional(v.number()),
    actualStart: v.optional(v.number()),
    actualEnd: v.optional(v.number()),

    // Summary stats (cached)
    totalWorkPackages: v.number(),
    completedWorkPackages: v.number(),
    totalItems: v.number(),
    installedItems: v.number(),

    status: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("complete"),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_number", ["projectNumber"])
    .index("by_status", ["status"])
    .index("by_customer", ["customer"]),

  // Installation & EVM Tables
  installationStatus: defineTable({
    supplyItemId: v.id("supplyItems"),
    projectNumber: v.string(),
    plNumber: v.optional(v.string()),

    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("installed"),
      v.literal("issue"),
    ),

    // Timestamps
    startedAt: v.optional(v.number()),
    installedAt: v.optional(v.number()),
    installedBy: v.optional(v.id("users")),

    // Issue tracking
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
    issueReportedAt: v.optional(v.number()),
    issueReportedBy: v.optional(v.id("users")),
    issueResolvedAt: v.optional(v.number()),

    updatedAt: v.number(),
  })
    .index("by_supply_item", ["supplyItemId"])
    .index("by_project", ["projectNumber"])
    .index("by_work_package", ["projectNumber", "plNumber"])
    .index("by_status", ["status"])
    .index("by_installed_date", ["installedAt"]),

  evmSnapshots: defineTable({
    projectNumber: v.string(),
    snapshotDate: v.number(), // start of day timestamp
    scope: v.union(
      v.literal("project"),
      v.literal("pwbs"),
      v.literal("work_package"),
    ),
    scopeId: v.optional(v.string()), // pwbs code or plNumber if not project-level

    // Metrics
    bac: v.number(), // Budget at Completion (total items)
    pv: v.number(), // Planned Value (items scheduled by date)
    ev: v.number(), // Earned Value (items installed by date)
    sv: v.number(), // Schedule Variance
    spi: v.number(), // Schedule Performance Index

    // Derived
    percentComplete: v.number(),
    itemsRemaining: v.number(),
    eac: v.optional(v.number()), // Estimate at Completion

    createdAt: v.number(),
  })
    .index("by_project_date", ["projectNumber", "snapshotDate"])
    .index("by_scope", ["projectNumber", "scope", "scopeId"]),

  // ===== Optimization Cache Tables =====

  // Pre-computed filter options to avoid full table scans
  supplyItemFilterOptions: defineTable({
    projectNumber: v.optional(v.string()), // null = global (all projects)
    pwbs: v.array(v.string()),
    caseNumbers: v.array(v.string()),
    palletNumbers: v.array(v.string()),
    plNumbers: v.array(v.string()),
    projectNumbers: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_project", ["projectNumber"]),

  // Pre-computed EVM metrics cache
  evmCache: defineTable({
    projectNumber: v.string(),
    scope: v.union(
      v.literal("project"),
      v.literal("pwbs"),
      v.literal("work_package"),
    ),
    scopeId: v.optional(v.string()), // pwbs code or plNumber if not project-level

    // Core metrics
    bac: v.number(), // Budget at Completion (total items)
    pv: v.number(), // Planned Value (items scheduled by date)
    ev: v.number(), // Earned Value (items installed by date)
    sv: v.number(), // Schedule Variance
    spi: v.number(), // Schedule Performance Index

    // Derived metrics
    percentComplete: v.number(),
    itemsRemaining: v.number(),
    eac: v.optional(v.number()), // Estimate at Completion

    // Status counts
    notStartedCount: v.number(),
    inProgressCount: v.number(),
    installedCount: v.number(),
    issueCount: v.number(),

    updatedAt: v.number(),
  })
    .index("by_project", ["projectNumber"])
    .index("by_project_scope", ["projectNumber", "scope", "scopeId"]),

  // Pre-computed field dashboard summary cache
  dashboardSummaryCache: defineTable({
    projectNumber: v.string(),

    // Move-in stats
    totalCases: v.number(),
    arrivedCases: v.number(),
    overdueCases: v.number(),
    damagedCases: v.number(),

    // Inventory stats
    completedInventoryCases: v.number(),
    inProgressInventoryCases: v.number(),
    discrepancyCases: v.number(),

    // Picking stats
    totalWorkPackages: v.number(),
    completedWorkPackages: v.number(),
    inProgressWorkPackages: v.number(),

    // Discrepancy counts
    missingItems: v.number(),
    damagedItems: v.number(),
    extraItems: v.number(),

    updatedAt: v.number(),
  }).index("by_project", ["projectNumber"]),
});
