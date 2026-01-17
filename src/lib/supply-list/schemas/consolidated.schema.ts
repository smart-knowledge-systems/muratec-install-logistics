import { z } from "zod";
import { SupplyItemSchema } from "./supply-item.schema";
import { FileMetadataSchema } from "./file-metadata.schema";

/**
 * Source file identification (flattened for easy access)
 */
export const SourceInfoSchema = z.object({
  filename: z.string(),
  fileId: z.string(),
  projectNumber: z.string(),
  pwbs: z.string(),
  serialNumber: z.string(),
  variant: z.string(),
  detailId: z.string().nullable(),
  jobNumber: z.string().nullable(),
  customer: z.string().nullable(),
  modelCategory: z.string().nullable(),
});

export type SourceInfo = z.infer<typeof SourceInfoSchema>;

/**
 * A single row in the consolidated output
 */
export const ConsolidatedRowSchema = z.object({
  /** Auto-generated row ID for the consolidated dataset */
  rowId: z.number(),

  /** Original row number in source Excel file (1-based) */
  sourceRowNumber: z.number(),

  /** Supply item data */
  item: SupplyItemSchema,

  /** Source file identification */
  source: SourceInfoSchema,
});

export type ConsolidatedRow = z.infer<typeof ConsolidatedRowSchema>;

/**
 * Validation error for a specific row
 */
export const ValidationErrorSchema = z.object({
  /** Source filename */
  filename: z.string(),

  /** Row number in original file (1-based) */
  rowNumber: z.number(),

  /** Field that failed validation */
  field: z.string(),

  /** Original value that caused the error */
  originalValue: z.unknown(),

  /** Error message */
  message: z.string(),

  /** Zod error code */
  code: z.string(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

/**
 * Processing result for a single file
 */
export const FileProcessingResultSchema = z.object({
  /** Whether processing succeeded (file was readable) */
  success: z.boolean(),

  /** File metadata */
  metadata: FileMetadataSchema.optional(),

  /** Validated rows (may include rows with partial null values) */
  rows: z.array(ConsolidatedRowSchema),

  /** Validation errors for individual fields */
  validationErrors: z.array(ValidationErrorSchema),

  /** Fatal error message if success is false */
  error: z.string().optional(),
});

export type FileProcessingResult = z.infer<typeof FileProcessingResultSchema>;

/**
 * Final consolidated dataset output
 */
export const ConsolidatedDatasetSchema = z.object({
  /** Dataset generation timestamp */
  generatedAt: z.string(),

  /** Total files processed */
  filesProcessed: z.number(),

  /** Files that succeeded */
  filesSucceeded: z.number(),

  /** Files that failed completely */
  filesFailed: z.number(),

  /** Total validation errors across all files */
  totalValidationErrors: z.number(),

  /** Total rows in dataset */
  totalRows: z.number(),

  /** All consolidated rows */
  rows: z.array(ConsolidatedRowSchema),

  /** All validation errors for debugging */
  validationErrors: z.array(ValidationErrorSchema),

  /** List of failed files with error messages */
  failedFiles: z.array(
    z.object({
      filename: z.string(),
      error: z.string(),
    }),
  ),
});

export type ConsolidatedDataset = z.infer<typeof ConsolidatedDatasetSchema>;

/**
 * CSV-compatible flat row for export
 */
export const FlatRowSchema = z.object({
  // Row identification
  rowId: z.number(),
  sourceRowNumber: z.number(),

  // Source file info
  sourceFilename: z.string(),
  sourceFileId: z.string(),
  projectNumber: z.string(),
  pwbs: z.string(),
  serialNumber: z.string(),
  variant: z.string(),
  detailId: z.string().nullable(),
  jobNumber: z.string().nullable(),
  customer: z.string().nullable(),
  modelCategory: z.string().nullable(),

  // Item data
  revision: z.string().nullable(),
  revisionNote: z.string().nullable(),
  itemNumber: z.string().nullable(),
  itemSuffix: z.string().nullable(),
  balloonMarker: z.string().nullable(),
  partNumber: z.string().nullable(),
  description: z.string().nullable(),
  quantity: z.number().nullable(),
  assemblyCount: z.number().nullable(),
  packingCount: z.number().nullable(),
  unitNumber: z.string().nullable(),
  palletNumber: z.string().nullable(),
  caseNumber: z.string().nullable(),
  weightGrams: z.number().nullable(),
  weightKg: z.number().nullable(),
  note1: z.string().nullable(),
  note2: z.string().nullable(),
  plNumber: z.string().nullable(),
  plName: z.string().nullable(),

  // Deletion status
  isDeleted: z.boolean(),
  deletionNote: z.string().nullable(),

  // Continuation row linking (for packing splits - 梱包分割)
  isContinuation: z.boolean(),
  parentItemSuffix: z.string().nullable(),
  originalDescription: z.string().nullable(),
});

export type FlatRow = z.infer<typeof FlatRowSchema>;
