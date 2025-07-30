export interface CsvSplitOptions {
  maxLinesPerFile: number;
  includeHeader: boolean;
}

import Papa from 'papaparse';

export interface SplitResult {
  chunks: string[];
  totalChunks: number;
  originalLineCount: number;
}

/**
 * Parses CSV content and splits it into smaller chunks
 * @param csvContent - The raw CSV content as a string
 * @param options - Configuration options for splitting
 * @returns Split result containing the chunks and metadata
 */
export function splitCsv(csvContent: string, options: CsvSplitOptions): SplitResult {
  if (!csvContent || csvContent.trim().length === 0) {
    throw new Error('CSV content cannot be empty');
  }

  if (options.maxLinesPerFile <= 0) {
    throw new Error('maxLinesPerFile must be greater than 0');
  }

  const lines = csvContent.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV content contains no lines');
  }

  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // If we only have a header and no data, return empty result
  if (dataLines.length === 0) {
    return {
      chunks: options.includeHeader ? [header] : [''],
      totalChunks: 1,
      originalLineCount: lines.length
    };
  }

  const chunks: string[] = [];
  const effectiveMaxLines = options.includeHeader ? options.maxLinesPerFile - 1 : options.maxLinesPerFile;

  // Split data lines into chunks
  for (let i = 0; i < dataLines.length; i += effectiveMaxLines) {
    const chunkDataLines = dataLines.slice(i, i + effectiveMaxLines);
    
    let chunkContent = '';
    if (options.includeHeader) {
      chunkContent = header + '\n' + chunkDataLines.join('\n');
    } else {
      chunkContent = chunkDataLines.join('\n');
    }
    
    chunks.push(chunkContent);
  }

  return {
    chunks,
    totalChunks: chunks.length,
    originalLineCount: lines.length
  };
}

/**
 * Creates a downloadable blob from CSV content
 * @param content - CSV content as string
 * @param filename - Name for the file
 * @returns Blob URL that can be used for downloading
 */
export function createCsvBlob(content: string, filename: string): { blob: Blob; url: string; filename: string } {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  return {
    blob,
    url,
    filename: filename.endsWith('.csv') ? filename : `${filename}.csv`
  };
}

/**
 * Triggers a download for a CSV blob
 * @param blobInfo - Blob information from createCsvBlob
 */
export function downloadCsv(blobInfo: { url: string; filename: string }): void {
  const link = document.createElement('a');
  link.href = blobInfo.url;
  link.download = blobInfo.filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the blob URL
  URL.revokeObjectURL(blobInfo.url);
}

/**
 * Result of CSV validation and normalization
 */
export interface CsvValidationResult {
  isValid: boolean;
  normalizedContent: string;
  issues: string[];
}

/**
 * Validates and normalizes CSV content using Papa Parse
 * @param content - String content to validate and normalize
 * @returns Validation result with normalized content and any issues found
 */
export function validateAndNormalizeCsv(content: string): CsvValidationResult {
  const issues: string[] = [];
  
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      normalizedContent: content,
      issues: ['CSV content cannot be empty']
    };
  }

  let normalizedContent = content;
  
  // Check if content ends with a newline, if not add one
  if (!content.endsWith('\n') && !content.endsWith('\r\n')) {
    normalizedContent = content + '\n';
    issues.push('Added missing trailing newline');
  }

  // Use Papa Parse for validation
  const parseResult = Papa.parse(normalizedContent, {
    skipEmptyLines: true,
    // Parse a few rows to validate structure
    preview: 5,
    // Don't transform data types for validation
    dynamicTyping: false
  });

  // Check for parsing errors (ignore delimiter detection issues for single column CSV)
  const significantErrors = parseResult.errors.filter(error => {
    // For single column CSV, "UndetectableDelimiter" is expected and not a real error
    return !(error.code === 'UndetectableDelimiter' && parseResult.data.length > 0);
  });

  if (significantErrors.length > 0) {
    const errorMessages = significantErrors.map(error => {
      if (error.row !== undefined) {
        return `Line ${error.row + 1}: ${error.message}`;
      }
      return error.message;
    });
    
    return {
      isValid: false,
      normalizedContent,
      issues: [...issues, ...errorMessages]
    };
  }

  // Check if we have any data
  if (!parseResult.data || parseResult.data.length === 0) {
    return {
      isValid: false,
      normalizedContent,
      issues: [...issues, 'No valid CSV rows found']
    };
  }

  // Check for consistent column count across rows
  const rows = parseResult.data as string[][];
  if (rows.length > 1) {
    const headerColumnCount = rows[0].length;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].length !== headerColumnCount) {
        return {
          isValid: false,
          normalizedContent,
          issues: [...issues, `Line ${i + 1} has ${rows[i].length} columns, expected ${headerColumnCount}`]
        };
      }
    }
  }

  return {
    isValid: true,
    normalizedContent,
    issues
  };
}

/**
 * Validates if a string is valid CSV format (backward compatibility)
 * @param content - String content to validate
 * @returns boolean indicating if content appears to be valid CSV
 */
export function isValidCsv(content: string): boolean {
  return validateAndNormalizeCsv(content).isValid;
}