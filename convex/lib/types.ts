/**
 * Shared types for supply list functionality.
 * Defines canonical types used by both Convex queries and frontend components.
 */

/**
 * Valid column names for sorting supply items.
 * Must match the sortBy validator in convex/supplyItems.ts
 */
export type SortableColumn =
  | "itemNumber"
  | "partNumber"
  | "description"
  | "quantity"
  | "caseNumber"
  | "palletNumber"
  | "plNumber"
  | "pwbs"
  | "rowId";
