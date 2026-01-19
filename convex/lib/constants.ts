/**
 * Centralized constants for status values used across Convex functions
 * Using const objects with 'as const' for type safety
 */

/**
 * Picking task status values
 */
export const PICKING_STATUS = {
  PENDING: "pending",
  PICKED: "picked",
  PARTIAL: "partial",
  UNAVAILABLE: "unavailable",
} as const;

export type PickingStatus =
  (typeof PICKING_STATUS)[keyof typeof PICKING_STATUS];

/**
 * Installation status values
 */
export const INSTALLATION_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  INSTALLED: "installed",
  ISSUE: "issue",
} as const;

export type InstallationStatus =
  (typeof INSTALLATION_STATUS)[keyof typeof INSTALLATION_STATUS];

/**
 * Inventory item status values
 */
export const INVENTORY_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  MISSING: "missing",
  DAMAGED: "damaged",
  EXTRA: "extra",
} as const;

export type InventoryStatus =
  (typeof INVENTORY_STATUS)[keyof typeof INVENTORY_STATUS];

/**
 * Case inventory status values
 */
export const CASE_INVENTORY_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETE: "complete",
  DISCREPANCY: "discrepancy",
} as const;

export type CaseInventoryStatus =
  (typeof CASE_INVENTORY_STATUS)[keyof typeof CASE_INVENTORY_STATUS];

/**
 * Work package schedule status values
 */
export const SCHEDULE_STATUS = {
  UNSCHEDULED: "unscheduled",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETE: "complete",
  ON_HOLD: "on_hold",
} as const;

export type ScheduleStatus =
  (typeof SCHEDULE_STATUS)[keyof typeof SCHEDULE_STATUS];

/**
 * Move-in status values for case tracking
 */
export const MOVE_IN_STATUS = {
  EXPECTED: "expected",
  ARRIVED: "arrived",
  OVERDUE: "overdue",
} as const;

export type MoveInStatus = (typeof MOVE_IN_STATUS)[keyof typeof MOVE_IN_STATUS];

/**
 * Issue type values for installation problems
 */
export const ISSUE_TYPE = {
  MISSING_PART: "missing_part",
  DAMAGED_PART: "damaged_part",
  WRONG_PART: "wrong_part",
  SITE_CONDITION: "site_condition",
  OTHER: "other",
} as const;

export type IssueType = (typeof ISSUE_TYPE)[keyof typeof ISSUE_TYPE];

/**
 * Dependency type values for PWBS dependencies
 */
export const DEPENDENCY_TYPE = {
  FINISH_TO_START: "finish_to_start",
  START_TO_START: "start_to_start",
  NONE: "none",
} as const;

export type DependencyType =
  (typeof DEPENDENCY_TYPE)[keyof typeof DEPENDENCY_TYPE];
