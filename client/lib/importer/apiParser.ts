import type { ParseResult, SourceRecord, ParseError } from "./types";

/**
 * Parse a JSON string into structured records.
 * Handles both array-of-objects and single object with a nested array.
 */
export function parseJSON(jsonText: string, jsonPath?: string): ParseResult {
  const errors: ParseError[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    errors.push({
      message: `Invalid JSON: ${err instanceof Error ? err.message : "Parse error"}`,
    });
    return { records: [], columns: [], errors };
  }

  return extractRecords(parsed, jsonPath, errors);
}

/**
 * Extract records from a parsed JSON value, optionally navigating a dot-path.
 */
export function extractRecords(
  data: unknown,
  jsonPath?: string,
  errors: ParseError[] = [],
): ParseResult {
  let target = data;

  // Navigate dot-path if provided (e.g. "data.results")
  if (jsonPath && jsonPath.trim()) {
    const parts = jsonPath.trim().split(".");
    for (const part of parts) {
      if (target && typeof target === "object" && !Array.isArray(target)) {
        target = (target as Record<string, unknown>)[part];
      } else if (Array.isArray(target)) {
        const idx = parseInt(part, 10);
        if (!isNaN(idx)) {
          target = target[idx];
        } else {
          errors.push({
            message: `JSON path "${jsonPath}": cannot access "${part}" on an array`,
          });
          return { records: [], columns: [], errors };
        }
      } else {
        errors.push({
          message: `JSON path "${jsonPath}": "${part}" not found`,
        });
        return { records: [], columns: [], errors };
      }
    }
  }

  // Must be an array at this point
  if (!Array.isArray(target)) {
    // If it's a single object, wrap it
    if (target && typeof target === "object") {
      target = [target];
    } else {
      errors.push({
        message: jsonPath
          ? `JSON path "${jsonPath}" did not resolve to an array or object`
          : "JSON must be an array of objects or an object",
      });
      return { records: [], columns: [], errors };
    }
  }

  // Flatten nested objects for field mapping
  const records: SourceRecord[] = [];
  const columnSet = new Set<string>();

  const targetArr = target as Record<string, unknown>[];
  for (let i = 0; i < targetArr.length; i++) {
    const item = targetArr[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push({ row: i + 1, message: `Row ${i + 1} is not an object` });
      continue;
    }

    const flat = flattenObject(item as Record<string, unknown>);
    for (const key of Object.keys(flat)) {
      columnSet.add(key);
    }
    records.push(flat);
  }

  return {
    records,
    columns: Array.from(columnSet),
    errors,
  };
}

/**
 * Flatten a nested object into dot-notation keys.
 * Arrays are kept as-is (not flattened) since they may be repeater data.
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): SourceRecord {
  const result: SourceRecord = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      // Keep arrays intact — they might be repeater data (FAQ items, content sections)
      result[fullKey] = value;
    } else if (value && typeof value === "object" && value !== null) {
      // Recurse into nested objects
      const nested = flattenObject(value as Record<string, unknown>, fullKey);
      Object.assign(result, nested);
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Given a deeply nested value, extract it by dot-path.
 */
export function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx)) return undefined;
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}
