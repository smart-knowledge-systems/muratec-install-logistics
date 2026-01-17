/**
 * Error categories for granular handling
 */
export enum ErrorCategory {
  /** Filename doesn't match expected pattern */
  FILENAME_PARSE = "FILENAME_PARSE",

  /** Excel file couldn't be read */
  FILE_READ = "FILE_READ",

  /** Expected sheet not found */
  SHEET_NOT_FOUND = "SHEET_NOT_FOUND",

  /** Header metadata extraction failed */
  HEADER_PARSE = "HEADER_PARSE",

  /** Individual row validation failed */
  ROW_VALIDATION = "ROW_VALIDATION",

  /** Data type conversion failed */
  TYPE_CONVERSION = "TYPE_CONVERSION",

  /** Required field is missing */
  REQUIRED_FIELD = "REQUIRED_FIELD",
}

/**
 * Base error class for supply list processing
 */
export class SupplyListError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "SupplyListError";
  }
}

/**
 * Error with source file context
 */
export class FileProcessingError extends SupplyListError {
  constructor(
    message: string,
    category: ErrorCategory,
    public readonly filename: string,
    context?: Record<string, unknown>,
  ) {
    super(message, category, { ...context, filename });
    this.name = "FileProcessingError";
  }
}

/**
 * Error with row-level context
 */
export class RowValidationError extends FileProcessingError {
  constructor(
    message: string,
    filename: string,
    public readonly rowNumber: number,
    public readonly field?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, ErrorCategory.ROW_VALIDATION, filename, {
      ...context,
      rowNumber,
      field,
    });
    this.name = "RowValidationError";
  }
}
