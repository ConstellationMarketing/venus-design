// ============================================================================
// HTML Normalizer — Content Extraction & Normalization Layer
// ============================================================================
//
// Provides HTML normalization functions for the import pipeline:
// - normalizeUrls(): convert relative href/src to absolute URLs
// - removeDuplicateBlocks(): detect and deduplicate identical/near-identical blocks
// - cleanInlineMarkup(): unwrap unnecessary spans, flatten nested inline tags
// - normalizeHeadings(): convert extra H1→H2, ensure consistent hierarchy
// - removeEmptySections(): drop sections with no meaningful content (<50 chars)
// - normalizeHtml(): orchestrates all the above in the correct order
//
// All functions use regex-based processing (no DOMParser dependency) to stay
// consistent with the rest of the importer pipeline.
// ============================================================================

import {
  extractMainContent,
  filterSecondaryContent,
  type FilterOptions,
} from "./contentFilter";

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export interface NormalizeHtmlOptions {
  /** Source domain for resolving relative URLs (e.g. "https://example.com") */
  sourceDomain?: string;
  /** Options for secondary content filtering (template-specific behavior) */
  filterOptions?: FilterOptions;
  /** Skip page shell extraction and content filtering (for already-clean HTML) */
  skipContentExtraction?: boolean;
}

/**
 * Run all HTML normalization steps in sequence.
 * This is the single entry point wired into sourceCleaner.ts.
 */
export function normalizeHtml(
  html: string,
  options?: NormalizeHtmlOptions,
): string {
  if (!html || html.trim() === "") return html;

  let result = html;

  // 1. Extract main content (strip page shell + unwrap builder divs)
  if (!options?.skipContentExtraction) {
    result = extractMainContent(result);
  }

  // 2. Filter secondary content (remove sidebar/widget/CTA blocks)
  if (!options?.skipContentExtraction) {
    const filterResult = filterSecondaryContent(result, options?.filterOptions);
    result = filterResult.html;
  }

  // 3. Normalize URLs (needs structure intact for href/src resolution)
  if (options?.sourceDomain) {
    result = normalizeUrls(result, options.sourceDomain);
  }

  // 4. Clean inline markup (unwrap spans, flatten nested inline tags)
  result = cleanInlineMarkup(result);

  // 5. Normalize headings (extra H1→H2, fix hierarchy)
  result = normalizeHeadings(result);

  // 6. Remove duplicate content blocks
  result = removeDuplicateBlocks(result);

  // 7. Final empty-element cleanup (spans/divs can become empty after inline
  //    markup cleanup or deduplication — catch them here)
  result = removeEmptyElements(result);

  // 8. Clean up whitespace left behind
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

// ---------------------------------------------------------------------------
// 1. URL Normalization
// ---------------------------------------------------------------------------

/**
 * Convert relative `href` and `src` attributes to absolute URLs
 * using the provided source domain.
 *
 * Handles:
 * - Protocol-relative URLs (//cdn.example.com/...)
 * - Root-relative URLs (/images/foo.jpg)
 * - Path-relative URLs (images/foo.jpg, ../images/foo.jpg)
 * - Already-absolute URLs are left unchanged
 * - Data URIs and anchors (#section) are left unchanged
 */
export function normalizeUrls(html: string, sourceDomain: string): string {
  if (!html || !sourceDomain) return html;

  // Clean up the source domain: ensure it has a protocol, strip trailing slash
  let baseUrl = sourceDomain.trim().replace(/\/+$/, "");
  if (!baseUrl.match(/^https?:\/\//i)) {
    baseUrl = `https://${baseUrl}`;
  }

  // Extract origin and pathname base from the domain
  let origin: string;
  try {
    const parsed = new URL(baseUrl);
    origin = parsed.origin;
  } catch {
    // If URL parsing fails, try basic extraction
    const match = baseUrl.match(/^(https?:\/\/[^/?#]+)/i);
    origin = match ? match[1] : baseUrl;
  }

  // Process href attributes
  let result = html.replace(
    /(href\s*=\s*["'])([^"']*)(["'])/gi,
    (_match, prefix, url, suffix) => {
      const resolved = resolveUrl(url, origin);
      return `${prefix}${resolved}${suffix}`;
    },
  );

  // Process src attributes
  result = result.replace(
    /(src\s*=\s*["'])([^"']*)(["'])/gi,
    (_match, prefix, url, suffix) => {
      const resolved = resolveUrl(url, origin);
      return `${prefix}${resolved}${suffix}`;
    },
  );

  // Process srcset attributes (comma-separated list of URLs with optional descriptors)
  result = result.replace(
    /(srcset\s*=\s*["'])([^"']*)(["'])/gi,
    (_match, prefix, srcset, suffix) => {
      const resolved = srcset
        .split(",")
        .map((entry: string) => {
          const trimmed = entry.trim();
          if (!trimmed) return trimmed;
          // Each entry is "url descriptor" (e.g. "image.jpg 2x")
          const parts = trimmed.split(/\s+/);
          if (parts.length > 0) {
            parts[0] = resolveUrl(parts[0], origin);
          }
          return parts.join(" ");
        })
        .join(", ");
      return `${prefix}${resolved}${suffix}`;
    },
  );

  return result;
}

/**
 * Resolve a single URL against the origin.
 * Leaves absolute URLs, data URIs, and fragment-only links unchanged.
 */
function resolveUrl(url: string, origin: string): string {
  const trimmed = url.trim();

  // Skip empty, absolute, data URIs, mailto, tel, and fragment-only
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (/^tel:/i.test(trimmed)) return trimmed;
  if (/^#/.test(trimmed)) return trimmed;
  if (/^javascript:/i.test(trimmed)) return trimmed;

  // Protocol-relative → add https:
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  // Root-relative → prepend origin
  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }

  // Path-relative → prepend origin + /
  return `${origin}/${trimmed}`;
}

// ---------------------------------------------------------------------------
// 2. Duplicate Content Removal
// ---------------------------------------------------------------------------

/**
 * Detect identical or near-identical top-level block elements and
 * keep only the first instance.
 *
 * "Near-identical" = same text content after stripping tags, collapsing
 * whitespace, and lowercasing. This catches blocks that differ only in
 * minor formatting or attribute differences.
 */
export function removeDuplicateBlocks(html: string): string {
  if (!html) return html;

  // Split into top-level block chunks.
  // We look for block-level elements at the top level.
  const blockPattern =
    /(<(?:p|div|section|article|aside|blockquote|ul|ol|dl|table|figure|h[1-6]|pre|hr|form|nav|header|footer)\b[^>]*>[\s\S]*?<\/(?:p|div|section|article|aside|blockquote|ul|ol|dl|table|figure|h[1-6]|pre|form|nav|header|footer)>|<hr\s*\/?>)/gi;

  const blocks: Array<{ html: string; fingerprint: string }> = [];
  let lastIndex = 0;
  const gaps: Array<{ position: number; text: string }> = [];
  let match: RegExpExecArray | null;

  // Reset regex
  blockPattern.lastIndex = 0;
  while ((match = blockPattern.exec(html)) !== null) {
    // Capture any text between blocks
    if (match.index > lastIndex) {
      const gap = html.slice(lastIndex, match.index);
      if (gap.trim()) {
        gaps.push({ position: blocks.length, text: gap });
      }
    }
    const fingerprint = generateFingerprint(match[0]);
    blocks.push({ html: match[0], fingerprint });
    lastIndex = match.index + match[0].length;
  }

  // If we couldn't parse any blocks, return as-is
  if (blocks.length === 0) return html;

  // Trailing content
  const trailing = html.slice(lastIndex);

  // Deduplicate: keep first occurrence of each fingerprint
  const seen = new Set<string>();
  const kept: Array<{ html: string; fingerprint: string; originalIndex: number }> = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    // Skip very short fingerprints (they're likely too generic)
    if (block.fingerprint.length < 20) {
      kept.push({ ...block, originalIndex: i });
      continue;
    }
    if (!seen.has(block.fingerprint)) {
      seen.add(block.fingerprint);
      kept.push({ ...block, originalIndex: i });
    }
  }

  // If nothing was removed, return original
  if (kept.length === blocks.length) return html;

  // Reassemble: interleave gaps and kept blocks
  let result = "";
  const keptIndices = new Set(kept.map((k) => k.originalIndex));

  for (const gap of gaps) {
    // Only include gap if the block before or after it was kept
    const blockBefore = gap.position > 0 ? gap.position - 1 : -1;
    const blockAfter = gap.position;
    if (
      (blockBefore >= 0 && keptIndices.has(blockBefore)) ||
      keptIndices.has(blockAfter)
    ) {
      // Gap will be placed in sequence
    }
  }

  // Simpler reassembly: just join kept blocks
  result = kept.map((k) => k.html).join("\n");
  if (trailing.trim()) {
    result += trailing;
  }

  return result;
}

/**
 * Generate a normalized fingerprint for content comparison.
 * Strips tags, collapses whitespace, lowercases, removes punctuation.
 */
function generateFingerprint(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ") // strip tags
    .replace(/&[a-z]+;/gi, " ") // strip entities
    .replace(/[^\w\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ") // collapse whitespace
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// 3. Inline Markup Cleanup
// ---------------------------------------------------------------------------

/**
 * Clean unnecessary inline markup:
 * - Unwrap `<span>` elements that add no semantic value
 * - Flatten nested inline tags (e.g. `<span><strong><span>text</span></strong></span>`)
 * - Remove empty inline elements
 */
export function cleanInlineMarkup(html: string): string {
  if (!html) return html;

  let result = html;
  let prev = "";
  let iterations = 0;

  // Iterative passes since unwrapping can expose more nesting
  while (result !== prev && iterations < 10) {
    prev = result;

    // 1. Unwrap <span> elements with no meaningful attributes.
    //    Keep spans that have style/class ONLY if they convey color or font-weight
    //    (but since we strip attributes in normalization, most spans are pure wrappers)
    result = result.replace(
      /<span(?:\s+[^>]*)?>([^]*?)<\/span>/gi,
      (_match, inner) => {
        // Check if the span has attributes that matter
        const attrMatch = _match.match(/<span(\s+[^>]*)?>/i);
        const attrs = attrMatch?.[1] || "";

        // If span has no attributes or only class/id/style/data attrs, unwrap
        if (
          !attrs.trim() ||
          /^\s+(?:class|id|style|data-[a-z-]+)\s*=/i.test(attrs)
        ) {
          return inner;
        }

        // Keep spans with other meaningful attributes (rare in practice)
        return _match;
      },
    );

    // 2. Flatten double-wrapped inline tags:
    //    <strong><strong>text</strong></strong> → <strong>text</strong>
    //    <em><em>text</em></em> → <em>text</em>
    for (const tag of ["strong", "b", "em", "i"]) {
      const doubleWrap = new RegExp(
        `<${tag}(?:\\s[^>]*)?>\\s*<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>\\s*<\\/${tag}>`,
        "gi",
      );
      result = result.replace(doubleWrap, `<${tag}>$1</${tag}>`);
    }

    // 3. Normalize <b> → <strong>, <i> → <em> for consistency
    result = result.replace(/<b(?:\s[^>]*)?>/gi, "<strong>");
    result = result.replace(/<\/b>/gi, "</strong>");
    result = result.replace(/<i(?:\s[^>]*)?>/gi, "<em>");
    result = result.replace(/<\/i>/gi, "</em>");

    // 4. Remove empty inline elements
    result = result.replace(
      /<(strong|em|span|b|i)(?:\s[^>]*)?>(\s*)<\/\1>/gi,
      "$2",
    );

    iterations++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. Heading Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize heading structure:
 * - Convert all H1 tags after the first one to H2
 *   (there should be only one H1 per page — the hero title)
 * - Ensure consistent heading hierarchy:
 *   - No jumps from H2 to H4 (fill gaps)
 *   - H3 can follow H2, H4 follows H3, etc.
 */
export function normalizeHeadings(html: string): string {
  if (!html) return html;

  let result = html;

  // Step 1: Convert duplicate H1s to H2.
  // Keep the first H1 (if any), convert subsequent ones to H2.
  let h1Count = 0;
  result = result.replace(
    /<(\/?)h1(\s[^>]*)?>/gi,
    (_match, slash, attrs) => {
      if (!slash) {
        // Opening tag
        h1Count++;
        if (h1Count > 1) {
          return `<h2${attrs || ""}>`;
        }
        return _match;
      } else {
        // Closing tag — if this is for a converted h1, close as h2
        if (h1Count > 1) {
          // We need to track which closing tag corresponds to a converted one
          // Since we increment on open, the current h1Count tells us
          return "</h2>";
        }
        return _match;
      }
    },
  );

  // More precise duplicate H1→H2: reprocess with proper open/close tracking
  if (h1Count > 1) {
    let count = 0;
    result = html; // restart from original
    result = result.replace(
      /<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi,
      (_match, attrs, content) => {
        count++;
        if (count > 1) {
          return `<h2${attrs || ""}>${content}</h2>`;
        }
        return _match;
      },
    );
  }

  // Step 2: Fix heading hierarchy gaps.
  // Collect all heading levels used in order, then fix jumps.
  const headingPattern = /<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;
  const headings: Array<{
    full: string;
    level: number;
    attrs: string;
    content: string;
    index: number;
  }> = [];

  let hMatch: RegExpExecArray | null;
  headingPattern.lastIndex = 0;
  while ((hMatch = headingPattern.exec(result)) !== null) {
    headings.push({
      full: hMatch[0],
      level: parseInt(hMatch[1], 10),
      attrs: hMatch[2] || "",
      content: hMatch[3],
      index: hMatch.index,
    });
  }

  if (headings.length > 1) {
    // Build a level mapping to fix hierarchy gaps
    // E.g., if we have H1, H3, H4 → remap H3→H2, H4→H3
    const levelMap = new Map<number, number>();
    let expectedLevel = headings[0].level;
    levelMap.set(headings[0].level, headings[0].level);

    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const prevMappedLevel =
        levelMap.get(headings[i - 1].level) ?? headings[i - 1].level;

      if (currentLevel > prevMappedLevel + 1) {
        // Gap detected: this heading skips a level
        const correctedLevel = prevMappedLevel + 1;
        levelMap.set(currentLevel, Math.min(correctedLevel, 6));
      } else if (currentLevel <= prevMappedLevel) {
        // Same or higher level: use as-is (or existing mapping)
        if (!levelMap.has(currentLevel)) {
          levelMap.set(currentLevel, currentLevel);
        }
      } else {
        // Normal progression
        if (!levelMap.has(currentLevel)) {
          levelMap.set(currentLevel, currentLevel);
        }
      }
    }

    // Apply corrections — only remap levels that actually need changing
    for (const heading of headings) {
      const mappedLevel = levelMap.get(heading.level);
      if (mappedLevel !== undefined && mappedLevel !== heading.level) {
        const oldTag = heading.full;
        const newTag = `<h${mappedLevel}${heading.attrs}>${heading.content}</h${mappedLevel}>`;
        result = result.replace(oldTag, newTag);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 5. Final Empty-Element Cleanup
// ---------------------------------------------------------------------------

/**
 * Remove block-level (and inline) elements that are empty or contain only
 * whitespace / &nbsp; / <br> tags.  Runs iteratively (up to 10 passes)
 * because removing inner empty elements can make outer ones empty too.
 *
 * This is broader than `removeEmptyWrappers()` in contentFilter.ts:
 * it also catches <p>, <br>-only content, and cascading empties.
 */
export function removeEmptyElements(html: string): string {
  if (!html) return html;

  const emptyTags = [
    "div",
    "section",
    "article",
    "aside",
    "header",
    "footer",
    "main",
    "nav",
    "span",
    "p",
  ];

  // Build a single alternation pattern for all target tags
  const tagGroup = emptyTags.join("|");

  // Matches an element whose body is empty, whitespace-only, &nbsp;-only,
  // <br>-only, or any combination of those.
  const emptyPattern = new RegExp(
    `<(${tagGroup})\\b[^>]*>(?:\\s|&nbsp;|<br\\s*/?>)*<\\/\\1>`,
    "gi",
  );

  let result = html;
  let prev = "";
  let iterations = 0;

  while (result !== prev && iterations < 10) {
    prev = result;
    result = result.replace(emptyPattern, "");
    iterations++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 6. Low-Quality Section Removal
// ---------------------------------------------------------------------------

/**
 * Filter out low-quality content sections after H2 splitting.
 * Removes sections that:
 * - Have no meaningful paragraph content (no <p> tags with text)
 * - Have very low text content (< 50 characters of plain text)
 *
 * This operates on an array of already-split sections (output of splitOnH2).
 * It's called AFTER splitting, not on the raw HTML.
 */
export function removeEmptySections(sections: string[]): string[] {
  if (!sections || sections.length === 0) return sections;

  // Never remove all sections — keep at least one
  const filtered = sections.filter((section) => {
    const plainText = section
      .replace(/<[^>]*>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Drop sections shorter than 50 characters of plain text
    if (plainText.length < 50) return false;

    // Drop sections with no meaningful paragraph content
    // (e.g. a lone heading with no body text)
    const hasParagraph = /<p\b[^>]*>[\s\S]*?<\/p>/i.test(section);
    const hasList = /<(?:ul|ol)\b[^>]*>[\s\S]*?<\/(?:ul|ol)>/i.test(section);
    const hasTable = /<table\b[^>]*>[\s\S]*?<\/table>/i.test(section);
    const hasBlockquote = /<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/i.test(section);

    // A section must have at least one content block (not just a heading)
    if (!hasParagraph && !hasList && !hasTable && !hasBlockquote) {
      return false;
    }

    // Drop sections that only contain a heading and very little paragraph content.
    // A heading alone or heading + tiny paragraph is not a meaningful section.
    if (hasParagraph && !hasList && !hasTable && !hasBlockquote) {
      // Extract paragraph text (excluding heading text)
      const withoutHeadings = section.replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, "");
      const paraText = withoutHeadings
        .replace(/<[^>]*>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      // If paragraph content is < 30 characters, this section is effectively empty
      if (paraText.length < 30) return false;
    }

    return true;
  });

  // If all sections were filtered out, return the original (safety net)
  return filtered.length > 0 ? filtered : sections;
}
