/**
 * Shared constants and types for the AI feature request system.
 *
 * Note: Convex validators (in convex/) cannot import from src/ due to bundling.
 * Keep convex/featureRequests.ts validators in sync manually.
 */

export const PRIORITY_VALUES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITY_VALUES)[number];

export const EFFORT_VALUES = ["XS", "S", "M", "L", "XL"] as const;
export type Effort = (typeof EFFORT_VALUES)[number];

export const STATUS_VALUES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "in_progress",
  "completed",
] as const;
export type Status = (typeof STATUS_VALUES)[number];

export const GENERATION_STATUS_VALUES = [
  "idle",
  "generating",
  "complete",
  "error",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUS_VALUES)[number];
