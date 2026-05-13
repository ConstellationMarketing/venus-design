// ============================================================================
// Source Cleaner — Stage 2 Pipeline
// ============================================================================
//
// Transforms raw source records into cleaned source records by:
// - Stripping CMS shortcodes (Divi, WPBakery, etc.)
// - Fixing encoding issues (HTML entities, mojibake)
// - Normalizing whitespace
// ============================================================================

import type { SourceRecord } from "./types";
import type { CleanedRecord, CleaningLogEntry } from "./recipeTypes";
import { normalizeHtml, type NormalizeHtmlOptions } from "./htmlNormalizer";
import type { FilterOptions } from "./contentFilter";

// ---------------------------------------------------------------------------
// Cleaning options (passed through from pipeline callers)
// ---------------------------------------------------------------------------

export interface CleaningOptions {
  /** Source domain for resolving relative URLs (e.g. "https://example.com") */
  sourceDomain?: string;
  /** Options for secondary content filtering (template-specific behavior) */
  filterOptions?: FilterOptions;
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Clean all source records. Returns cleaned data + per-record cleaning logs.
 */
export function cleanSourceRecords(
  records: SourceRecord[],
  options?: CleaningOptions,
): CleanedRecord[] {
  return records.map((record) => cleanSingleRecord(record, options));
}

/**
 * Clean a single source record.
 */
export function cleanSingleRecord(
  record: SourceRecord,
  options?: CleaningOptions,
): CleanedRecord {
  const log: CleaningLogEntry[] = [];
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value.trim() !== "") {
      const result = cleanStringValue(value, key, options);
      cleaned[key] = result.value;
      log.push(...result.log);
    } else {
      cleaned[key] = value;
    }
  }

  return { data: cleaned, cleaningLog: log };
}

// ---------------------------------------------------------------------------
// String Cleaning Pipeline
// ---------------------------------------------------------------------------

interface CleanResult {
  value: string;
  log: CleaningLogEntry[];
}

/** Check if a field name + value looks like an HTML content field */
function isContentField(field: string, value: string): boolean {
  const contentFieldNames =
    /^(body|content|html|main_content|description|text|markdown|post_content|article|page_content)$/i;
  return (
    contentFieldNames.test(field) ||
    (value.length > 500 && /<[a-z][\s\S]*>/i.test(value))
  );
}

function cleanStringValue(
  value: string,
  field: string,
  options?: CleaningOptions,
): CleanResult {
  const log: CleaningLogEntry[] = [];
  let current = value;

  // 1. Strip shortcodes
  const afterShortcodes = stripShortcodes(current);
  if (afterShortcodes !== current) {
    log.push({
      field,
      action: "strip_shortcodes",
      detail: `Removed CMS shortcodes`,
    });
    current = afterShortcodes;
  }

  // 2. Fix encoding
  const afterEncoding = fixEncoding(current);
  if (afterEncoding !== current) {
    log.push({
      field,
      action: "fix_encoding",
      detail: "Fixed character encoding issues",
    });
    current = afterEncoding;
  }

  // 3. Normalize whitespace
  const afterWhitespace = normalizeWhitespace(current);
  if (afterWhitespace !== current) {
    log.push({
      field,
      action: "normalize_whitespace",
      detail: "Normalized whitespace",
    });
    current = afterWhitespace;
  }

  // 4. Clean empty HTML wrappers
  const afterEmptyHtml = cleanEmptyHtml(current);
  if (afterEmptyHtml !== current) {
    log.push({
      field,
      action: "clean_empty_html",
      detail: "Removed empty HTML wrappers",
    });
    current = afterEmptyHtml;
  }

  // 5. Normalize HTML (URLs, inline markup, headings, dedup)
  // Only apply to content/body fields to avoid breaking metadata
  if (isContentField(field, current)) {
    const normalizeOpts: NormalizeHtmlOptions = {
      sourceDomain: options?.sourceDomain,
      filterOptions: options?.filterOptions,
    };
    const afterNormalize = normalizeHtml(current, normalizeOpts);
    if (afterNormalize !== current) {
      log.push({
        field,
        action: "normalize_html",
        detail: "Normalized HTML (URLs, inline markup, headings, dedup)",
      });
      current = afterNormalize;
    }
  }

  return { value: current, log };
}

// ---------------------------------------------------------------------------
// Shortcode Stripping
// ---------------------------------------------------------------------------

/**
 * Strip CMS shortcodes from various builders:
 * - Divi: [et_pb_*]...[/et_pb_*]
 * - WPBakery: [vc_*]...[/vc_*]
 * - Generic WordPress: [shortcode attr="val"]...[/shortcode]
 * - Elementor data attributes
 */
export function stripShortcodes(html: string): string {
  let result = html;

  // Divi shortcodes: [et_pb_*]...[/et_pb_*] and self-closing [et_pb_* /]
  result = result.replace(/\[et_pb_[^\]]*\]/gi, "");
  result = result.replace(/\[\/et_pb_[^\]]*\]/gi, "");

  // WPBakery shortcodes: [vc_*]...[/vc_*]
  result = result.replace(/\[vc_[^\]]*\]/gi, "");
  result = result.replace(/\[\/vc_[^\]]*\]/gi, "");

  // Common WordPress shortcodes (non-content bearing)
  const nonContentShortcodes = [
    "fusion_builder_container",
    "fusion_builder_row",
    "fusion_builder_column",
    "av_section",
    "av_one_full",
    "av_one_half",
    "av_one_third",
    "av_two_third",
    "av_textblock",
    "av_toggle_container",
    "av_toggle",
    "fl_builder_insert_layout",
    "cs_section",
    "cs_row",
    "cs_column",
    "cs_text",
    "wpforms",
    "contact-form-7",
    "gravityform",
  ];

  for (const tag of nonContentShortcodes) {
    const openRegex = new RegExp(`\\[${tag}[^\\]]*\\]`, "gi");
    const closeRegex = new RegExp(`\\[\\/${tag}\\]`, "gi");
    result = result.replace(openRegex, "");
    result = result.replace(closeRegex, "");
  }

  // Generic shortcodes that are clearly layout wrappers (heuristic: no text content)
  // Only strip if they don't look like content-bearing shortcodes
  result = result.replace(
    /\[(?:row|column|section|container|wrapper|spacer|divider|separator|clear)\b[^\]]*\]/gi,
    "",
  );
  result = result.replace(
    /\[\/(?:row|column|section|container|wrapper|spacer|divider|separator|clear)\b[^\]]*\]/gi,
    "",
  );

  // Elementor data attributes in HTML tags
  result = result.replace(/\s*data-elementor-[a-z-]*="[^"]*"/gi, "");
  result = result.replace(/\s*data-widget_type="[^"]*"/gi, "");
  result = result.replace(/\s*data-element_type="[^"]*"/gi, "");
  result = result.replace(/\s*data-settings='[^']*'/gi, "");

  // NOTE: Builder CSS class names are NOT stripped here. They are needed
  // downstream by unwrapLayoutContainers() to identify layout wrappers.
  // stripNonSemanticAttributes() in contentFilter.ts handles cleanup later.

  return result;
}

// ---------------------------------------------------------------------------
// Encoding Fixes
// ---------------------------------------------------------------------------

/**
 * Fix common encoding issues:
 * - HTML entities → actual characters
 * - Common mojibake patterns (UTF-8 decoded as Latin-1)
 * - Curly quotes → straight quotes (optional, configurable)
 */
export function fixEncoding(text: string): string {
  let result = text;

  // Decode numeric HTML entities
  result = result.replace(/&#(\d+);/g, (_match, code) => {
    const num = parseInt(code, 10);
    return num > 0 && num < 65536 ? String.fromCharCode(num) : _match;
  });

  // Decode hex HTML entities
  result = result.replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
    const num = parseInt(hex, 16);
    return num > 0 && num < 65536 ? String.fromCharCode(num) : _match;
  });

  // Common named HTML entities (only non-HTML-structural ones)
  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&nbsp;": " ",
    "&rsquo;": "\u2019",
    "&lsquo;": "\u2018",
    "&rdquo;": "\u201D",
    "&ldquo;": "\u201C",
    "&mdash;": "\u2014",
    "&ndash;": "\u2013",
    "&hellip;": "\u2026",
    "&copy;": "\u00A9",
    "&reg;": "\u00AE",
    "&trade;": "\u2122",
    "&bull;": "\u2022",
    "&middot;": "\u00B7",
    "&frac12;": "\u00BD",
    "&frac14;": "\u00BC",
    "&frac34;": "\u00BE",
    "&deg;": "\u00B0",
    "&times;": "\u00D7",
    "&divide;": "\u00F7",
  };

  for (const [entity, char] of Object.entries(namedEntities)) {
    result = result.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), char);
  }

  // Common mojibake patterns (UTF-8 → Latin-1 → UTF-8)
  const mojibakeMap: Record<string, string> = {
    "\u00C3\u00A9": "\u00E9", // é
    "\u00C3\u00A8": "\u00E8", // è
    "\u00C3\u00A0": "\u00E0", // à
    "\u00C3\u00BC": "\u00FC", // ü
    "\u00C3\u00B6": "\u00F6", // ö
    "\u00C3\u00A4": "\u00E4", // ä
    "\u00C3\u00B1": "\u00F1", // ñ
    "\u00C2\u00A0": " ",      // non-breaking space mojibake
    "\u00C2\u00AB": "\u00AB", // «
    "\u00C2\u00BB": "\u00BB", // »
    "\u00E2\u0080\u0099": "\u2019", // '
    "\u00E2\u0080\u009C": "\u201C", // "
    "\u00E2\u0080\u009D": "\u201D", // "
    "\u00E2\u0080\u0093": "\u2013", // –
    "\u00E2\u0080\u0094": "\u2014", // —
  };

  for (const [bad, good] of Object.entries(mojibakeMap)) {
    result = result.replace(new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), good);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Whitespace Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize whitespace:
 * - Collapse multiple spaces into one
 * - Remove excessive newlines (3+ → 2)
 * - Trim leading/trailing whitespace
 * - Remove zero-width characters
 */
export function normalizeWhitespace(text: string): string {
  let result = text;

  // Remove zero-width characters
  result = result.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");

  // Collapse multiple spaces (but not newlines) into one
  result = result.replace(/[^\S\n]+/g, " ");

  // Collapse 3+ newlines into 2
  result = result.replace(/\n{3,}/g, "\n\n");

  // Trim
  result = result.trim();

  return result;
}

// ---------------------------------------------------------------------------
// Empty HTML Cleanup
// ---------------------------------------------------------------------------

/**
 * Remove empty HTML elements that are just wrappers with no content.
 * Preserves self-closing tags like <br>, <hr>, <img>.
 */
function cleanEmptyHtml(html: string): string {
  let result = html;

  // Remove empty paragraphs, divs, spans (with optional whitespace/&nbsp;)
  const emptyTagRegex = /<(p|div|span|section|article|aside|header|footer|main)\b[^>]*>(\s|&nbsp;)*<\/\1>/gi;

  // Run multiple passes since removing outer wrappers may expose inner empty ones
  let prev = "";
  let iterations = 0;
  while (result !== prev && iterations < 5) {
    prev = result;
    result = result.replace(emptyTagRegex, "");
    iterations++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utility: Check if a string likely contains shortcodes
// ---------------------------------------------------------------------------

/**
 * Quick check if a string contains CMS shortcode patterns.
 * Useful for pre-screening before full cleaning.
 */
export function containsShortcodes(text: string): boolean {
  return /\[(et_pb_|vc_|fusion_|av_|cs_|fl_builder)/i.test(text);
}

/**
 * Quick check if a string has encoding issues.
 */
export function hasEncodingIssues(text: string): boolean {
  // Check for common mojibake patterns
  return /\u00C3[\u0080-\u00BF]|\u00C2[\u00A0-\u00BF]|\u00E2\u0080[\u0090-\u009F]/.test(text);
}
