import { z } from "zod";

/**
 * Metadata parsed from the filename
 * Pattern: {id}_SupplyList_{project}{pwbs} {serialNumber}_{variant}.xlsx
 * Example: 591322_SupplyList_92364K11W 008_K11W000101.xlsx
 */
export const FilenameMetadataSchema = z.object({
  /** Full original filename */
  filename: z.string(),

  /** Extracted file ID (e.g., "591322") */
  fileId: z.string(),

  /** Project number (e.g., "92364") */
  projectNumber: z.string(),

  /** PWBS code (e.g., "K11W", "K11R", "K102") */
  pwbs: z.string(),

  /** Serial number (e.g., "008") */
  serialNumber: z.string(),

  /** Variant identifier (e.g., "K11W000101") */
  variant: z.string(),
});

export type FilenameMetadata = z.infer<typeof FilenameMetadataSchema>;

/**
 * Metadata extracted from header rows (rows 4 and 6)
 */
export const HeaderMetadataSchema = z.object({
  /** 明細ID value from row 4 (e.g., "92364K11R _01") */
  detailId: z.string().nullable().default(null),

  /** 作番 (job number) from row 6 */
  jobNumber: z.string().nullable().default(null),

  /** 客先 (customer) from row 6 */
  customer: z.string().nullable().default(null),

  /** 機種 (model category) from row 6, column P - e.g., "M_ｹｰﾌﾞﾙﾎﾙﾀﾞｰ､ﾀﾞｸﾄ..." */
  modelCategory: z.string().nullable().default(null),
});

export type HeaderMetadata = z.infer<typeof HeaderMetadataSchema>;

/**
 * Combined file metadata from filename and header rows
 */
export const FileMetadataSchema = z.object({
  /** Metadata parsed from filename */
  filename: FilenameMetadataSchema,

  /** Metadata extracted from header rows */
  header: HeaderMetadataSchema,

  /** Sheet name (should be "出荷明細一般") */
  sheetName: z.string(),

  /** Total row count in original file */
  totalRows: z.number(),

  /** Data row count (excluding headers) */
  dataRowCount: z.number(),

  /** Processing timestamp */
  processedAt: z.string(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;
