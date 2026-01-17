import type {
  ConsolidatedDataset,
  ConsolidatedRow,
  ValidationError,
  FlatRow,
} from "../schemas";
import { processFile, type FileProcessorOptions } from "./file.processor";
import { flattenRows, toCSV, type CSVOptions } from "../utils/csv.utils";

export interface BatchProcessorOptions extends FileProcessorOptions {
  /** Callback for progress reporting */
  onProgress?: (processed: number, total: number, currentFile: string) => void;
  /** Callback when a file completes */
  onFileComplete?: (
    filename: string,
    success: boolean,
    rowCount: number,
    errorCount: number,
  ) => void;
}

export interface FileInput {
  filename: string;
  buffer: ArrayBuffer | Buffer;
}

/**
 * Processes multiple Excel files and consolidates into a single dataset
 *
 * @param files - Array of file inputs (filename + buffer pairs)
 * @param options - Processing options
 * @returns Consolidated dataset with all rows and error tracking
 */
export async function processFiles(
  files: FileInput[],
  options: BatchProcessorOptions = {},
): Promise<ConsolidatedDataset> {
  const { onProgress, onFileComplete } = options;

  const allRows: ConsolidatedRow[] = [];
  const allErrors: ValidationError[] = [];
  const failedFiles: Array<{ filename: string; error: string }> = [];

  let filesSucceeded = 0;
  let globalRowId = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    onProgress?.(i + 1, files.length, file.filename);

    const result = processFile(file.filename, file.buffer, options);

    if (result.success) {
      filesSucceeded++;

      // Reassign global row IDs
      for (const row of result.rows) {
        allRows.push({
          ...row,
          rowId: globalRowId++,
        });
      }

      allErrors.push(...result.validationErrors);

      onFileComplete?.(
        file.filename,
        true,
        result.rows.length,
        result.validationErrors.length,
      );
    } else {
      failedFiles.push({
        filename: file.filename,
        error: result.error || "Unknown error",
      });

      onFileComplete?.(file.filename, false, 0, 0);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    filesProcessed: files.length,
    filesSucceeded,
    filesFailed: failedFiles.length,
    totalValidationErrors: allErrors.length,
    totalRows: allRows.length,
    rows: allRows,
    validationErrors: allErrors,
    failedFiles,
  };
}

/**
 * Re-export flattenRows from utils
 */
export { flattenRows } from "../utils/csv.utils";

/**
 * Generates CSV string from consolidated dataset
 */
export function datasetToCSV(
  dataset: ConsolidatedDataset,
  options?: CSVOptions,
): string {
  return toCSV(flattenRows(dataset.rows), options);
}

/**
 * Generates a summary report of the processing results
 */
export function generateReport(dataset: ConsolidatedDataset): string {
  const lines: string[] = [
    "=".repeat(60),
    "Supply List Processing Report",
    "=".repeat(60),
    "",
    `Generated: ${dataset.generatedAt}`,
    "",
    "Summary:",
    `  Files Processed: ${dataset.filesProcessed}`,
    `  Files Succeeded: ${dataset.filesSucceeded}`,
    `  Files Failed:    ${dataset.filesFailed}`,
    `  Total Rows:      ${dataset.totalRows}`,
    `  Validation Errors: ${dataset.totalValidationErrors}`,
    "",
  ];

  if (dataset.failedFiles.length > 0) {
    lines.push("Failed Files:");
    for (const { filename, error } of dataset.failedFiles) {
      lines.push(`  - ${filename}`);
      lines.push(`    Error: ${error}`);
    }
    lines.push("");
  }

  if (dataset.validationErrors.length > 0) {
    lines.push("Validation Errors (first 20):");
    const errorsToShow = dataset.validationErrors.slice(0, 20);
    for (const err of errorsToShow) {
      lines.push(`  - ${err.filename}:${err.rowNumber} [${err.field}]`);
      lines.push(`    ${err.message}`);
      lines.push(`    Value: ${JSON.stringify(err.originalValue)}`);
    }
    if (dataset.validationErrors.length > 20) {
      lines.push(
        `  ... and ${dataset.validationErrors.length - 20} more errors`,
      );
    }
    lines.push("");
  }

  // PWBS breakdown
  const pwbsCounts = new Map<string, number>();
  for (const row of dataset.rows) {
    const pwbs = row.source.pwbs;
    pwbsCounts.set(pwbs, (pwbsCounts.get(pwbs) || 0) + 1);
  }

  if (pwbsCounts.size > 0) {
    lines.push("Rows by PWBS:");
    const sortedPwbs = [...pwbsCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [pwbs, count] of sortedPwbs) {
      lines.push(`  ${pwbs}: ${count} rows`);
    }
    lines.push("");
  }

  lines.push("=".repeat(60));

  return lines.join("\n");
}

/**
 * Gets unique values for a field across the dataset
 */
export function getUniqueValues<K extends keyof FlatRow>(
  dataset: ConsolidatedDataset,
  field: K,
): Set<FlatRow[K]> {
  const flat = flattenRows(dataset.rows);
  return new Set(flat.map((row) => row[field]));
}
