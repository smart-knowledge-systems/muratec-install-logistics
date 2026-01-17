/**
 * Muratec Supply List Processing Library
 *
 * A strongly-typed TypeScript library for processing Muratec supply list
 * Excel files with Zod validation.
 *
 * @example
 * ```typescript
 * import { processFiles, datasetToCSV, generateReport } from "@/lib/supply-list";
 *
 * const files = [
 *   { filename: "591322_SupplyList_92364K11W 008_K11W000101.xlsx", buffer },
 * ];
 *
 * const dataset = await processFiles(files);
 * const csv = datasetToCSV(dataset);
 * console.log(generateReport(dataset));
 * ```
 */

// Schema exports
export {
  // Supply Item
  SupplyItemSchema,
  RawExcelRowSchema,
  COLUMN_MAP,
  FIELD_TO_COLUMN,
  computeItemNumber,
  splitPlValue,
  type SupplyItem,
  type RawExcelRow,
  // File Metadata
  FilenameMetadataSchema,
  HeaderMetadataSchema,
  FileMetadataSchema,
  type FilenameMetadata,
  type HeaderMetadata,
  type FileMetadata,
  // Consolidated Output
  SourceInfoSchema,
  ConsolidatedRowSchema,
  ValidationErrorSchema,
  FileProcessingResultSchema,
  ConsolidatedDatasetSchema,
  FlatRowSchema,
  type SourceInfo,
  type ConsolidatedRow,
  type ValidationError,
  type FileProcessingResult,
  type ConsolidatedDataset,
  type FlatRow,
} from "./schemas";

// Parser exports
export {
  parseFilename,
  isValidSupplyListFilename,
  extractPwbs,
  type FilenameParseResult,
  parseExcelBuffer,
  extractHeaderMetadata,
  worksheetToRows,
  isEmptyRow,
  getDataRowCount,
  EXPECTED_SHEET_NAME,
  ROW_DATA_START,
  ROW_HEADER_EN,
  ROW_HEADER_JP,
  ROW_METADATA_DETAIL_ID,
  ROW_METADATA_JOB,
  type ExcelParseOptions,
  type ExcelParseResult,
  type ExtendedRawExcelRow,
} from "./parsers";

// Validator exports
export {
  validateRow,
  validateRows,
  mapRowToFields,
  formatZodErrors,
  type RowValidationResult,
  type BatchValidationResult,
} from "./validators";

// Processor exports
export {
  processFile,
  createConsolidatedRow,
  type FileProcessorOptions,
  processFiles,
  flattenRows,
  datasetToCSV,
  generateReport,
  getUniqueValues,
  type BatchProcessorOptions,
  type FileInput,
} from "./processors";

// Utils exports
export {
  flattenRow,
  toCSV,
  consolidatedToCSV,
  CSV_COLUMNS,
  type CSVOptions,
} from "./utils";

// Error exports
export {
  SupplyListError,
  FileProcessingError,
  RowValidationError,
  ErrorCategory,
} from "./types";
