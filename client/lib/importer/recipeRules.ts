// ============================================================================
// Recipe Rules — Modular rule functions for recipe-based transformation
// ============================================================================
//
// Each rule function takes a MappedRecord + config and returns:
//   { value, confidence, log }
//
// Rules are executed by recipeEngine.ts in the order defined in the recipe.
// ============================================================================

import type { MappedRecord, FieldConfidence, RuleExecutionResult, RecipeRuleType } from "./recipeTypes";
import {
  cleanPracticeContentBody,
  detectFaqPatterns,
  extractSectionImages,
  removeFaqFromHtml,
  splitByParagraphGroups,
  splitOnH2,
} from "./preparer";
import { createPracticeAreaContentSection } from "@site/lib/cms/practiceAreaPageTypes";
import { slugify } from "./fieldMapping";

// ---------------------------------------------------------------------------
// Rule Registry
// ---------------------------------------------------------------------------

type RuleFn = (
  input: MappedRecord,
  config: Record<string, unknown>,
  context: RuleContext,
) => RuleExecutionResult;

export interface RuleContext {
  /** The rule ID for logging */
  ruleId: string;
  /** Target field name */
  targetField: string;
  /** Template type */
  templateType: string;
}

const ruleRegistry: Record<RecipeRuleType, RuleFn> = {
  direct_map: executeDirectMap,
  static_value: executeStaticValue,
  html_clean: executeHtmlClean,
  html_extract: executeHtmlExtract,
  h2_split: executeH2Split,
  faq_extract: executeFaqExtract,
  hero_extract: executeHeroExtract,
  slugify: executeSlugify,
  ai_transform: executeAITransform,
  concat: executeConcat,
  regex_replace: executeRegexReplace,
  ignore: executeIgnore,
};

/**
 * Execute a single recipe rule.
 */
export function executeRule(
  ruleType: RecipeRuleType,
  input: MappedRecord,
  config: Record<string, unknown>,
  context: RuleContext,
): RuleExecutionResult {
  const fn = ruleRegistry[ruleType];
  if (!fn) {
    return {
      value: undefined,
      confidence: {
        field: context.targetField,
        score: 0,
        category: "structural",
        reason: `Unknown rule type: ${ruleType}`,
      },
      log: {
        ruleId: context.ruleId,
        targetField: context.targetField,
        ruleType,
        aiUsed: false,
        confidence: 0,
        description: `Unknown rule type: ${ruleType}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
  return fn(input, config, context);
}

// ---------------------------------------------------------------------------
// Rule Implementations
// ---------------------------------------------------------------------------

/**
 * direct_map: Copy a mapped field value as-is.
 * Config: { sourceField: string }
 */
function executeDirectMap(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? ctx.targetField;
  const value = input[sourceField];
  const hasValue = value !== null && value !== undefined && String(value).trim() !== "";

  return {
    value: hasValue ? value : undefined,
    confidence: {
      field: ctx.targetField,
      score: hasValue ? 1.0 : 0.3,
      category: "structural",
      reason: hasValue ? "Direct mapping with value" : "Source field empty",
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "direct_map",
      aiUsed: false,
      confidence: hasValue ? 1.0 : 0.3,
      description: hasValue
        ? `Copied "${sourceField}" → "${ctx.targetField}"`
        : `Source field "${sourceField}" was empty`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * static_value: Set a hardcoded value.
 * Config: { value: unknown }
 */
function executeStaticValue(
  _input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const value = config.value;

  return {
    value,
    confidence: {
      field: ctx.targetField,
      score: 1.0,
      category: "structural",
      reason: "Static value applied",
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "static_value",
      aiUsed: false,
      confidence: 1.0,
      description: `Set static value for "${ctx.targetField}"`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * html_clean: Strip shortcodes, fix tags, whitelist elements.
 * Config: { allowedTags?: string[], stripShortcodes?: boolean, stripClasses?: boolean }
 */
function executeHtmlClean(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? ctx.targetField;
  const raw = input[sourceField];
  if (!raw || typeof raw !== "string") {
    return emptyResult(ctx, "html_clean", "No HTML content to clean");
  }

  let html = raw;
  const stripClasses = config.stripClasses !== false;
  const allowedTags = config.allowedTags as string[] | undefined;

  // Strip inline styles
  html = html.replace(/\s*style="[^"]*"/gi, "");

  // Strip CSS classes if configured
  if (stripClasses) {
    html = html.replace(/\s*class="[^"]*"/gi, "");
  }

  // Strip data attributes
  html = html.replace(/\s*data-[a-z-]*="[^"]*"/gi, "");

  // Strip empty tags (except br/hr/img)
  html = html.replace(/<(p|div|span|section|article)\b[^>]*>(\s|&nbsp;)*<\/\1>/gi, "");

  // If allowedTags is specified, remove non-allowed tags but keep their content
  if (allowedTags && allowedTags.length > 0) {
    const tagPattern = allowedTags.join("|");
    const stripRegex = new RegExp(
      `<\\/?((?!${tagPattern}|br|hr|img)[a-z][a-z0-9]*)\b[^>]*>`,
      "gi",
    );
    html = html.replace(stripRegex, "");
  }

  html = html.trim();

  const changed = html !== raw;
  return {
    value: html,
    confidence: {
      field: ctx.targetField,
      score: changed ? 0.85 : 1.0,
      category: "content_quality",
      reason: changed ? "HTML cleaned (styles/classes/empty tags removed)" : "HTML already clean",
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "html_clean",
      aiUsed: false,
      confidence: changed ? 0.85 : 1.0,
      description: changed ? "Cleaned HTML content" : "HTML was already clean",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * html_extract: Extract content via CSS-like pattern.
 * Config: { sourceField: string, pattern: string, group?: number }
 */
function executeHtmlExtract(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? "body";
  const pattern = config.pattern as string;
  const raw = input[sourceField];

  if (!raw || typeof raw !== "string" || !pattern) {
    return emptyResult(ctx, "html_extract", "No content or pattern for extraction");
  }

  try {
    const regex = new RegExp(pattern, "gi");
    const matches = raw.match(regex);
    const value = matches ? matches.join("") : "";

    return {
      value,
      confidence: {
        field: ctx.targetField,
        score: matches ? 0.8 : 0.3,
        category: "extraction",
        reason: matches
          ? `Extracted ${matches.length} match(es)`
          : "Pattern did not match any content",
      },
      log: {
        ruleId: ctx.ruleId,
        targetField: ctx.targetField,
        ruleType: "html_extract",
        aiUsed: false,
        confidence: matches ? 0.8 : 0.3,
        description: matches
          ? `Extracted ${matches.length} match(es) from "${sourceField}"`
          : `No matches for pattern in "${sourceField}"`,
        timestamp: new Date().toISOString(),
      },
    };
  } catch {
    return emptyResult(ctx, "html_extract", `Invalid regex pattern: ${pattern}`);
  }
}

/**
 * h2_split: Split body on H2 boundaries into content sections.
 * Config: { sourceField?: string, includeImages?: boolean }
 */
function executeH2Split(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? "body";
  const raw = input[sourceField] ?? input["contentSections.body"] ?? input["content"];
  const includeImages = config.includeImages !== false;

  if (!raw || typeof raw !== "string") {
    return emptyResult(ctx, "h2_split", "No body content to split");
  }

  const cleanedHtml = cleanPracticeContentBody(raw);
  const detectedFaq = detectFaqPatterns(cleanedHtml);
  const html = detectedFaq.length >= 2
    ? removeFaqFromHtml(cleanedHtml, detectedFaq)
    : cleanedHtml;
  const h2Sections = splitOnH2(html);

  // Paragraph grouping fallback when no H2s are found
  const usedFallback = h2Sections.length <= 1 && html.length > 500;
  const sections = usedFallback
    ? splitByParagraphGroups(html)
    : h2Sections;

  if (sections.length === 0) {
    return emptyResult(ctx, "h2_split", "Body was empty after splitting");
  }

  let contentSections = sections.map((body, idx) =>
    createPracticeAreaContentSection(idx, {
      body,
    }),
  );

  // Extract first image per section using shared helper
  if (includeImages) {
    contentSections = extractSectionImages(contentSections) as typeof contentSections;
  }

  const confidence = sections.length >= 2 ? 0.9 : 0.6;
  const method = usedFallback ? "paragraph grouping" : "H2 boundaries";

  return {
    value: contentSections,
    confidence: {
      field: ctx.targetField,
      score: confidence,
      category: "extraction",
      reason: `Split into ${sections.length} section(s) via ${method}`,
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "h2_split",
      aiUsed: false,
      confidence,
      description: `Split body into ${sections.length} section(s) via ${method}`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * faq_extract: Extract FAQ items from HTML patterns.
 * Config: { sourceField?: string }
 */
function executeFaqExtract(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? "body";
  const raw = input[sourceField] ?? input["content"];

  if (!raw || typeof raw !== "string") {
    return emptyResult(ctx, "faq_extract", "No content for FAQ extraction");
  }

  const items: Array<{ question: string; answer: string }> = [];

  // Pattern 1: <dl>/<dt>/<dd>
  const dlRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let dlMatch: RegExpExecArray | null;
  while ((dlMatch = dlRegex.exec(raw)) !== null) {
    const question = stripTags(dlMatch[1]).trim();
    const answer = dlMatch[2].trim();
    if (question && answer) items.push({ question, answer });
  }

  // Pattern 2: <h3>Question?</h3><p>Answer</p>
  if (items.length < 2) {
    items.length = 0;
    const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<h2|<\/section|<\/div|$)/gi;
    let h3Match: RegExpExecArray | null;
    while ((h3Match = h3Regex.exec(raw)) !== null) {
      const question = stripTags(h3Match[1]).trim();
      const answer = h3Match[2].trim();
      if (question && answer && question.endsWith("?")) {
        items.push({ question, answer });
      }
    }
  }

  // Pattern 3: <strong>Question?</strong> followed by paragraph
  if (items.length < 2) {
    items.length = 0;
    const strongRegex = /<(?:strong|b)[^>]*>([\s\S]*?\?)\s*<\/(?:strong|b)>\s*([\s\S]*?)(?=<(?:strong|b)|<h[2-6]|$)/gi;
    let strongMatch: RegExpExecArray | null;
    while ((strongMatch = strongRegex.exec(raw)) !== null) {
      const question = stripTags(strongMatch[1]).trim();
      const answer = strongMatch[2].trim();
      if (question && answer) items.push({ question, answer });
    }
  }

  const normalizedItems = items.map((item) => ({
    question: item.question,
    answer: ensureHtml(item.answer),
  }));

  const hasFaq = normalizedItems.length >= 2;

  return {
    value: normalizedItems,
    confidence: {
      field: ctx.targetField,
      score: hasFaq ? 0.85 : 0.3,
      category: "extraction",
      reason: hasFaq
        ? `Extracted ${normalizedItems.length} FAQ item(s)`
        : "No FAQ pattern detected",
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "faq_extract",
      aiUsed: false,
      confidence: hasFaq ? 0.85 : 0.3,
      description: hasFaq
        ? `Extracted ${normalizedItems.length} FAQ items`
        : "No FAQ patterns found in content",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * hero_extract: Extract hero image + description from body.
 * Config: { imageStrategy?: "first_image", descriptionStrategy?: "first_paragraph" }
 */
function executeHeroExtract(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? "body";
  const raw = input[sourceField] ?? input["content"];
  const imageStrategy = (config.imageStrategy as string) ?? "first_image";

  if (!raw || typeof raw !== "string") {
    return emptyResult(ctx, "hero_extract", "No content for hero extraction");
  }

  const hero: Record<string, unknown> = {};
  let confidence = 0.5;

  // Extract image from body (only if no featured_image is mapped)
  if (imageStrategy === "first_image" && !input["featured_image"] && !input["hero.backgroundImage"]) {
    const imgMatch = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      hero.backgroundImage = imgMatch[1];
      const altMatch = raw.match(/<img[^>]+alt=["']([^"']+)["']/i);
      hero.backgroundImageAlt = altMatch ? altMatch[1] : "";
      confidence += 0.2;
    }
  }

  // Do NOT auto-populate description or tagline from body
  // These should only come from explicit mapping

  // Section label from mapping
  if (input["hero.sectionLabel"]) {
    hero.sectionLabel = String(input["hero.sectionLabel"]);
    confidence += 0.1;
  }

  const extractedFields = Object.keys(hero).filter((k) => hero[k]);

  return {
    value: hero,
    confidence: {
      field: ctx.targetField,
      score: Math.min(confidence, 1.0),
      category: "extraction",
      reason: extractedFields.length > 0
        ? `Hero extracted: ${extractedFields.join(", ")}`
        : "No hero content extracted from body",
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "hero_extract",
      aiUsed: false,
      confidence: Math.min(confidence, 1.0),
      description: extractedFields.length > 0
        ? `Extracted hero image from body (${imageStrategy})`
        : "Hero extract: no content extracted",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * slugify: Generate URL slug from a field.
 * Config: { sourceField?: string, prefix?: string, suffix?: string }
 */
function executeSlugify(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? "title";
  const prefix = (config.prefix as string) ?? "";
  const suffix = (config.suffix as string) ?? "";
  const raw = input[sourceField];

  if (!raw || typeof raw !== "string") {
    return emptyResult(ctx, "slugify", `No value in "${sourceField}" to slugify`);
  }

  const slug = prefix + slugify(raw) + suffix;

  return {
    value: slug,
    confidence: {
      field: ctx.targetField,
      score: slug ? 1.0 : 0.3,
      category: "structural",
      reason: slug ? "Slug generated from title" : "Empty slug result",
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "slugify",
      aiUsed: false,
      confidence: slug ? 1.0 : 0.3,
      description: `Generated slug "${slug}" from "${sourceField}"`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * ai_transform: Placeholder for AI-powered transformation.
 * Actual AI call happens in recipeEngine via the server function.
 * Config: { action: AIAction, prompt?: string }
 */
function executeAITransform(
  _input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  // This is a placeholder — actual AI processing is handled by recipeEngine
  // which calls the server-side AI function and then sets the result.
  const action = config.action as string;

  return {
    value: undefined,
    confidence: {
      field: ctx.targetField,
      score: 0.5,
      category: "ai_ambiguity",
      reason: `AI transform pending (action: ${action})`,
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "ai_transform",
      aiUsed: true,
      confidence: 0.5,
      description: `AI transform queued (action: ${action})`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * concat: Combine multiple field values.
 * Config: { fields: string[], separator?: string, template?: string }
 */
function executeConcat(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const fields = (config.fields as string[]) ?? [];
  const separator = (config.separator as string) ?? " ";
  const template = config.template as string | undefined;

  if (template) {
    // Template mode: "{{title}} | {{site_name}}"
    let result = template;
    for (const field of fields) {
      const value = input[field] ?? "";
      result = result.replace(new RegExp(`\\{\\{${field}\\}\\}`, "g"), String(value));
    }
    return {
      value: result,
      confidence: {
        field: ctx.targetField,
        score: 0.9,
        category: "structural",
        reason: "Template-based concatenation",
      },
      log: {
        ruleId: ctx.ruleId,
        targetField: ctx.targetField,
        ruleType: "concat",
        aiUsed: false,
        confidence: 0.9,
        description: `Concatenated ${fields.length} field(s) using template`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const values = fields
    .map((f) => input[f])
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(String);

  const result = values.join(separator);
  const hasAll = values.length === fields.length;

  return {
    value: result,
    confidence: {
      field: ctx.targetField,
      score: hasAll ? 0.95 : 0.6,
      category: "structural",
      reason: `Concatenated ${values.length}/${fields.length} field(s)`,
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "concat",
      aiUsed: false,
      confidence: hasAll ? 0.95 : 0.6,
      description: `Concatenated ${values.length} of ${fields.length} field(s)`,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * regex_replace: Find/replace using regex.
 * Config: { sourceField?: string, pattern: string, replacement: string, flags?: string }
 */
function executeRegexReplace(
  input: MappedRecord,
  config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  const sourceField = (config.sourceField as string) ?? ctx.targetField;
  const pattern = config.pattern as string;
  const replacement = (config.replacement as string) ?? "";
  const flags = (config.flags as string) ?? "gi";
  const raw = input[sourceField];

  if (!raw || typeof raw !== "string" || !pattern) {
    return emptyResult(ctx, "regex_replace", "No content or pattern for regex replace");
  }

  try {
    const regex = new RegExp(pattern, flags);
    const result = raw.replace(regex, replacement);
    const changed = result !== raw;

    return {
      value: result,
      confidence: {
        field: ctx.targetField,
        score: 0.9,
        category: "content_quality",
        reason: changed ? "Regex replacement applied" : "Pattern did not match",
      },
      log: {
        ruleId: ctx.ruleId,
        targetField: ctx.targetField,
        ruleType: "regex_replace",
        aiUsed: false,
        confidence: 0.9,
        description: changed
          ? `Applied regex /${pattern}/${flags} on "${sourceField}"`
          : `Regex /${pattern}/${flags} did not match in "${sourceField}"`,
        timestamp: new Date().toISOString(),
      },
    };
  } catch {
    return emptyResult(ctx, "regex_replace", `Invalid regex: ${pattern}`);
  }
}

/**
 * ignore: Explicitly skip a field.
 */
function executeIgnore(
  _input: MappedRecord,
  _config: Record<string, unknown>,
  ctx: RuleContext,
): RuleExecutionResult {
  return {
    value: undefined,
    confidence: {
      field: ctx.targetField,
      score: 1.0,
      category: "structural",
      reason: "Field explicitly ignored",
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType: "ignore",
      aiUsed: false,
      confidence: 1.0,
      description: `Field "${ctx.targetField}" explicitly ignored`,
      timestamp: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResult(
  ctx: RuleContext,
  ruleType: RecipeRuleType,
  reason: string,
): RuleExecutionResult {
  return {
    value: undefined,
    confidence: {
      field: ctx.targetField,
      score: 0.2,
      category: "structural",
      reason,
    },
    log: {
      ruleId: ctx.ruleId,
      targetField: ctx.targetField,
      ruleType,
      aiUsed: false,
      confidence: 0.2,
      description: reason,
      timestamp: new Date().toISOString(),
    },
  };
}

function ensureHtml(text: string): string {
  if (!text || text.trim() === "") return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return `<p>${text}</p>`;
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
