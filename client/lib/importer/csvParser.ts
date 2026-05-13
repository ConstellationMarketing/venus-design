import Papa from "papaparse";
import type { ParseResult, SourceRecord, ParseError } from "./types";

/**
 * Parse a CSV file into structured records.
 * Uses papaparse for robust CSV handling (quoted fields, escapes, etc.)
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const errors: ParseError[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        // Collect papaparse errors
        for (const err of results.errors) {
          errors.push({
            row: err.row !== undefined ? err.row + 1 : undefined,
            message: err.message,
          });
        }

        const columns = results.meta.fields ?? [];
        const records: SourceRecord[] = (results.data as SourceRecord[]).filter(
          (row) => {
            // Filter out completely empty rows
            return Object.values(row).some(
              (v) => v !== null && v !== undefined && String(v).trim() !== "",
            );
          },
        );

        resolve({ records, columns, errors });
      },
      error: (err) => {
        errors.push({ message: `CSV parsing failed: ${err.message}` });
        resolve({ records: [], columns: [], errors });
      },
    });
  });
}

/**
 * Parse a CSV string (for testing or pasted content).
 */
export function parseCSVString(csvText: string): ParseResult {
  const errors: ParseError[] = [];

  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header: string) => header.trim(),
  });

  for (const err of results.errors) {
    errors.push({
      row: err.row !== undefined ? err.row + 1 : undefined,
      message: err.message,
    });
  }

  const columns = results.meta.fields ?? [];
  const records = (results.data as SourceRecord[]).filter((row) =>
    Object.values(row).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== "",
    ),
  );

  return { records, columns, errors };
}
