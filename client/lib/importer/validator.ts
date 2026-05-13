import type {
  TemplateType,
  ValidationResult,
  ValidationIssue,
  PreparedRecord,
  TransformedPracticePage,
  TransformedBlogPost,
} from "./types";
import { getRequiredFields, getFieldsForTemplate } from "./templateFields";
import { normalizeImportedPublishDate } from "./preparer";

/**
 * Validate an array of mapped records (keyed by template field keys).
 * Returns a ValidationResult with issues grouped by row.
 */
export function validateRecords(
  records: Record<string, unknown>[],
  templateType: TemplateType,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const requiredFields = getRequiredFields(templateType);
  const allFields = getFieldsForTemplate(templateType);
  const errorRows = new Set<number>();
  const warningRows = new Set<number>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Check required fields
    for (const field of requiredFields) {
      const value = record[field.key];
      if (value === null || value === undefined || String(value).trim() === "") {
        issues.push({
          rowIndex: i,
          field: field.key,
          message: `"${field.label}" is required`,
          severity: "error",
        });
        errorRows.add(i);
      }
    }

    // Template-specific validation
    if (templateType === "practice") {
      validatePracticePage(record, i, issues, errorRows, warningRows);
    } else if (templateType === "post") {
      validateBlogPost(record, i, issues, errorRows, warningRows);
    }

    // Validate image URLs
    for (const field of allFields) {
      if (field.type === "image" && record[field.key]) {
        const url = String(record[field.key]);
        if (url && !isValidUrl(url)) {
          issues.push({
            rowIndex: i,
            field: field.key,
            message: `"${field.label}" has an invalid URL: "${truncate(url, 60)}"`,
            severity: "error",
          });
          errorRows.add(i);
        }
      }
    }
  }

  // Count warning-only rows
  for (const row of warningRows) {
    if (!errorRows.has(row)) {
      // it stays a warning-only row
    }
  }

  return {
    valid: errorRows.size === 0,
    issues,
    errorRowCount: errorRows.size,
    warningRowCount: Array.from(warningRows).filter((r) => !errorRows.has(r)).length,
  };
}

// ---------------------------------------------------------------------------
// Practice Page Validation
// ---------------------------------------------------------------------------

function validatePracticePage(
  record: Record<string, unknown>,
  rowIndex: number,
  issues: ValidationIssue[],
  errorRows: Set<number>,
  warningRows: Set<number>,
) {
  validateMappedPublishDate(record["published_at"], rowIndex, issues, errorRows);

  // Validate slug format
  const slug = record["url_slug"];
  if (slug) {
    const slugStr = String(slug);
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slugStr)) {
      issues.push({
        rowIndex,
        field: "url_slug",
        message: `Slug "${truncate(slugStr, 40)}" must be lowercase, alphanumeric with hyphens only`,
        severity: "error",
      });
      errorRows.add(rowIndex);
    }
  }

  // Warn if no hero tagline
  if (!record["hero.tagline"]) {
    issues.push({
      rowIndex,
      field: "hero.tagline",
      message: "No hero tagline provided — default will be used",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }

  // Warn if no content sections
  if (
    !record["contentSections"] &&
    !record["contentSections.body"] &&
    !hasIndexedFields(record, "body_")
  ) {
    issues.push({
      rowIndex,
      field: "contentSections",
      message: "No content sections — page will use defaults",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }
}

// ---------------------------------------------------------------------------
// Blog Post Validation
// ---------------------------------------------------------------------------

function validateBlogPost(
  record: Record<string, unknown>,
  rowIndex: number,
  issues: ValidationIssue[],
  errorRows: Set<number>,
  warningRows: Set<number>,
) {
  validateMappedPublishDate(record["published_at"], rowIndex, issues, errorRows);

  // Validate slug format
  const slug = record["slug"];
  if (slug) {
    const slugStr = String(slug);
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slugStr)) {
      issues.push({
        rowIndex,
        field: "slug",
        message: `Slug "${truncate(slugStr, 40)}" must be lowercase, alphanumeric with hyphens only`,
        severity: "error",
      });
      errorRows.add(rowIndex);
    }
  }

  // Warn if no body content
  if (!record["body"]) {
    issues.push({
      rowIndex,
      field: "body",
      message: "No body content — post will be empty",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }

  // Warn if no excerpt
  if (!record["excerpt"]) {
    issues.push({
      rowIndex,
      field: "excerpt",
      message: "No excerpt — it won't appear in blog listings",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateMappedPublishDate(
  value: unknown,
  rowIndex: number,
  issues: ValidationIssue[],
  errorRows: Set<number>,
) {
  if (value == null || String(value).trim() === "") {
    return;
  }

  if (!normalizeImportedPublishDate(value)) {
    issues.push({
      rowIndex,
      field: "published_at",
      message: `Publish date "${truncate(String(value), 50)}" could not be parsed`,
      severity: "error",
    });
    errorRows.add(rowIndex);
  }
}

function validatePreparedPublishDate(
  value: string | null | undefined,
  rowIndex: number,
  issues: ValidationIssue[],
  errorRows: Set<number>,
) {
  if (!value) {
    return;
  }

  if (!normalizeImportedPublishDate(value)) {
    issues.push({
      rowIndex,
      field: "published_at",
      message: `Publish date "${truncate(value, 50)}" is invalid`,
      severity: "error",
    });
    errorRows.add(rowIndex);
  }
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

function hasIndexedFields(
  record: Record<string, unknown>,
  prefix: string,
): boolean {
  return Object.keys(record).some((k) => k.startsWith(prefix));
}

// ============================================================================
// Prepared Records Validation (new flow)
// ============================================================================

/**
 * Validate an array of PreparedRecords.
 * Skips records with status "skipped".
 * Validates the `.current` data of approved + needs-review records.
 * Includes duplicate-within-batch slug checks.
 */
export function validatePreparedRecords(
  records: PreparedRecord[],
  templateType: TemplateType,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const errorRows = new Set<number>();
  const warningRows = new Set<number>();

  // Collect slugs for duplicate detection
  const slugMap = new Map<string, number[]>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Skip skipped records
    if (record.status === "skipped") continue;

    // Warn if still needs-review
    if (record.status === "needs-review") {
      issues.push({
        rowIndex: i,
        field: "status",
        message: "Record has not been approved yet",
        severity: "warning",
      });
      warningRows.add(i);
    }

    const data = record.current;

    if (templateType === "practice") {
      const p = data as TransformedPracticePage;
      validatePreparedPracticePage(p, i, issues, errorRows, warningRows);

      // Track slug for duplicates
      const slug = p.url_path;
      if (slug) {
        const existing = slugMap.get(slug) ?? [];
        existing.push(i);
        slugMap.set(slug, existing);
      }
    } else {
      const b = data as TransformedBlogPost;
      validatePreparedBlogPost(b, i, issues, errorRows, warningRows);

      // Track slug for duplicates
      const slug = b.slug;
      if (slug) {
        const existing = slugMap.get(slug) ?? [];
        existing.push(i);
        slugMap.set(slug, existing);
      }
    }
  }

  // Check for duplicate slugs within the batch
  for (const [slug, indices] of slugMap) {
    if (indices.length > 1) {
      for (const idx of indices) {
        issues.push({
          rowIndex: idx,
          field: templateType === "practice" ? "url_path" : "slug",
          message: `Duplicate ${templateType === "practice" ? "URL path" : "slug"} "${truncate(slug, 40)}" found in rows: ${indices.map((i) => i + 1).join(", ")}`,
          severity: "error",
        });
        errorRows.add(idx);
      }
    }
  }

  return {
    valid: errorRows.size === 0,
    issues,
    errorRowCount: errorRows.size,
    warningRowCount: Array.from(warningRows).filter((r) => !errorRows.has(r)).length,
  };
}

// ---------------------------------------------------------------------------
// Prepared Practice Page Validation
// ---------------------------------------------------------------------------

function validatePreparedPracticePage(
  record: TransformedPracticePage,
  rowIndex: number,
  issues: ValidationIssue[],
  errorRows: Set<number>,
  warningRows: Set<number>,
) {
  validatePreparedPublishDate(record.published_at, rowIndex, issues, errorRows);

  // Required: title
  if (!record.title || record.title.trim() === "" || record.title === "Untitled") {
    issues.push({
      rowIndex,
      field: "title",
      message: "Title is required",
      severity: "error",
    });
    errorRows.add(rowIndex);
  }

  // Required: url_path
  if (!record.url_path || record.url_path === "//") {
    issues.push({
      rowIndex,
      field: "url_path",
      message: "URL path is required",
      severity: "error",
    });
    errorRows.add(rowIndex);
  } else {
    const slug = record.url_path.replace(/^\/+|\/+$/g, "");
    if (slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      issues.push({
        rowIndex,
        field: "url_path",
        message: `Slug "${truncate(slug, 40)}" must be lowercase, alphanumeric with hyphens only`,
        severity: "error",
      });
      errorRows.add(rowIndex);
    }
  }

  // Warnings
  const content = record.content as Record<string, unknown>;
  const hero = content?.hero as Record<string, unknown> | undefined;
  const sections = content?.contentSections as unknown[] | undefined;

  if (!hero?.tagline) {
    issues.push({
      rowIndex,
      field: "hero.tagline",
      message: "No hero tagline provided",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }

  if (!sections || sections.length === 0) {
    issues.push({
      rowIndex,
      field: "contentSections",
      message: "No content sections — page will be empty",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }

  // Validate image URLs in hero
  if (hero?.backgroundImage) {
    const url = String(hero.backgroundImage);
    if (url && !isValidUrl(url)) {
      issues.push({
        rowIndex,
        field: "hero.backgroundImage",
        message: `Invalid hero image URL: "${truncate(url, 50)}"`,
        severity: "warning",
      });
      warningRows.add(rowIndex);
    }
  }
}

// ---------------------------------------------------------------------------
// Prepared Blog Post Validation
// ---------------------------------------------------------------------------

function validatePreparedBlogPost(
  record: TransformedBlogPost,
  rowIndex: number,
  issues: ValidationIssue[],
  errorRows: Set<number>,
  warningRows: Set<number>,
) {
  validatePreparedPublishDate(record.published_at, rowIndex, issues, errorRows);

  // Required: title
  if (!record.title || record.title.trim() === "" || record.title === "Untitled") {
    issues.push({
      rowIndex,
      field: "title",
      message: "Title is required",
      severity: "error",
    });
    errorRows.add(rowIndex);
  }

  // Required: slug
  if (!record.slug || record.slug.trim() === "") {
    issues.push({
      rowIndex,
      field: "slug",
      message: "Slug is required",
      severity: "error",
    });
    errorRows.add(rowIndex);
  } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(record.slug)) {
    issues.push({
      rowIndex,
      field: "slug",
      message: `Slug "${truncate(record.slug, 40)}" must be lowercase, alphanumeric with hyphens only`,
      severity: "error",
    });
    errorRows.add(rowIndex);
  }

  // Warnings
  if (!record.body) {
    issues.push({
      rowIndex,
      field: "body",
      message: "No body content — post will be empty",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }

  if (!record.excerpt) {
    issues.push({
      rowIndex,
      field: "excerpt",
      message: "No excerpt — it won't appear in blog listings",
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }

  // Validate image URLs
  if (record.featured_image && !isValidUrl(record.featured_image)) {
    issues.push({
      rowIndex,
      field: "featured_image",
      message: `Invalid featured image URL: "${truncate(record.featured_image, 50)}"`,
      severity: "warning",
    });
    warningRows.add(rowIndex);
  }
}

/**
 * Check for duplicate slugs against the database.
 * Returns an array of slugs that already exist.
 */
export async function checkDuplicateSlugsInDB(
  slugs: string[],
  templateType: TemplateType,
  supabase: { from: (table: string) => { select: (cols: string) => { in: (col: string, vals: string[]) => Promise<{ data: Record<string, unknown>[] | null }> } } },
): Promise<string[]> {
  if (slugs.length === 0) return [];

  try {
    if (templateType === "practice") {
      const paths = slugs.map((s) => {
        if (s.startsWith("/")) return s;
        return `/${s.replace(/^\/+|\/+$/g, "")}/`;
      });
      const { data } = await supabase
        .from("pages")
        .select("url_path")
        .in("url_path", paths);
      return (data ?? []).map((r) => String(r.url_path));
    } else {
      const { data } = await supabase
        .from("posts")
        .select("slug")
        .in("slug", slugs);
      return (data ?? []).map((r) => String(r.slug));
    }
  } catch {
    return [];
  }
}
