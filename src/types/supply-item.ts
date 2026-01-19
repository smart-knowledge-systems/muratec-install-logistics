/**
 * Type definition for SupplyItem matching Convex schema
 *
 * Centralized to avoid duplication across components
 */
export interface SupplyItem {
  _id: string;
  _creationTime: number;
  rowId: number;
  itemNumber?: string;
  partNumber?: string;
  description?: string;
  quantity?: number;
  caseNumber?: string;
  palletNumber?: string;
  plNumber?: string;
  pwbs: string;
  pwbsName?: string;
  projectNumber: string;
  weightKg?: number;
  isDeleted: boolean;
}
