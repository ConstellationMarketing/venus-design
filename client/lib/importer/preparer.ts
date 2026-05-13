// ============================================================================
// Content Preparation Utilities
// ============================================================================
//
// Utility module for content transformation. Provides:
// - prepareRecords(): full preparation pipeline (used by teach step)
// - splitOnH2(): H2-based content splitting
// - splitByParagraphGroups(): paragraph-based splitting (no-H2 fallback)
// - detectFaqPatterns(): FAQ structure detection
// - removeFaqFromHtml(): remove extracted FAQ from body to prevent duplication
// - stripH1Tags(): strip H1 tags from body content
// - extractSectionImages(): per-section image extraction
// - ensureHtml(): plain text → HTML paragraph conversion
// - extractFirstParagraph(): extract first <p> from HTML
// - extractFirstImage(): extract first <img> src from HTML
// - stripTags(): strip all HTML tags
// - quickValidateRecord(): lightweight per-record validation
// - reSplitSections(): re-split a practice page on H2 boundaries
// - resetToAutoPrepared(): reset a prepared record to auto state
//
// The recipe engine (recipeRules.ts, recipeEngine.ts) imports individual
// utilities from this module. The full prepareRecords() function is used
// by StepTeachRecipe to generate the initial "auto-prepared" output that
// the user then corrects.
// ============================================================================

import type {
  TemplateType,
  MappingConfig,
  SourceRecord,
  PreparedRecord,
  TransformedPracticePage,
  TransformedBlogPost,
  TransformedRecord,
  ValidationIssue,
  ImportPublishDateSource,
} from "./types";
import { applyMapping, collectRepeaterData, slugify } from "./fieldMapping";
import {
  createPracticeAreaContentSection,
  defaultPracticeAreaPageContent,
  normalizePracticeAreaContentSections,
} from "@site/lib/cms/practiceAreaPageTypes";
import { removeEmptySections } from "./htmlNormalizer";

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Prepare all source records into structured PreparedRecords.
 * Every record defaults to status "needs-review".
 *
 * Used by StepTeachRecipe to generate the initial auto-prepared output.
 */
export interface PrepareOptions {
  /** Site name for meta_title derivation (e.g. "Smith & Associates") */
  siteName?: string;
  /** Import run timestamp used for publish-date fallback */
  importTimestamp?: string;
}

export function prepareRecords(
  sourceRecords: SourceRecord[],
  mappingConfig: MappingConfig,
  templateType: TemplateType,
  options?: PrepareOptions,
): PreparedRecord[] {
  const importTimestamp = options?.importTimestamp ?? new Date().toISOString();

  return sourceRecords.map((source, index) => {
    const mapped =
      templateType === "practice"
        ? syncPracticeSourceImageFields(applyMapping(source, mappingConfig))
        : applyMapping(source, mappingConfig);

    const autoPrepared =
      templateType === "practice"
        ? preparePracticePage(mapped, source, mappingConfig, {
            ...options,
            importTimestamp,
          })
        : prepareBlogPost(mapped, importTimestamp);

    const current = structuredClone(autoPrepared);
    const { errors, warnings } = quickValidateRecord(current, templateType);

    return {
      sourceIndex: index,
      status: "needs-review" as const,
      autoPrepared,
      current,
      validationErrors: errors,
      validationWarnings: warnings,
    };
  });
}

// ---------------------------------------------------------------------------
// Practice Area Page Preparation
// ---------------------------------------------------------------------------

export function syncPracticeSourceImageFields(
  mapped: Record<string, unknown>,
): Record<string, unknown> {
  const heroBackgroundImage = mapped["hero.backgroundImage"]
    ? String(mapped["hero.backgroundImage"])
    : "";
  const featuredImage = mapped["featured_image"]
    ? String(mapped["featured_image"])
    : "";
  const sharedImage = heroBackgroundImage || featuredImage;

  if (!sharedImage) {
    return mapped;
  }

  return {
    ...mapped,
    "hero.backgroundImage": sharedImage,
    featured_image: sharedImage,
  };
}

export function normalizeImportedPublishDate(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{10,13}$/.test(trimmed)) {
    const numeric = Number(trimmed);
    const parsed = new Date(trimmed.length === 13 ? numeric : numeric * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function resolveImportPublishDate(
  value: unknown,
  fallbackTimestamp: string,
): {
  publishedAt: string;
  source: ImportPublishDateSource;
} {
  const normalized = normalizeImportedPublishDate(value);
  if (normalized) {
    return {
      publishedAt: normalized,
      source: "mapped",
    };
  }

  return {
    publishedAt: fallbackTimestamp,
    source: "fallback",
  };
}

function preparePracticePage(
  mapped: Record<string, unknown>,
  sourceRecord: SourceRecord,
  config: MappingConfig,
  options?: PrepareOptions,
): TransformedPracticePage {
  const syncedMapped = syncPracticeSourceImageFields(mapped);
  const title = String(mapped["title"] ?? "Untitled");
  const rawSlug = mapped["url_slug"]
    ? normalizeUrlSlug(String(mapped["url_slug"]), title)
    : slugify(title);
  const urlPath = `/${rawSlug}/`;
  const siteName = options?.siteName ?? "";
  const publishDate = resolveImportPublishDate(
    mapped["published_at"],
    options?.importTimestamp ?? new Date().toISOString(),
  );

  // -----------------------------------------------------------------------
  // Step 0: Hero Assembly
  // -----------------------------------------------------------------------
  // - title → hero.sectionLabel (H1) — the primary page heading
  // - tagline → only from explicit mapping, empty otherwise
  // - description → always empty by default
  // - featured_image → hero background
  const heroImage = syncedMapped["hero.backgroundImage"]
    ? String(syncedMapped["hero.backgroundImage"])
    : syncedMapped["featured_image"]
      ? String(syncedMapped["featured_image"])
      : "";

  // -----------------------------------------------------------------------
  // Step 1: Extract Body & strip H1
  // -----------------------------------------------------------------------
  let bodyHtml = "";

  // Try repeater data first
  let contentSections = collectRepeaterData(
    sourceRecord,
    "practice",
    "contentSections",
    config,
  );

  if (contentSections.length === 0) {
    const bodyRaw =
      mapped["contentSections.body"] ?? mapped["body"] ?? mapped["content"];
    if (bodyRaw) {
      bodyHtml = cleanPracticeContentBody(String(bodyRaw));
    }
  }

  // -----------------------------------------------------------------------
  // Step 4 (early): FAQ Detection — run on full body BEFORE splitting
  // -----------------------------------------------------------------------
  let faqItems = collectRepeaterData(
    sourceRecord,
    "practice",
    "faq.items",
    config,
  );

  if (faqItems.length === 0 && bodyHtml) {
    const detected = detectFaqPatterns(bodyHtml);
    if (detected.length >= 2) {
      faqItems = detected;
    }
  }

  if (bodyHtml && faqItems.length > 0) {
    bodyHtml = cleanPracticeContentBody(bodyHtml, faqItems);
  }

  // -----------------------------------------------------------------------
  // Step 2: Split into Sections
  // -----------------------------------------------------------------------
  if (contentSections.length === 0 && bodyHtml) {
    const splitResult = splitOnH2(bodyHtml);
    // If splitOnH2 returned a single section (no H2s found),
    // use paragraph grouping fallback
    const rawSections =
      splitResult.length <= 1 && bodyHtml.length > 500
        ? splitByParagraphGroups(bodyHtml)
        : splitResult;

    // Remove low-quality sections (< 50 chars, no paragraph content)
    const sections = removeEmptySections(rawSections);

    contentSections = sections.map((section, idx) =>
      createPracticeAreaContentSection(idx, {
        body: section,
      }),
    ) as unknown as typeof contentSections;
  }

  // Normalize sections
  let normalizedSections = normalizePracticeAreaContentSections(
    contentSections.map((section) => ({
      body: cleanPracticeContentBody(String(section.body ?? ""), faqItems),
      image: String(section.image ?? ""),
      imageAlt: String(section.imageAlt ?? ""),
      imagePosition: section.imagePosition as "left" | "right" | undefined,
      showCTAs:
        typeof section.showCTAs === "boolean" ? section.showCTAs : undefined,
    })),
  );

  // -----------------------------------------------------------------------
  // Step 3: Image Extraction — per-section
  // First relevant image → section.image, removed from body.
  // Remaining images stay in the rich text body.
  // -----------------------------------------------------------------------
  normalizedSections = extractSectionImages(normalizedSections) as typeof normalizedSections;

  // -----------------------------------------------------------------------
  // Finalize FAQ
  // -----------------------------------------------------------------------
  const normalizedFaq = faqItems.map((item) => ({
    question: String(item.question ?? ""),
    answer: ensureHtml(String(item.answer ?? "")),
  }));

  const content: Record<string, unknown> = {
    hero: {
      // For Practice Pages, sectionLabel is the primary heading (H1).
      // Default to the page title when no explicit hero.sectionLabel mapping.
      sectionLabel: mapped["hero.sectionLabel"]
        ? String(mapped["hero.sectionLabel"])
        : title,
      tagline: mapped["hero.tagline"]
        ? String(mapped["hero.tagline"])
        : "",
      description: mapped["hero.description"]
        ? ensureHtml(String(mapped["hero.description"]))
        : "",
      backgroundImage: heroImage,
      backgroundImageAlt: mapped["hero.backgroundImageAlt"]
        ? String(mapped["hero.backgroundImageAlt"])
        : "",
    },
    socialProof: {
      mode: "awards" as const,
      testimonials: [],
      awards: { logos: [] },
    },
    contentSections:
      normalizedSections.length > 0
        ? normalizedSections
        : defaultPracticeAreaPageContent.contentSections,
    faq: {
      enabled: normalizedFaq.length > 0 || !!mapped["faq.heading"],
      heading: mapped["faq.heading"]
        ? String(mapped["faq.heading"])
        : normalizedFaq.length > 0
          ? "Frequently Asked Questions"
          : defaultPracticeAreaPageContent.faq.heading,
      description: mapped["faq.description"]
        ? String(mapped["faq.description"])
        : defaultPracticeAreaPageContent.faq.description,
      items:
        normalizedFaq.length > 0
          ? normalizedFaq
          : defaultPracticeAreaPageContent.faq.items,
    },
  };

  return {
    title,
    url_path: urlPath,
    page_type: "practice",
    content,
    meta_title: mapped["meta_title"]
      ? String(mapped["meta_title"])
      : siteName
        ? `${title} | ${siteName}`
        : title,
    meta_description: mapped["meta_description"]
      ? String(mapped["meta_description"])
      : undefined,
    canonical_url: mapped["canonical_url"]
      ? String(mapped["canonical_url"])
      : null,
    og_title: mapped["og_title"] ? String(mapped["og_title"]) : null,
    og_description: mapped["og_description"]
      ? String(mapped["og_description"])
      : null,
    og_image: mapped["og_image"] ? String(mapped["og_image"]) : null,
    noindex: mapped["noindex"] === true || mapped["noindex"] === "true",
    schema_type: null,
    schema_data: null,
    published_at: publishDate.publishedAt,
    publish_date_source: publishDate.source,
    status: "draft",
  };
}

// ---------------------------------------------------------------------------
// Blog Post Preparation
// ---------------------------------------------------------------------------

function prepareBlogPost(
  mapped: Record<string, unknown>,
  importTimestamp: string,
): TransformedBlogPost {
  const title = String(mapped["title"] ?? "Untitled");
  const slug = mapped["slug"] ? String(mapped["slug"]) : slugify(title);
  const publishDate = resolveImportPublishDate(mapped["published_at"], importTimestamp);

  return {
    title,
    slug,
    excerpt: mapped["excerpt"] ? String(mapped["excerpt"]) : undefined,
    featured_image: mapped["featured_image"]
      ? String(mapped["featured_image"])
      : undefined,
    category: mapped["category"] ? String(mapped["category"]) : undefined,
    category_id: null,
    content: [],
    body: mapped["body"] ? ensureHtml(String(mapped["body"])) : undefined,
    meta_title: mapped["meta_title"]
      ? String(mapped["meta_title"])
      : title,
    meta_description: mapped["meta_description"]
      ? String(mapped["meta_description"])
      : mapped["excerpt"]
        ? String(mapped["excerpt"])
        : undefined,
    canonical_url: mapped["canonical_url"]
      ? String(mapped["canonical_url"])
      : null,
    og_title: mapped["og_title"] ? String(mapped["og_title"]) : null,
    og_description: mapped["og_description"]
      ? String(mapped["og_description"])
      : null,
    og_image: mapped["og_image"]
      ? String(mapped["og_image"])
      : mapped["featured_image"]
        ? String(mapped["featured_image"])
        : null,
    noindex: mapped["noindex"] === true || mapped["noindex"] === "true",
    published_at: publishDate.publishedAt,
    publish_date_source: publishDate.source,
    status: "draft",
  };
}

// ---------------------------------------------------------------------------
// URL Slug Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw URL/slug value into a clean slug for practice area pages.
 *
 * Rules:
 *   1. Full URL → extract pathname
 *   2. Path containing /practice-areas/ → extract the slug after it
 *   3. Multi-segment path → take last segment
 *   4. Bare slug → use as-is
 *   5. Fallback → slugify(title)
 */
export function normalizeUrlSlug(raw: string, title: string): string {
  let slug = raw.trim();

  // Full URL → extract pathname
  if (slug.startsWith("http")) {
    try {
      slug = new URL(slug).pathname;
    } catch {
      /* keep as-is */
    }
  }

  // Already has /practice-areas/ → extract just the slug part
  const paMatch = slug.match(/\/practice-areas\/([^/?#]+)/);
  if (paMatch) {
    slug = paMatch[1];
  } else {
    // Strip leading/trailing slashes
    slug = slug.replace(/^\/+|\/+$/g, "");
    // If multi-segment path, take last segment
    if (slug.includes("/")) {
      slug = slug.split("/").filter(Boolean).pop() || slugify(title);
    }
  }

  return slug || slugify(title);
}

// ---------------------------------------------------------------------------
// H2 Content Splitting
// ---------------------------------------------------------------------------

/**
 * Split HTML body content on `<h2>` boundaries.
 * Each resulting section includes the <h2> heading and everything up to
 * the next <h2> (or end of string).
 *
 * If no <h2> tags found, returns a single section with the full body.
 */
export function splitOnH2(html: string): string[] {
  if (!html || html.trim() === "") return [];

  const h2Regex = /<h2[\s>]/gi;
  const positions: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(html)) !== null) {
    positions.push(match.index);
  }

  if (positions.length === 0) {
    return [html.trim()];
  }

  const sections: string[] = [];

  // Content before the first H2 (intro paragraphs after H1 stripping).
  // Instead of creating a standalone section, we prepend it to the first
  // H2 section so it reads as an intro to that section.
  const beforeFirst = html.slice(0, positions[0]).trim();

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : html.length;
    const section = html.slice(start, end).trim();
    if (section) {
      // Prepend intro content to the first H2 section
      if (i === 0 && beforeFirst) {
        sections.push(beforeFirst + section);
      } else {
        sections.push(section);
      }
    }
  }

  return sections;
}

/**
 * Re-split sections from the original mapped body content.
 */
export function reSplitSections(
  record: TransformedPracticePage,
  originalMappedBody: string,
): TransformedPracticePage {
  const sections = splitOnH2(cleanPracticeContentBody(originalMappedBody));
  const content = record.content as Record<string, unknown>;

  const newSections = sections.map((body, idx) =>
    createPracticeAreaContentSection(idx, {
      body,
    }),
  );

  return {
    ...record,
    content: {
      ...content,
      contentSections: newSections,
    },
  };
}

// ---------------------------------------------------------------------------
// FAQ Detection
// ---------------------------------------------------------------------------

/**
 * Detect FAQ-like patterns in HTML content.
 * Supports: <dl>/<dt>/<dd>, <h3>?/<p> pairs.
 * Returns empty array if no clear structure is found.
 */
export function detectFaqPatterns(
  html: string,
): Array<{ question: string; answer: string }> {
  if (!html) return [];

  const items: Array<{ question: string; answer: string }> = [];

  // Pattern 1: <dl>/<dt>/<dd> structure
  const dlRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let dlMatch: RegExpExecArray | null;
  while ((dlMatch = dlRegex.exec(html)) !== null) {
    const question = stripTags(dlMatch[1]).trim();
    const answer = dlMatch[2].trim();
    if (question && answer) {
      items.push({ question, answer });
    }
  }
  if (items.length >= 2) return items;

  // Pattern 2: <h3> followed by content (common FAQ format)
  const h3Regex =
    /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<h2|<\/section|<\/div|$)/gi;
  let h3Match: RegExpExecArray | null;
  const h3Items: Array<{ question: string; answer: string }> = [];
  while ((h3Match = h3Regex.exec(html)) !== null) {
    const question = stripTags(h3Match[1]).trim();
    const answer = h3Match[2].trim();
    if (question && answer && question.endsWith("?")) {
      h3Items.push({ question, answer });
    }
  }
  if (h3Items.length >= 2) return h3Items;

  return [];
}

// ---------------------------------------------------------------------------
// Quick Validation
// ---------------------------------------------------------------------------

/**
 * Lightweight check for required fields and slug format.
 * Used for inline per-record validation indicators.
 */
export function quickValidateRecord(
  record: TransformedRecord,
  templateType: TemplateType,
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const rowIndex = 0;

  if (templateType === "practice") {
    const p = record as TransformedPracticePage;

    if (!p.title || p.title.trim() === "" || p.title === "Untitled") {
      errors.push({
        rowIndex,
        field: "title",
        message: "Title is required",
        severity: "error",
      });
    }

    if (!p.url_path || p.url_path === "//") {
      errors.push({
        rowIndex,
        field: "url_path",
        message: "URL path is required",
        severity: "error",
      });
    } else {
      const slug = p.url_path.replace(/^\/+|\/+$/g, "");
      if (slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
        errors.push({
          rowIndex,
          field: "url_path",
          message: "Slug must be lowercase, alphanumeric with hyphens only",
          severity: "error",
        });
      }
    }

    const content = p.content as Record<string, unknown>;
    const hero = content?.hero as Record<string, unknown> | undefined;
    const sections = content?.contentSections as unknown[] | undefined;

    if (!hero?.tagline) {
      warnings.push({
        rowIndex,
        field: "hero.tagline",
        message: "No hero tagline provided",
        severity: "warning",
      });
    }

    if (!sections || sections.length === 0) {
      warnings.push({
        rowIndex,
        field: "contentSections",
        message: "No content sections — page will be empty",
        severity: "warning",
      });
    }

    if (!p.published_at) {
      warnings.push({
        rowIndex,
        field: "published_at",
        message: "No publish date detected — import time will be used",
        severity: "warning",
      });
    }
  } else {
    const b = record as TransformedBlogPost;

    if (!b.title || b.title.trim() === "" || b.title === "Untitled") {
      errors.push({
        rowIndex,
        field: "title",
        message: "Title is required",
        severity: "error",
      });
    }

    if (!b.slug || b.slug.trim() === "") {
      errors.push({
        rowIndex,
        field: "slug",
        message: "Slug is required",
        severity: "error",
      });
    } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(b.slug)) {
      errors.push({
        rowIndex,
        field: "slug",
        message: "Slug must be lowercase, alphanumeric with hyphens only",
        severity: "error",
      });
    }

    if (!b.body) {
      warnings.push({
        rowIndex,
        field: "body",
        message: "No body content — post will be empty",
        severity: "warning",
      });
    }

    if (!b.excerpt) {
      warnings.push({
        rowIndex,
        field: "excerpt",
        message: "No excerpt — it won't appear in blog listings",
        severity: "warning",
      });
    }

    if (!b.published_at) {
      warnings.push({
        rowIndex,
        field: "published_at",
        message: "No publish date detected — import time will be used",
        severity: "warning",
      });
    }
  }

  return { errors, warnings };
}

/**
 * Reset a prepared record to its auto-prepared state.
 */
export function resetToAutoPrepared(
  record: PreparedRecord,
  templateType: TemplateType,
): PreparedRecord {
  const current = structuredClone(record.autoPrepared);
  const { errors, warnings } = quickValidateRecord(current, templateType);
  return {
    ...record,
    status: "needs-review",
    current,
    validationErrors: errors,
    validationWarnings: warnings,
  };
}

// ---------------------------------------------------------------------------
// H1 Stripping
// ---------------------------------------------------------------------------

/**
 * Remove <h1>...</h1> tags and their content from body HTML.
 * The H1 is only for the hero title, so it should not appear in body content.
 */
export function stripH1Tags(html: string): string {
  if (!html) return "";
  return html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, "").trim();
}

export function cleanPracticeContentBody(
  body: string,
  faqItems: Array<{ question?: unknown; answer?: unknown }> = [],
): string {
  const withoutH1 = stripH1Tags(ensureHtml(body));
  const normalizedFaqItems = faqItems
    .map((item) => ({
      question: String(item.question ?? ""),
      answer: String(item.answer ?? ""),
    }))
    .filter((item) => item.question && item.answer);
  return normalizedFaqItems.length > 0
    ? removeFaqFromHtml(withoutH1, normalizedFaqItems)
    : withoutH1;
}

// ---------------------------------------------------------------------------
// Paragraph-Group Splitting (no-H2 fallback)
// ---------------------------------------------------------------------------

/**
 * Split HTML into sections by grouping block-level elements.
 * Used when no H2 headings are present.
 *
 * Preserves semantic block boundaries:
 * - Never splits inside lists (<ul>/<ol>) or definition lists (<dl>)
 * - Never splits between a heading (h3-h6) and its following content
 * - Prefers natural paragraph group boundaries
 * - Targets ~300-500 words per section
 */
export function splitByParagraphGroups(html: string): string[] {
  if (!html || html.trim() === "") return [];

  // Parse HTML into top-level block elements
  const blocks = parseBlockElements(html);
  if (blocks.length === 0) return [html.trim()];

  const totalWords = blocks.reduce((sum, b) => sum + b.wordCount, 0);

  // If content is short enough for a single section, return as-is
  if (totalWords < 400) return [html.trim()];

  const targetWordsPerSection = 400;
  const sections: string[] = [];
  let currentGroup: ParsedBlock[] = [];
  let currentWordCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = i + 1 < blocks.length ? blocks[i + 1] : null;

    currentGroup.push(block);
    currentWordCount += block.wordCount;

    // Determine if we should split here
    const reachedTarget = currentWordCount >= targetWordsPerSection;
    const isLastBlock = i === blocks.length - 1;

    if (isLastBlock) {
      // Flush remaining
      sections.push(currentGroup.map((b) => b.html).join(""));
      break;
    }

    if (reachedTarget && canSplitAfter(block, nextBlock)) {
      sections.push(currentGroup.map((b) => b.html).join(""));
      currentGroup = [];
      currentWordCount = 0;
    }
  }

  // If we ended up with just 1 section but content is long, that's fine
  return sections.filter((s) => s.trim() !== "");
}

interface ParsedBlock {
  html: string;
  tag: string;
  wordCount: number;
  isHeading: boolean;
  isList: boolean;
}

/**
 * Parse HTML string into an array of top-level block elements.
 * Handles nested content correctly by tracking tag depth.
 */
function parseBlockElements(html: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const blockTagPattern = /^<(p|div|ul|ol|dl|table|blockquote|figure|section|article|h[1-6]|hr|pre)(\s|>|\/)/i;
  const selfClosingPattern = /^<(hr|br)(\s|>|\/)/i;

  let remaining = html.trim();

  while (remaining.length > 0) {
    // Skip whitespace between blocks
    const wsMatch = remaining.match(/^\s+/);
    if (wsMatch) {
      remaining = remaining.slice(wsMatch[0].length);
      if (remaining.length === 0) break;
    }

    // Check for block-level element
    const tagMatch = remaining.match(blockTagPattern);
    if (tagMatch) {
      const tagName = tagMatch[1].toLowerCase();

      // Self-closing tags
      if (selfClosingPattern.test(remaining)) {
        const endIdx = remaining.indexOf(">") + 1;
        const blockHtml = remaining.slice(0, endIdx);
        blocks.push({
          html: blockHtml,
          tag: tagName,
          wordCount: 0,
          isHeading: /^h[1-6]$/i.test(tagName),
          isList: /^(ul|ol|dl)$/i.test(tagName),
        });
        remaining = remaining.slice(endIdx);
        continue;
      }

      // Find closing tag respecting nesting
      const blockHtml = extractFullElement(remaining, tagName);
      if (blockHtml) {
        const plainText = blockHtml.replace(/<[^>]*>/g, "");
        const wordCount = plainText.split(/\s+/).filter(Boolean).length;
        blocks.push({
          html: blockHtml,
          tag: tagName,
          wordCount,
          isHeading: /^h[1-6]$/i.test(tagName),
          isList: /^(ul|ol|dl)$/i.test(tagName),
        });
        remaining = remaining.slice(blockHtml.length);
        continue;
      }
    }

    // If no block tag found, grab text up to the next block tag or end
    const nextTag = remaining.search(/<(?:p|div|ul|ol|dl|table|blockquote|figure|section|article|h[1-6]|hr|pre)(\s|>|\/)/i);
    if (nextTag > 0) {
      const chunk = remaining.slice(0, nextTag).trim();
      if (chunk) {
        const wordCount = chunk.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
        blocks.push({
          html: chunk,
          tag: "text",
          wordCount,
          isHeading: false,
          isList: false,
        });
      }
      remaining = remaining.slice(nextTag);
    } else {
      // No more block tags — rest is inline content
      const chunk = remaining.trim();
      if (chunk) {
        const wordCount = chunk.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
        blocks.push({
          html: chunk,
          tag: "text",
          wordCount,
          isHeading: false,
          isList: false,
        });
      }
      break;
    }
  }

  return blocks;
}

/**
 * Extract a complete HTML element including nested same-name tags.
 */
function extractFullElement(html: string, tagName: string): string | null {
  const openPattern = new RegExp(`<${tagName}(\\s|>)`, "gi");
  const closePattern = new RegExp(`</${tagName}>`, "gi");

  let depth = 0;
  let pos = 0;

  while (pos < html.length) {
    openPattern.lastIndex = pos;
    closePattern.lastIndex = pos;

    const openMatch = openPattern.exec(html);
    const closeMatch = closePattern.exec(html);

    if (!closeMatch) {
      // No closing tag found — take rest of string
      return html;
    }

    if (openMatch && openMatch.index < closeMatch.index) {
      depth++;
      pos = openMatch.index + openMatch[0].length;
    } else {
      depth--;
      if (depth <= 0) {
        return html.slice(0, closeMatch.index + closeMatch[0].length);
      }
      pos = closeMatch.index + closeMatch[0].length;
    }
  }

  return html;
}

/**
 * Determine if we can safely split after a given block.
 * Prevents splitting between a heading and its content,
 * or in the middle of related block sequences.
 */
function canSplitAfter(current: ParsedBlock, next: ParsedBlock | null): boolean {
  if (!next) return true;

  // Never split right after a heading — keep heading + following content together
  if (current.isHeading) return false;

  // Never split right before a list that follows a paragraph (likely intro + list)
  // But only if the current paragraph is short (< 50 words)
  if (next.isList && current.tag === "p" && current.wordCount < 50) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Section Image Extraction
// ---------------------------------------------------------------------------

/**
 * For each content section, extract the first <img> tag:
 * - Move its src → section.image, alt → section.imageAlt
 * - Remove that first <img> (and wrapping <figure>/<p> if it becomes empty)
 *   from the section body
 * - Leave remaining images in the rich text body
 */
export function extractSectionImages(
  sections: Array<{
    body: string;
    image: string;
    imageAlt: string;
    imagePosition: string;
    showCTAs?: boolean;
  }>,
): Array<{
  body: string;
  image: string;
  imageAlt: string;
  imagePosition: string;
  showCTAs?: boolean;
}> {
  return sections.map((section) => {
    // Skip if section already has an explicit image
    if (section.image) return section;

    const imgMatch = section.body.match(
      /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
    );
    if (!imgMatch) return section;

    const imgSrc = imgMatch[1];
    const altMatch = imgMatch[0].match(/alt=["']([^"']*)["']/i);
    const imgAlt = altMatch ? altMatch[1] : "";

    // Remove the first <img> from the body
    let updatedBody = section.body;
    const imgTag = imgMatch[0];

    // Try removing <figure> wrapper if it only contains this image
    const figurePattern = new RegExp(
      `<figure[^>]*>\\s*${escapeRegex(imgTag)}\\s*(?:<figcaption[^>]*>[\\s\\S]*?</figcaption>\\s*)?</figure>`,
      "i",
    );
    if (figurePattern.test(updatedBody)) {
      updatedBody = updatedBody.replace(figurePattern, "");
    } else {
      // Try removing <p> wrapper if it only contains this image
      const pWrapperPattern = new RegExp(
        `<p[^>]*>\\s*${escapeRegex(imgTag)}\\s*</p>`,
        "i",
      );
      if (pWrapperPattern.test(updatedBody)) {
        updatedBody = updatedBody.replace(pWrapperPattern, "");
      } else {
        // Just remove the img tag itself
        updatedBody = updatedBody.replace(imgTag, "");
      }
    }

    return {
      ...section,
      image: imgSrc,
      imageAlt: imgAlt,
      body: updatedBody.trim(),
    };
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// FAQ Removal from Body
// ---------------------------------------------------------------------------

/**
 * Remove FAQ-pattern content from HTML body after it has been extracted
 * into FAQ items. Prevents duplication between FAQ section and body sections.
 */
export function removeFaqFromHtml(
  html: string,
  faqItems: Array<{ question: string; answer: string }>,
): string {
  if (!html || faqItems.length === 0) return html;

  let result = html;

  // Remove <dl> blocks that contain FAQ content
  result = result.replace(
    /<dl[^>]*>[\s\S]*?<\/dl>/gi,
    (match) => {
      // Check if this dl contains any of our FAQ questions
      const plainDl = match.replace(/<[^>]*>/g, "");
      const containsFaq = faqItems.some((item) =>
        plainDl.includes(item.question),
      );
      return containsFaq ? "" : match;
    },
  );

  // Remove h3+content blocks that match FAQ questions.
  // Uses a tempered greedy token (?:(?!<\/h3>)[\s\S]) to ensure the question
  // text is found WITHIN a single <h3>…</h3> element, preventing accidental
  // removal of unrelated h3 blocks that appear earlier in the HTML.
  // After the closing </h3>, we capture the answer content up to the next
  // heading or block-level element.
  for (const item of faqItems) {
    const escapedQ = item.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match <h3> containing the question (without crossing </h3> boundaries)
    // then the answer content after </h3> up to the next block element or end
    const h3Pattern = new RegExp(
      `<h3[^>]*>(?:(?!<\\/h3>)[\\s\\S])*?${escapedQ}(?:(?!<\\/h3>)[\\s\\S])*?<\\/h3>[\\s\\S]*?(?=<h[2-6]|<div|<section|<article|<footer|<aside|$)`,
      "i",
    );
    const h3Match = result.match(h3Pattern);
    if (h3Match) {
      // Safety check: verify the matched block contains the detected answer.
      const matchPlain = h3Match[0].replace(/<[^>]*>/g, "").trim();
      const answerPlain = item.answer.replace(/<[^>]*>/g, "").trim();
      const answerSnippet = answerPlain.slice(0, 40).trim();
      const questionEnd = matchPlain.indexOf(item.question) + item.question.length;
      const afterQuestion = matchPlain.slice(questionEnd).trim();

      if (answerSnippet && afterQuestion.includes(answerSnippet)) {
        result = result.replace(h3Match[0], "");
      }
    }
  }

  // Remove FAQ heading (<h2>Frequently Asked Questions</h2> or similar).
  // When FAQ items have been extracted, the parent H2 heading that introduces
  // the FAQ block should also be removed so it doesn't become an orphan
  // content section. We match common FAQ heading patterns.
  const faqHeadingPattern =
    /<h2[^>]*>\s*(?:frequently\s+asked\s+questions|faq|faqs|common\s+questions|q\s*(?:&amp;|&)\s*a|questions\s*(?:&amp;|&|and)\s*answers)\s*<\/h2>/gi;
  result = result.replace(faqHeadingPattern, "");

  // Remove <strong>question?</strong> + answer blocks
  for (const item of faqItems) {
    if (!item.question.endsWith("?")) continue;
    const escapedQ = item.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const strongPattern = new RegExp(
      `<(?:p|div)[^>]*>\\s*<(?:strong|b)[^>]*>\\s*${escapedQ}\\s*</(?:strong|b)>[\\s\\S]*?</(?:p|div)>`,
      "gi",
    );
    result = result.replace(strongPattern, "");
  }

  // Clean up empty tags and excessive whitespace left behind
  result = result
    .replace(/<(p|div|section)\b[^>]*>(\s|&nbsp;)*<\/\1>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return result;
}

// ---------------------------------------------------------------------------
// HTML Helpers (exported for use by recipe rules and other modules)
// ---------------------------------------------------------------------------

/**
 * Ensure text content is wrapped in HTML paragraphs.
 * If already HTML, returns as-is. If plain text, wraps in <p> tags.
 */
export function ensureHtml(text: string): string {
  if (!text || text.trim() === "") return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return `<p>${text}</p>`;
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Extract the first <p> element from HTML content.
 * Falls back to first 200 chars of plain text wrapped in <p>.
 */
export function extractFirstParagraph(html: string): string {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (match) return `<p>${match[1]}</p>`;
  const plain = stripTags(html).trim();
  if (plain.length > 200) return `<p>${plain.slice(0, 200)}…</p>`;
  return plain ? `<p>${plain}</p>` : "";
}

/**
 * Extract the first <img> src URL from HTML content.
 * Returns empty string if no image found.
 */
export function extractFirstImage(html: string): string {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : "";
}
