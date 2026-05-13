import type {
  MappingConfig,
  SourceRecord,
  TemplateType,
} from "./types";
import { getFieldsForTemplate, getRepeaterChildFields } from "./templateFields";

/**
 * Apply a mapping config to a single source record, producing a flat
 * key→value object keyed by template field keys.
 */
export function applyMapping(
  record: SourceRecord,
  config: MappingConfig,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of config.mappings) {
    const raw = record[mapping.sourceColumn];
    let value: unknown = raw;

    // Fall back to default value
    if (value === null || value === undefined || String(value).trim() === "") {
      if (mapping.defaultValue !== undefined && mapping.defaultValue !== "") {
        value = mapping.defaultValue;
      } else {
        continue;
      }
    }

    // Apply transform
    if (typeof value === "string" && mapping.transform) {
      value = applyTransform(value, mapping.transform);
    }

    result[mapping.targetField] = value;
  }

  return result;
}

/**
 * Apply a text transform to a string value.
 */
function applyTransform(
  value: string,
  transform: "none" | "html" | "markdown" | "slugify",
): string {
  switch (transform) {
    case "html":
      // If it already looks like HTML, pass through
      if (/<[a-z][\s\S]*>/i.test(value)) return value;
      // Wrap plain text in <p> tags
      return wrapInParagraphs(value);

    case "markdown":
      return markdownToHtml(value);

    case "slugify":
      return slugify(value);

    case "none":
    default:
      return value;
  }
}

/**
 * Wrap plain text in <p> tags, splitting on double newlines.
 */
function wrapInParagraphs(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return "";
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

/**
 * Lightweight Markdown-to-HTML converter.
 * Handles: headings, bold, italic, links, lists, line breaks.
 */
function markdownToHtml(md: string): string {
  let html = md;

  // Headings (### h3, ## h2, # h1)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>',
  );

  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  // Clean up nested <ul> wrapping
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Paragraphs (lines not already wrapped in tags)
  const lines = html.split("\n");
  const wrapped = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (/^<(h[1-6]|ul|ol|li|p|div|blockquote)/.test(trimmed)) return trimmed;
    return `<p>${trimmed}</p>`;
  });

  return wrapped.filter(Boolean).join("");
}

/**
 * Convert a string to a URL-safe slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

/**
 * Collect repeater data from flat CSV columns.
 *
 * For a repeater parent "contentSections" with children
 * "contentSections.body", "contentSections.image", etc.,
 * look for CSV columns like:
 *   content_section_body_1, content_section_body_2, ...
 *   content_section_image_1, content_section_image_2, ...
 *
 * Or structured JSON arrays if the source is JSON.
 */
export function collectRepeaterData(
  record: SourceRecord,
  templateType: TemplateType,
  parentKey: string,
  config: MappingConfig,
): Record<string, unknown>[] {
  const childFields = getRepeaterChildFields(templateType, parentKey);

  // First check if the source has the repeater data as an array already
  // (common with JSON sources)
  for (const mapping of config.mappings) {
    if (mapping.targetField === parentKey) {
      const val = record[mapping.sourceColumn];
      if (Array.isArray(val)) {
        return val as Record<string, unknown>[];
      }
    }
  }

  // For flat CSV: look for indexed columns (e.g. body_1, body_2, ...)
  const maxCount = config.repeaterCounts?.[parentKey] ?? 10;
  const items: Record<string, unknown>[] = [];

  for (let i = 1; i <= maxCount; i++) {
    const item: Record<string, unknown> = {};
    let hasData = false;

    for (const child of childFields) {
      // Look for a mapping that targets this child with an index
      const childKey = child.key; // e.g. "contentSections.body"
      const baseName = childKey.split(".").pop() ?? childKey;

      // Try to find a source column matching patterns like:
      // "section_body_1" or "contentSections.body_1" or "body_1"
      for (const mapping of config.mappings) {
        if (mapping.targetField === `${childKey}_${i}` ||
            mapping.targetField === `${childKey}[${i - 1}]`) {
          const val = record[mapping.sourceColumn];
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            item[baseName] = val;
            hasData = true;
          }
        }
      }

      // Also try direct column name pattern: "baseName_i"
      const directCol = `${baseName}_${i}`;
      if (!hasData && record[directCol] !== undefined) {
        const val = record[directCol];
        if (val !== null && String(val).trim() !== "") {
          item[baseName] = val;
          hasData = true;
        }
      }
    }

    if (hasData) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Apply all mappings to all source records, returning mapped data
 * keyed by template field keys.
 */
export function applyMappingToAll(
  records: SourceRecord[],
  config: MappingConfig,
): Record<string, unknown>[] {
  return records.map((record) => applyMapping(record, config));
}
