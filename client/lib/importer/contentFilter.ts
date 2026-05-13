// ============================================================================
// Content Filter — Page Shell Stripping & Secondary Content Removal
// ============================================================================
//
// Provides two major functions for the HTML normalization pipeline:
//
// 1. extractMainContent(html) — Strips the page shell (DOCTYPE, html, head,
//    body tags, scripts, styles) and unwraps builder layout containers
//    (Divi, Elementor, WPBakery, Avada, etc.) while also applying generic
//    structural heuristics for non-builder HTML.
//
// 2. filterSecondaryContent(html, options?) — Removes non-primary content
//    blocks: sidebar widgets, contact forms, CTAs, nav blocks, etc.
//    Extensible via template-specific filter options.
//
// Design principles:
// - Builder-AWARE but not builder-DEPENDENT: recognizes known builder
//   patterns as hints, but always falls back to generic structural heuristics.
// - All regex-based (no DOMParser) to stay consistent with the pipeline.
// - Entire blocks (heading + content) are removed when detected as secondary.
// - Filtering is extensible for template-specific behavior.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterResult {
  html: string;
  removed: Array<{ reason: string; snippet: string }>;
}

/**
 * Options for template-specific filtering behavior.
 * Different templates may want different secondary content rules.
 */
export interface FilterOptions {
  /**
   * Template type hint — some blocks (e.g. address/location) are secondary
   * for practice pages but may be primary for contact pages.
   */
  templateType?: string;

  /**
   * Additional heading patterns to treat as secondary content.
   * Merged with the built-in patterns.
   */
  extraSecondaryHeadings?: RegExp[];

  /**
   * Additional block-level detection functions.
   * Each receives (heading, blockContent) and returns a reason string or null.
   */
  extraDetectors?: Array<
    (heading: string, blockHtml: string) => string | null
  >;

  /**
   * If true, also removes address/location/contact blocks.
   * Defaults to true for "practice" template, false otherwise.
   */
  removeContactBlocks?: boolean;
}

// ---------------------------------------------------------------------------
// 1. extractMainContent
// ---------------------------------------------------------------------------

/**
 * Strip the page shell and builder layout wrappers to extract just the
 * semantic content. Works for:
 * - Full HTML documents (with DOCTYPE, html, head, body)
 * - Builder-generated HTML (Divi, Elementor, WPBakery, Avada, etc.)
 * - Generic nested HTML from custom themes
 *
 * Steps:
 * 1. Strip page shell (DOCTYPE, html, head, body, script, style, etc.)
 * 2. Unwrap builder layout containers (known class patterns + generic heuristics)
 * 3. Strip non-semantic attributes from remaining wrappers
 * 4. Clean up empty wrappers and excessive whitespace
 */
export function extractMainContent(html: string): string {
  if (!html || html.trim() === "") return html;

  let result = html;

  // ---- Step 1: Strip page shell ----
  result = stripPageShell(result);

  // ---- Step 1.5: Extract main column from multi-column layouts ----
  result = extractMainColumn(result);

  // ---- Step 2: Unwrap layout containers ----
  result = unwrapLayoutContainers(result);

  // ---- Step 3: Strip non-semantic attributes ----
  result = stripNonSemanticAttributes(result);

  // ---- Step 4: Final cleanup ----
  result = removeEmptyWrappers(result);
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

// ---------------------------------------------------------------------------
// Step 1: Strip Page Shell
// ---------------------------------------------------------------------------

function stripPageShell(html: string): string {
  let result = html;

  // Remove <!DOCTYPE ...>
  result = result.replace(/<!DOCTYPE[^>]*>/gi, "");

  // Remove <head>...</head> entirely (including contents)
  result = result.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");

  // Extract content from <body>...</body> if present
  const bodyMatch = result.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    result = bodyMatch[1];
  }

  // Remove <html> and </html> tags
  result = result.replace(/<\/?html\b[^>]*>/gi, "");
  // Remove <body> and </body> tags (in case of partial matches)
  result = result.replace(/<\/?body\b[^>]*>/gi, "");

  // Remove script, style, noscript, link, meta tags
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  result = result.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  result = result.replace(/<link\b[^>]*\/?>/gi, "");
  result = result.replace(/<meta\b[^>]*\/?>/gi, "");

  // Remove HTML comments
  result = result.replace(/<!--[\s\S]*?-->/g, "");

  return result;
}

// ---------------------------------------------------------------------------
// Step 2: Unwrap Layout Containers
// ---------------------------------------------------------------------------

/**
 * Known builder class prefixes — used as HINTS, not hard requirements.
 */
const BUILDER_CLASS_PATTERNS = [
  "et_pb_",        // Divi
  "et_builder_",   // Divi
  "et-l",          // Divi layout
  "et-boc",        // Divi
  "et-main",       // Divi
  "elementor-",    // Elementor
  "vc_",           // WPBakery
  "fl-",           // Beaver Builder
  "fusion-",       // Avada / Fusion Builder
  "av-",           // Enfold / Avia
  "cs-",           // Cornerstone
  "wp-block-",     // Gutenberg (layout blocks)
  "site-content",  // Common themes
  "entry-content", // Common themes
  "page-content",  // Common themes
];

/**
 * Known page-level container IDs.
 */
const PAGE_CONTAINER_IDS = [
  "page-container",
  "main-content",
  "et-boc",
  "et-main-area",
  "content-area",
  "primary",
  "site-content",
  "page",
  "wrapper",
  "main",
  "content",
  "app",
  "root",
];

/**
 * Content container class names — these contain the actual content we want
 * to extract FROM (i.e., take their innerHTML, discard the wrapper).
 */
const CONTENT_CONTAINER_CLASSES = [
  "et_pb_text_inner",
  "elementor-widget-container",
  "vc_column-inner",
  "fl-rich-text",
  "fusion-text",
  "av-special-heading",
  "entry-content",
  "post-content",
  "article-content",
  "page-content",
];

/**
 * Check if an element's class attribute contains a builder layout class.
 */
function hasBuilderLayoutClass(classAttr: string): boolean {
  return BUILDER_CLASS_PATTERNS.some((prefix) =>
    classAttr.includes(prefix),
  );
}

/**
 * Check if an element's id attribute matches a known page container.
 */
function hasPageContainerId(idAttr: string): boolean {
  const id = idAttr.toLowerCase().trim();
  return PAGE_CONTAINER_IDS.some(
    (containerId) => id === containerId || id.includes(containerId),
  );
}

/**
 * Check if an element's class attribute matches a content container.
 */
function hasContentContainerClass(classAttr: string): boolean {
  return CONTENT_CONTAINER_CLASSES.some((cls) => classAttr.includes(cls));
}

/**
 * Generic heuristic: detect if a div/section is purely a layout wrapper.
 * A layout wrapper is a block element that:
 * - Has no direct text content (only child elements)
 * - OR has only class/id/style/data attributes (no semantic content)
 * - AND is not a content container itself
 */
function isGenericLayoutWrapper(tag: string, attrs: string): boolean {
  // Only consider div, section, article, main, header, footer, aside
  const layoutTags = [
    "div",
    "section",
    "article",
    "main",
    "header",
    "footer",
    "aside",
    "nav",
  ];
  if (!layoutTags.includes(tag.toLowerCase())) return false;

  // Bare wrapper: div/section with no attributes is almost certainly
  // a leftover layout wrapper (builder classes may have been stripped)
  if (!attrs.trim()) return true;

  // Extract class attribute
  const classMatch = attrs.match(/class=["']([^"']*)["']/i);
  const classAttr = classMatch ? classMatch[1] : "";

  // Extract id attribute
  const idMatch = attrs.match(/id=["']([^"']*)["']/i);
  const idAttr = idMatch ? idMatch[1] : "";

  // Never unwrap content containers
  if (classAttr && hasContentContainerClass(classAttr)) return false;

  // Builder layout class → unwrap
  if (classAttr && hasBuilderLayoutClass(classAttr)) return true;

  // Page container ID → unwrap
  if (idAttr && hasPageContainerId(idAttr)) return true;

  // Generic structural heuristic: elements with ONLY layout-style classes
  // (containing words like wrap, container, row, column, inner, outer, grid)
  if (classAttr) {
    const layoutClassWords =
      /\b(wrap|wrapper|container|row|column|col|inner|outer|grid|layout|main|content-area|site-main|page-wrap)\b/i;
    if (layoutClassWords.test(classAttr) && !hasContentContainerClass(classAttr)) {
      return true;
    }
  }

  // Generic: div/section with an id that looks like a layout container
  if (idAttr) {
    const layoutIdWords =
      /^(wrap|wrapper|container|page|main|content|primary|site|app|root|layout)$/i;
    if (layoutIdWords.test(idAttr)) return true;
  }

  return false;
}

/**
 * Unwrap layout containers iteratively.
 * Each pass finds wrapper elements and replaces them with their innerHTML.
 * Runs up to 15 passes since unwrapping outer layers exposes inner ones.
 */
function unwrapLayoutContainers(html: string): string {
  let result = html;
  let prev = "";
  let iterations = 0;
  const maxIterations = 15;

  while (result !== prev && iterations < maxIterations) {
    prev = result;

    // Pass 1: Extract content from known content containers
    // (e.g., et_pb_text_inner → take innerHTML)
    result = extractFromContentContainers(result);

    // Pass 2: Unwrap layout wrappers (builder + generic)
    result = unwrapSinglePass(result);

    iterations++;
  }

  return result;
}

/**
 * Extract innerHTML from known content containers.
 * These are elements like et_pb_text_inner whose children ARE the content.
 * Uses depth-tracking to correctly match nested elements.
 */
function extractFromContentContainers(html: string): string {
  let result = html;

  for (const cls of CONTENT_CONTAINER_CLASSES) {
    // Scan forward for each occurrence of this class
    let offset = 0;
    while (offset < result.length) {
      const searchFrom = result.slice(offset);
      // Find an opening tag with this class
      const classPattern = new RegExp(
        `<(div|span|section|article)\\b([^>]*class=["'][^"']*${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["'][^>]*)>`,
        "i",
      );
      const openMatch = classPattern.exec(searchFrom);
      if (!openMatch) break;

      const tagName = openMatch[1].toLowerCase();
      const absStart = offset + openMatch.index;
      const innerStart = absStart + openMatch[0].length;

      // Use depth-tracking to find the matching close tag
      const closePos = findMatchingClose(result, tagName, innerStart);
      if (closePos === -1) {
        offset = innerStart;
        continue;
      }

      const innerHTML = result.slice(innerStart, closePos).trim();
      const closeTagEnd = closePos + `</${tagName}>`.length;

      // Only extract if innerHTML contains semantic content
      if (/<(?:p|h[1-6]|ul|ol|dl|blockquote|table|img)\b/i.test(innerHTML)) {
        result = result.slice(0, absStart) + innerHTML + result.slice(closeTagEnd);
        // Don't advance offset — the replacement may contain more containers
      } else {
        offset = closeTagEnd;
      }
    }
  }

  return result;
}

/**
 * Single pass: find and unwrap layout wrapper elements.
 * Uses depth-tracking to correctly match nested elements.
 */
function unwrapSinglePass(html: string): string {
  let result = html;
  const layoutTags = ["div", "section", "article", "main", "header", "footer", "aside", "nav"];

  // Scan forward for layout wrapper opening tags
  let offset = 0;
  while (offset < result.length) {
    // Find next opening tag that could be a layout wrapper
    const tagPattern = /<(div|section|article|main|header|footer|aside|nav)\b([^>]*)>/i;
    const searchFrom = result.slice(offset);
    const openMatch = tagPattern.exec(searchFrom);
    if (!openMatch) break;

    const tag = openMatch[1].toLowerCase();
    const attrs = openMatch[2];
    const absStart = offset + openMatch.index;
    const innerStart = absStart + openMatch[0].length;

    // Check if this is a layout wrapper
    if (!isGenericLayoutWrapper(tag, attrs)) {
      offset = innerStart;
      continue;
    }

    // Use depth-tracking to find the matching close tag
    const closePos = findMatchingClose(result, tag, innerStart);
    if (closePos === -1) {
      offset = innerStart;
      continue;
    }

    const innerHTML = result.slice(innerStart, closePos).trim();
    const closeTagEnd = closePos + `</${tag}>`.length;

    const hasNestedBlocks = /<(?:div|section|article|main|aside|nav)\b/i.test(innerHTML);
    const hasSemanticContent = /<(?:p|h[1-6]|ul|ol|dl|blockquote|table|figure|img)\b/i.test(innerHTML);

    let shouldUnwrap = false;

    // Bare wrapper (no attributes) → always unwrap; these are leftover
    // layout containers whose builder classes were stripped or never existed
    if (!attrs.trim()) {
      shouldUnwrap = true;
    } else if (hasNestedBlocks || hasBuilderLayoutClass(attrs)) {
      shouldUnwrap = true;
    } else if (hasSemanticContent && !hasNestedBlocks) {
      // Known page-level container → still unwrap
      const idMatch = attrs.match(/id=["']([^"']*)["']/i);
      if (idMatch && hasPageContainerId(idMatch[1])) {
        shouldUnwrap = true;
      } else {
        // Generic wrapper with layout class words → unwrap
        const classMatch = attrs.match(/class=["']([^"']*)["']/i);
        if (
          classMatch &&
          /\b(wrap|wrapper|container|row|column|grid|layout|site-main|page-wrap)\b/i.test(
            classMatch[1],
          )
        ) {
          shouldUnwrap = true;
        }
      }
    } else if (!hasSemanticContent && !innerHTML.trim()) {
      // No content at all → remove entirely
      result = result.slice(0, absStart) + result.slice(closeTagEnd);
      // Don't advance offset
      continue;
    } else {
      shouldUnwrap = true;
    }

    if (shouldUnwrap) {
      result = result.slice(0, absStart) + innerHTML + result.slice(closeTagEnd);
      // Don't advance offset — replacement may expose more wrappers
    } else {
      offset = closeTagEnd;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Depth-Tracking Tag Matching
// ---------------------------------------------------------------------------

/**
 * Find the position of the matching closing tag for an element, correctly
 * tracking nested elements of the same tag name.
 *
 * @param html - Full HTML string
 * @param tagName - Tag name to match (e.g. "div")
 * @param startPos - Position AFTER the opening tag's ">"
 * @returns Position of the start of the matching closing tag, or -1 if not found
 */
function findMatchingClose(html: string, tagName: string, startPos: number): number {
  const openPattern = new RegExp(`<${tagName}(?:\\s|>|/>)`, "gi");
  const closePattern = new RegExp(`</${tagName}\\s*>`, "gi");

  let depth = 1; // We're already inside the opening tag
  let pos = startPos;

  while (pos < html.length && depth > 0) {
    openPattern.lastIndex = pos;
    closePattern.lastIndex = pos;

    const openMatch = openPattern.exec(html);
    const closeMatch = closePattern.exec(html);

    if (!closeMatch) {
      // No more closing tags — can't find match
      return -1;
    }

    if (openMatch && openMatch.index < closeMatch.index) {
      // Found a nested opening tag first
      // Skip self-closing tags (e.g. <div />)
      if (!openMatch[0].endsWith("/>")) {
        depth++;
      }
      pos = openMatch.index + openMatch[0].length;
    } else {
      // Found a closing tag
      depth--;
      if (depth === 0) {
        return closeMatch.index;
      }
      pos = closeMatch.index + closeMatch[0].length;
    }
  }

  return -1;
}

// ---------------------------------------------------------------------------
// Step 1.5: Extract Main Column from Multi-Column Layouts
// ---------------------------------------------------------------------------

/**
 * Detect Divi (and similar builders') 2-column layouts and keep only
 * the wider "main" column, discarding the sidebar column.
 *
 * Divi column classes:
 * - et_pb_column_2_3 (main, 2/3 width)
 * - et_pb_column_1_3 (sidebar, 1/3 width)
 * - et_pb_column_3_4 / et_pb_column_1_4 variant
 *
 * Also detects generic sidebar class patterns.
 */
function extractMainColumn(html: string): string {
  // ---- Divi column detection ----
  // Look for rows that contain a 2/3 + 1/3 (or 3/4 + 1/4) column layout
  const mainColumnClasses = [
    "et_pb_column_2_3",
    "et_pb_column_3_4",
  ];
  const sidebarColumnClasses = [
    "et_pb_column_1_3",
    "et_pb_column_1_4",
  ];

  // Check if both a main and sidebar column class exist
  const hasMainCol = mainColumnClasses.some((cls) => html.includes(cls));
  const hasSidebarCol = sidebarColumnClasses.some((cls) => html.includes(cls));

  if (hasMainCol && hasSidebarCol) {
    // Strategy: find each sidebar column and remove it entirely,
    // keeping only the main column content
    let result = html;
    for (const sidebarCls of sidebarColumnClasses) {
      result = removeElementsByClass(result, sidebarCls);
    }
    return result;
  }

  // ---- Generic sidebar detection ----
  // Look for common sidebar class patterns alongside main content
  const genericSidebarPatterns = [
    /\bsidebar\b/i,
    /\bwidget-area\b/i,
    /\bsecondary-content\b/i,
    /\baside-content\b/i,
  ];

  // Check <aside> elements and sidebar-classed divs
  // Only remove if there's substantial main content alongside
  const hasAside = /<aside\b/i.test(html);
  const hasSidebarClass = genericSidebarPatterns.some((p) => p.test(html));

  if (hasAside) {
    // Remove <aside> elements using depth-tracking
    let result = html;
    let offset = 0;
    while (offset < result.length) {
      const asideMatch = /<aside\b[^>]*>/i.exec(result.slice(offset));
      if (!asideMatch) break;

      const absStart = offset + asideMatch.index;
      const innerStart = absStart + asideMatch[0].length;
      const closePos = findMatchingClose(result, "aside", innerStart);
      if (closePos === -1) {
        offset = innerStart;
        continue;
      }
      const closeTagEnd = closePos + "</aside>".length;
      result = result.slice(0, absStart) + result.slice(closeTagEnd);
      // Don't advance — check for more asides
    }
    return result;
  }

  if (hasSidebarClass) {
    let result = html;
    for (const pattern of ["sidebar", "widget-area"]) {
      result = removeElementsByClass(result, pattern);
    }
    // Only return modified if we actually removed something substantial
    if (result.length < html.length * 0.95) {
      return result;
    }
  }

  return html;
}

/**
 * Remove all elements (divs, sections, etc.) whose class attribute contains
 * the given class name. Uses depth-tracking for correct nesting.
 */
function removeElementsByClass(html: string, className: string): string {
  let result = html;
  let offset = 0;

  while (offset < result.length) {
    // Find next element with this class
    const pattern = new RegExp(
      `<(div|section|article|aside|nav)\\b([^>]*class=["'][^"']*${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["'][^>]*)>`,
      "i",
    );
    const match = pattern.exec(result.slice(offset));
    if (!match) break;

    const tag = match[1].toLowerCase();
    const absStart = offset + match.index;
    const innerStart = absStart + match[0].length;

    const closePos = findMatchingClose(result, tag, innerStart);
    if (closePos === -1) {
      offset = innerStart;
      continue;
    }
    const closeTagEnd = closePos + `</${tag}>`.length;
    result = result.slice(0, absStart) + result.slice(closeTagEnd);
    // Don't advance offset — check for more
  }

  return result;
}

// ---------------------------------------------------------------------------
// Step 3: Strip Non-Semantic Attributes
// ---------------------------------------------------------------------------

/**
 * Remove class, id, style, data-* attributes from non-semantic wrapper tags.
 * Preserves semantic attributes: href on <a>, src/alt on <img>, etc.
 */
function stripNonSemanticAttributes(html: string): string {
  // Strip attributes from div, section, article, aside, header, footer, main, nav, span
  let result = html.replace(
    /<(div|section|article|aside|header|footer|main|nav|span)(\s+[^>]*)>/gi,
    (_match, tag, attrs) => {
      // Remove class, id, style, data-* attributes
      const cleanedAttrs = attrs
        .replace(/\s*(?:class|id|style)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
        .replace(/\s*data-[a-z-]*\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
        .replace(/\s*role\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
        .replace(/\s*aria-[a-z-]*\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
        .trim();

      return cleanedAttrs ? `<${tag} ${cleanedAttrs}>` : `<${tag}>`;
    },
  );

  // Also strip builder-specific class attributes from semantic/content elements.
  // These were previously stripped early in stripShortcodes(); now we do it
  // after unwrapLayoutContainers() has had a chance to use them.
  result = result.replace(
    /<(p|h[1-6]|ul|ol|li|dl|dd|dt|blockquote|table|tr|td|th|figure|figcaption|a|img|strong|em)\b([^>]*)\s+class="[^"]*(?:elementor|et_pb_|vc_|fl-|fusion-|av-|cs-)[^"]*"([^>]*)>/gi,
    '<$1$2$3>',
  );

  return result;
}

// ---------------------------------------------------------------------------
// Step 4: Remove Empty Wrappers
// ---------------------------------------------------------------------------

/**
 * Remove empty wrapper elements left behind after unwrapping.
 */
function removeEmptyWrappers(html: string): string {
  let result = html;
  let prev = "";
  let iterations = 0;

  while (result !== prev && iterations < 10) {
    prev = result;
    // Remove empty block elements (with optional whitespace/&nbsp;)
    result = result.replace(
      /<(div|section|article|aside|header|footer|main|nav|span)\b[^>]*>(\s|&nbsp;)*<\/\1>/gi,
      "",
    );
    iterations++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 2. filterSecondaryContent
// ---------------------------------------------------------------------------

/**
 * Remove non-primary content blocks (sidebar widgets, contact forms, CTAs,
 * nav blocks, post listings, etc.).
 *
 * Groups HTML into top-level "content blocks" (heading + following content)
 * and evaluates each block against detection strategies. When a block is
 * detected as secondary, the ENTIRE block is removed (including heading).
 *
 * Template-specific behavior is supported via FilterOptions.
 */
export function filterSecondaryContent(
  html: string,
  options?: FilterOptions,
): FilterResult {
  if (!html || html.trim() === "") {
    return { html, removed: [] };
  }

  const opts = resolveFilterOptions(options);
  const blocks = groupContentBlocks(html);
  const removed: Array<{ reason: string; snippet: string }> = [];

  // Pre-filter pass: strip secondary h3-h6 sub-sections from ALL blocks
  // BEFORE block-level detection. This removes e.g. <h4>Recent Posts</h4>
  // or <h4>Contact Us</h4> sub-sections first, so the remaining block
  // content is evaluated cleanly by detectSecondaryBlock().
  for (const block of blocks) {
    const strippedResult = stripSecondarySubSections(block.fullHtml, opts);
    if (strippedResult.stripped.length > 0) {
      block.fullHtml = strippedResult.html;
      // Recalculate derived fields after stripping
      block.plainText = block.fullHtml
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      block.wordCount = block.plainText.split(/\s+/).filter(Boolean).length;
      removed.push(...strippedResult.stripped);
    }
  }

  const keptBlocks: string[] = [];

  for (const block of blocks) {
    const reason = detectSecondaryBlock(block, opts);
    if (reason) {
      const snippet = block.fullHtml
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
      removed.push({ reason, snippet });
    } else {
      keptBlocks.push(block.fullHtml);
    }
  }

  // Safety: never remove everything
  if (keptBlocks.length === 0 && blocks.length > 0) {
    return { html, removed: [] };
  }

  const filteredHtml = keptBlocks
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html: filteredHtml, removed };
}

// ---------------------------------------------------------------------------
// Content Block Grouping
// ---------------------------------------------------------------------------

interface ContentBlock {
  /** The full HTML of this block */
  fullHtml: string;
  /** The heading text (stripped of tags), or empty if no heading */
  headingText: string;
  /** The heading level (2-6), or 0 if no heading */
  headingLevel: number;
  /** Plain text content (tags stripped) */
  plainText: string;
  /** Word count of plain text */
  wordCount: number;
}

/**
 * Group HTML into content blocks. A content block is:
 * - An H2 heading + all following content until the next H2 heading
 *   (H3-H6 sub-headings stay within their parent H2 block)
 * - Or a standalone block element not preceded by any heading
 *
 * We split on H2 only because H2 marks major content sections.
 * H3-H6 are sub-content within those sections (e.g., FAQ questions,
 * sub-topics). This ensures entire sections like "Recent Posts" with
 * H3 children are treated as single blocks for filtering.
 */
function groupContentBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Find all H2 heading positions (only H2 — not H3-H6)
  const h2Regex = /<h2\b[^>]*>/gi;
  const h2Positions: number[] = [];
  let hMatch: RegExpExecArray | null;

  while ((hMatch = h2Regex.exec(html)) !== null) {
    h2Positions.push(hMatch.index);
  }

  if (h2Positions.length === 0) {
    // No H2 headings — treat entire content as one block
    const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    blocks.push({
      fullHtml: html,
      headingText: "",
      headingLevel: 0,
      plainText: plain,
      wordCount: plain.split(/\s+/).filter(Boolean).length,
    });
    return blocks;
  }

  // Content before first H2
  if (h2Positions[0] > 0) {
    const beforeHtml = html.slice(0, h2Positions[0]).trim();
    if (beforeHtml) {
      const plain = beforeHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      blocks.push({
        fullHtml: beforeHtml,
        headingText: "",
        headingLevel: 0,
        plainText: plain,
        wordCount: plain.split(/\s+/).filter(Boolean).length,
      });
    }
  }

  // Each H2 + all content until next H2
  for (let i = 0; i < h2Positions.length; i++) {
    const start = h2Positions[i];
    const end =
      i + 1 < h2Positions.length
        ? h2Positions[i + 1]
        : html.length;
    const blockHtml = html.slice(start, end).trim();

    if (!blockHtml) continue;

    // Extract the H2 heading text
    const headingMatch = blockHtml.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    const headingText = headingMatch
      ? headingMatch[1].replace(/<[^>]*>/g, "").trim()
      : "";

    const plain = blockHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    blocks.push({
      fullHtml: blockHtml,
      headingText,
      headingLevel: 2,
      plainText: plain,
      wordCount: plain.split(/\s+/).filter(Boolean).length,
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Secondary Block Detection
// ---------------------------------------------------------------------------

/**
 * Built-in heading patterns that indicate secondary/sidebar content.
 */
const SECONDARY_HEADING_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Contact / CTA blocks
  {
    pattern: /^(?:contact\s+us|contact\s+our|get\s+in\s+touch|reach\s+out)$/i,
    reason: "contact-widget",
  },
  {
    pattern: /^(?:free\s+consultation|call\s+(?:us\s+)?now|get\s+help|schedule\s+(?:a\s+)?(?:consultation|appointment)|book\s+a)$/i,
    reason: "cta-block",
  },

  // Blog / post listing widgets
  {
    pattern: /^(?:recent\s+posts?|latest\s+posts?|related\s+posts?|popular\s+posts?|more\s+articles?)$/i,
    reason: "post-listing-widget",
  },

  // Sidebar widgets
  {
    pattern: /^(?:categories|archives|tags?|tag\s+cloud)$/i,
    reason: "sidebar-widget",
  },
  {
    pattern: /^(?:about\s+the\s+author|author\s+bio)$/i,
    reason: "author-widget",
  },
  {
    pattern: /^(?:newsletter|subscribe|sign\s+up)$/i,
    reason: "newsletter-widget",
  },
  {
    pattern: /^(?:share\s+this|follow\s+us|social\s+media)$/i,
    reason: "social-widget",
  },

  // Comment sections
  {
    pattern: /^(?:leave\s+a\s+(?:reply|comment)|comments?|discussion)$/i,
    reason: "comments-section",
  },
];

/**
 * Resolve filter options, applying template-specific defaults.
 */
function resolveFilterOptions(options?: FilterOptions): Required<FilterOptions> {
  const templateType = options?.templateType ?? "";
  return {
    templateType,
    extraSecondaryHeadings: options?.extraSecondaryHeadings ?? [],
    extraDetectors: options?.extraDetectors ?? [],
    removeContactBlocks:
      options?.removeContactBlocks ??
      (templateType === "practice" ? true : false),
  };
}

/**
 * Detect if a content block is secondary content.
 * Returns the reason string if secondary, or null if it should be kept.
 */
function detectSecondaryBlock(
  block: ContentBlock,
  options: Required<FilterOptions>,
): string | null {
  // Safety: NEVER remove intro content (before first heading)
  if (block.headingLevel === 0 && block.wordCount > 10) {
    return null;
  }

  // Safety: NEVER remove a block starting with H2 followed by 50+ words of paragraph text
  if (block.headingLevel === 2 && block.wordCount >= 50) {
    // Check if there's actual paragraph content (not just links/forms)
    const afterHeading = block.fullHtml.replace(
      /<h2\b[^>]*>[\s\S]*?<\/h2>/i,
      "",
    );
    const hasParagraphs = /<p\b[^>]*>[\s\S]{20,}?<\/p>/i.test(afterHeading);
    if (hasParagraphs) {
      // Still check heading patterns — short paragraph + contact heading = secondary
      const matchedPattern = matchSecondaryHeading(
        block.headingText,
        options,
      );
      if (!matchedPattern) return null;
      // Even with a matching heading, if it has substantial paragraphs, keep it
      const paraContent = afterHeading
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (paraContent.length > 200) return null;
    }
  }

  // Safety: NEVER remove a block whose H2 heading ends with "?" (FAQ-like)
  if (block.headingText.endsWith("?") && block.wordCount > 15) {
    return null;
  }

  // Safety: NEVER remove blocks that contain FAQ-like H3 content
  // (H3 ending in ? followed by paragraph text)
  const h3FaqPattern = /<h3\b[^>]*>[^<]*\?<\/h3>\s*<p\b/i;
  if (h3FaqPattern.test(block.fullHtml) && block.wordCount > 30) {
    return null;
  }

  // ---- Detection Strategy 1: Heading pattern matching ----
  const headingReason = matchSecondaryHeading(block.headingText, options);

  // ---- Detection Strategy 2: Form detection ----
  if (isFormBlock(block.fullHtml)) {
    return "form-block";
  }

  // ---- Detection Strategy 3: Contact/location block ----
  if (options.removeContactBlocks && isContactLocationBlock(block)) {
    return "contact-location-block";
  }

  // ---- Detection Strategy 4: CTA block ----
  if (headingReason === "cta-block" && block.wordCount < 100) {
    const hasLinkOrPhone =
      /<a\b/i.test(block.fullHtml) ||
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(block.plainText);
    if (hasLinkOrPhone) return "cta-block";
  }

  // ---- Detection Strategy 5: High link-density blocks ----
  if (isHighLinkDensityBlock(block)) {
    return "high-link-density";
  }

  // ---- Detection Strategy 6: Blog/post listing ----
  if (isPostListingBlock(block.fullHtml)) {
    return "post-listing";
  }

  // ---- Apply heading reason (for non-CTA matches) ----
  if (headingReason && headingReason !== "cta-block") {
    // For widget headings, the block must be short enough to be a widget
    if (block.wordCount < 150) {
      return headingReason;
    }
  }

  // ---- Detection Strategy 6b: Check h3-h6 headings within the block ----
  // Sidebar content sometimes uses h3-h6 headings instead of h2.
  // If a block has NO h2 heading but contains h3-h6 headings matching
  // secondary patterns, and the block is short, treat it as secondary.
  if (block.headingLevel === 0 && block.wordCount < 150) {
    const subHeadingReason = matchSubHeadingsAsSecondary(block.fullHtml, options);
    if (subHeadingReason) {
      return subHeadingReason;
    }
  }

  // ---- Detection Strategy 7: Custom detectors ----
  for (const detector of options.extraDetectors) {
    const reason = detector(block.headingText, block.fullHtml);
    if (reason) return reason;
  }

  return null;
}

/**
 * Match a heading against known secondary heading patterns.
 */
function matchSecondaryHeading(
  heading: string,
  options: Required<FilterOptions>,
): string | null {
  if (!heading) return null;

  const trimmed = heading.trim();

  // Check built-in patterns
  for (const { pattern, reason } of SECONDARY_HEADING_PATTERNS) {
    if (pattern.test(trimmed)) return reason;
  }

  // Check extra patterns from options
  for (const pattern of options.extraSecondaryHeadings) {
    if (pattern.test(trimmed)) return "custom-secondary";
  }

  // Location heading heuristic: "In [City]" or "In [City] & [County]"
  // (short heading + address-like content)
  if (/^in\s+[A-Z][a-z]+(?:\s*(?:&|and)\s*[A-Z][a-z]+)?$/i.test(trimmed)) {
    return "location-heading";
  }

  return null;
}

/**
 * Check h3-h6 headings within a block for secondary content patterns.
 * Returns the reason string if any sub-heading matches, or null.
 */
function matchSubHeadingsAsSecondary(
  html: string,
  options: Required<FilterOptions>,
): string | null {
  const subHeadingRegex = /<h([3-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = subHeadingRegex.exec(html)) !== null) {
    const headingText = match[2].replace(/<[^>]*>/g, "").trim();
    const reason = matchSecondaryHeading(headingText, options);
    if (reason) return reason;
  }

  return null;
}

/**
 * Detect form blocks: contains <form>, or 2+ form elements.
 */
function isFormBlock(html: string): boolean {
  if (/<form\b/i.test(html)) return true;

  const formElements = [
    /<input\b/gi,
    /<textarea\b/gi,
    /<select\b/gi,
    /<button\b[^>]*type=["']submit["']/gi,
    /nf-form/gi,
    /wpcf7/gi,
    /wpforms/gi,
    /nf-form-cont/gi,
    /gform_wrapper/gi,
  ];

  let formElementCount = 0;
  for (const pattern of formElements) {
    const matches = html.match(pattern);
    if (matches) formElementCount += matches.length;
    if (formElementCount >= 2) return true;
  }

  return false;
}

/**
 * Detect contact/location blocks:
 * Must contain 2+ of: phone, email, address, vCard.
 * AND be short (< 100 words).
 */
function isContactLocationBlock(block: ContentBlock): boolean {
  if (block.wordCount > 100) return false;

  let signals = 0;

  // Phone pattern
  if (
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(block.plainText) ||
    /tel:/i.test(block.fullHtml)
  ) {
    signals++;
  }

  // Email link
  if (/mailto:/i.test(block.fullHtml)) {
    signals++;
  }

  // Physical address pattern (number + street + state abbreviation)
  if (
    /\d+\s+[A-Z][a-z]+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl)\b/i.test(
      block.plainText,
    ) ||
    /\b[A-Z]{2}\s+\d{5}\b/.test(block.plainText)
  ) {
    signals++;
  }

  // vCard download link
  if (/\.vcf/i.test(block.fullHtml) || /vcard/i.test(block.fullHtml)) {
    signals++;
  }

  return signals >= 2;
}

/**
 * Detect high link-density blocks:
 * Links make up >60% of text, >3 links, <50 words of non-link text.
 */
function isHighLinkDensityBlock(block: ContentBlock): boolean {
  if (block.wordCount < 5) return false;

  const linkMatches = block.fullHtml.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi);
  if (!linkMatches || linkMatches.length <= 3) return false;

  const linkText = linkMatches
    .map((l) => l.replace(/<[^>]*>/g, ""))
    .join(" ")
    .trim();
  const linkWords = linkText.split(/\s+/).filter(Boolean).length;
  const nonLinkWords = block.wordCount - linkWords;

  if (nonLinkWords >= 50) return false;
  if (linkWords / block.wordCount > 0.6) return true;

  return false;
}

/**
 * Detect blog/post listing blocks:
 * Contains <article> tags with post IDs, multiple <article> children,
 * or a <ul>/<ol> whose <li> items are primarily links (blog roll pattern).
 */
function isPostListingBlock(html: string): boolean {
  const articleMatches = html.match(/<article\b/gi);
  if (articleMatches && articleMatches.length >= 2) return true;

  // WordPress post listing with post IDs
  if (
    /<article\b[^>]*\bpost-\d+\b/i.test(html) &&
    /<article\b/gi.test(html)
  ) {
    return true;
  }

  // Link-list pattern: <ul> or <ol> with 3+ <li> items that are primarily links
  if (isLinkListPostListing(html)) return true;

  return false;
}

/**
 * Detect a <ul>/<ol> whose list items are primarily anchor links — the
 * classic "Recent Posts" / "Latest Posts" blog-roll widget pattern.
 *
 * Requires 3+ <li> items where ≥60% of each item's text lives inside <a>.
 */
function isLinkListPostListing(html: string): boolean {
  // Match <ul>…</ul> or <ol>…</ol> blocks
  const listPattern = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let listMatch: RegExpExecArray | null;

  while ((listMatch = listPattern.exec(html)) !== null) {
    const listBody = listMatch[2];
    // Extract individual <li> items
    const liPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    const items: string[] = [];
    let liMatch: RegExpExecArray | null;
    while ((liMatch = liPattern.exec(listBody)) !== null) {
      items.push(liMatch[1]);
    }

    if (items.length < 3) continue;

    // Check that most items are primarily links
    let linkDominatedCount = 0;
    for (const item of items) {
      const fullText = item.replace(/<[^>]*>/g, "").trim();
      if (!fullText) continue;
      const linkMatches = item.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi);
      if (!linkMatches) continue;
      const linkText = linkMatches
        .map((l) => l.replace(/<[^>]*>/g, ""))
        .join(" ")
        .trim();
      // Item is link-dominated if ≥60% of its text is inside <a> tags
      if (linkText.length / fullText.length >= 0.6) {
        linkDominatedCount++;
      }
    }

    if (linkDominatedCount >= 3) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Strip Secondary Sub-Sections from Kept Blocks
// ---------------------------------------------------------------------------

interface StripResult {
  html: string;
  stripped: Array<{ reason: string; snippet: string }>;
}

/**
 * Scan a kept content block for h3-h6 sub-headings that match secondary
 * patterns (e.g. "Recent Posts", "Contact Us"). When found, remove the
 * sub-heading and all content between it and the next heading (or end of
 * block), returning the cleaned block.
 *
 * Also detects link-list post listings immediately following a secondary
 * sub-heading.
 */
function stripSecondarySubSections(
  blockHtml: string,
  options: Required<FilterOptions>,
): StripResult {
  const stripped: Array<{ reason: string; snippet: string }> = [];

  // Find all h3-h6 headings in the block
  const subHeadingRegex = /<h([3-6])\b[^>]*>[\s\S]*?<\/h\1>/gi;
  const headings: Array<{ match: string; index: number; text: string; level: number }> = [];
  let m: RegExpExecArray | null;

  while ((m = subHeadingRegex.exec(blockHtml)) !== null) {
    const text = m[0].replace(/<[^>]*>/g, "").trim();
    headings.push({ match: m[0], index: m.index, text, level: parseInt(m[1], 10) });
  }

  if (headings.length === 0) return { html: blockHtml, stripped };

  // Collect ranges to remove (start index, end index)
  const rangesToRemove: Array<[number, number]> = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const reason = matchSecondaryHeading(heading.text, options);
    if (!reason) continue;

    // Determine the end of this sub-section: next heading of same or higher
    // level, or end of block
    const sectionStart = heading.index;
    let sectionEnd = blockHtml.length;

    // Look for the next heading (any level ≤ this heading's level)
    const nextHeadingPattern = new RegExp(
      `<h([1-${heading.level}])\\b[^>]*>`,
      "gi",
    );
    nextHeadingPattern.lastIndex = sectionStart + heading.match.length;
    const nextMatch = nextHeadingPattern.exec(blockHtml);
    if (nextMatch) {
      sectionEnd = nextMatch.index;
    } else {
      // Also check for the next heading at same or lower level from our list
      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].level <= heading.level) {
          sectionEnd = headings[j].index;
          break;
        }
      }
    }

    const snippet = blockHtml
      .slice(sectionStart, Math.min(sectionEnd, sectionStart + 150))
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

    stripped.push({ reason, snippet });
    rangesToRemove.push([sectionStart, sectionEnd]);
  }

  if (rangesToRemove.length === 0) return { html: blockHtml, stripped };

  // Remove ranges in reverse order to preserve indices
  let result = blockHtml;
  for (let i = rangesToRemove.length - 1; i >= 0; i--) {
    const [start, end] = rangesToRemove[i];
    result = result.slice(0, start) + result.slice(end);
  }

  // Clean up whitespace artifacts
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return { html: result, stripped };
}
