// ============================================================================
// Recipe Inference — 3-tier hybrid inference engine
// ============================================================================
//
// Tier 1: Deterministic Diff — field-by-field comparison
// Tier 2: Pattern Detection — structural analysis
// Tier 3: AI Assistance — optional, for ambiguous cases
// ============================================================================

import type {
  MappedRecord,
  RecipeInferenceInput,
  RecipeInferenceResult,
  RecipeRule,
  RecipeRuleType,
  RuleInferenceSource,
} from "./recipeTypes";
import type {
  TransformedRecord,
  TransformedPracticePage,
  TransformedBlogPost,
} from "./types";
import { slugify } from "./fieldMapping";

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Infer a recipe from a sample source record and the user's corrected output.
 * Uses a 3-tier approach: diff → patterns → optional AI.
 */
export async function inferRecipe(
  params: RecipeInferenceInput,
): Promise<RecipeInferenceResult> {
  const { mappedSample, correctedOutput, sourceColumns, templateType, aiAvailable } = params;

  const rules: RecipeRule[] = [];
  const ambiguousFields: string[] = [];
  let ruleIdCounter = 1;

  function nextId(): string {
    return `rule_${ruleIdCounter++}`;
  }

  // -------------------------------------------------------------------------
  // Tier 1: Deterministic Diff
  // -------------------------------------------------------------------------
  const tier1Result = inferFromDiff(mappedSample, correctedOutput, templateType, nextId);
  rules.push(...tier1Result.rules);
  ambiguousFields.push(...tier1Result.ambiguous);

  // -------------------------------------------------------------------------
  // Tier 2: Pattern Detection
  // -------------------------------------------------------------------------
  const tier2Result = inferFromPatterns(mappedSample, correctedOutput, templateType, nextId);

  // Merge tier 2 rules — skip if tier 1 already covered the field
  const coveredFields = new Set(rules.map((r) => r.targetField));
  for (const rule of tier2Result.rules) {
    if (!coveredFields.has(rule.targetField)) {
      rules.push(rule);
      coveredFields.add(rule.targetField);
    }
  }

  // Remove from ambiguous list fields that were resolved by pattern detection
  const resolvedByPattern = new Set(tier2Result.rules.map((r) => r.targetField));
  const remainingAmbiguous = ambiguousFields.filter((f) => !resolvedByPattern.has(f));

  // -------------------------------------------------------------------------
  // Tier 3: AI Assistance (optional, only for remaining ambiguous fields)
  // -------------------------------------------------------------------------
  if (aiAvailable && remainingAmbiguous.length > 0) {
    // AI inference is called by the UI layer via the server function.
    // Here we mark the fields as ambiguous and let the caller handle AI.
    // This keeps the inference engine synchronous and testable.
  }

  // Calculate overall confidence
  const totalRules = rules.length;
  const highConfRules = rules.filter((r) => r.inferredFrom === "diff").length;
  const medConfRules = rules.filter((r) => r.inferredFrom === "pattern").length;
  const confidence =
    totalRules > 0
      ? (highConfRules * 1.0 + medConfRules * 0.8) / totalRules
      : 0;

  return {
    rules,
    confidence: Math.round(confidence * 100) / 100,
    ambiguousFields: remainingAmbiguous,
  };
}

// ---------------------------------------------------------------------------
// Tier 1: Deterministic Diff
// ---------------------------------------------------------------------------

interface DiffResult {
  rules: RecipeRule[];
  ambiguous: string[];
}

function inferFromDiff(
  mapped: MappedRecord,
  output: TransformedRecord,
  templateType: string,
  nextId: () => string,
): DiffResult {
  const rules: RecipeRule[] = [];
  const ambiguous: string[] = [];

  // Flatten the output record for comparison
  const flatOutput = flattenRecord(output, templateType);
  const flatMapped = mapped;

  for (const [outputKey, outputValue] of Object.entries(flatOutput)) {
    // Skip complex nested objects (handled by pattern detection)
    if (typeof outputValue === "object" && outputValue !== null && !Array.isArray(outputValue)) {
      continue;
    }
    if (Array.isArray(outputValue)) {
      continue;
    }

    if (outputValue === null || outputValue === undefined) continue;

    const outputStr = String(outputValue);
    if (outputStr.trim() === "") continue;

    // Check 1: Direct mapping — exact match with any mapped field
    let directMatch: string | null = null;
    for (const [mappedKey, mappedValue] of Object.entries(flatMapped)) {
      if (mappedValue !== null && mappedValue !== undefined && String(mappedValue) === outputStr) {
        directMatch = mappedKey;
        break;
      }
    }

    if (directMatch) {
      rules.push({
        id: nextId(),
        targetField: outputKey,
        ruleType: "direct_map",
        config: { sourceField: directMatch },
        enabled: true,
        inferredFrom: "diff",
        description: `Copy "${directMatch}" directly`,
      });
      continue;
    }

    // Check 2: Slugification — output is slugified version of a source field
    for (const [mappedKey, mappedValue] of Object.entries(flatMapped)) {
      if (mappedValue && typeof mappedValue === "string") {
        const slugified = slugify(mappedValue);
        if (slugified && outputStr === slugified) {
          rules.push({
            id: nextId(),
            targetField: outputKey,
            ruleType: "slugify",
            config: { sourceField: mappedKey },
            enabled: true,
            inferredFrom: "diff",
            description: `Slugify "${mappedKey}"`,
          });
          directMatch = mappedKey; // mark as resolved
          break;
        }

        // Also check generated URL path (e.g., /slug/)
        if (outputStr === `/${slugified}/`) {
          rules.push({
            id: nextId(),
            targetField: outputKey,
            ruleType: "slugify",
            config: { sourceField: mappedKey, prefix: "/", suffix: "/" },
            enabled: true,
            inferredFrom: "diff",
            description: `Generate URL path from "${mappedKey}"`,
          });
          directMatch = mappedKey;
          break;
        }
      }
    }
    if (directMatch) continue;

    // Check 3: Static value — output has no correlation to any source field
    const hasAnyCorrelation = Object.values(flatMapped).some((v) => {
      if (!v || !outputStr) return false;
      const vs = String(v);
      return (
        vs.length > 3 &&
        outputStr.length > 3 &&
        (outputStr.includes(vs) || vs.includes(outputStr))
      );
    });

    if (!hasAnyCorrelation && outputStr.length < 200) {
      rules.push({
        id: nextId(),
        targetField: outputKey,
        ruleType: "static_value",
        config: { value: outputValue },
        enabled: true,
        inferredFrom: "diff",
        description: `Static value: "${truncate(outputStr, 50)}"`,
      });
      continue;
    }

    // Check 4: Concatenation — output contains substrings from multiple fields
    const containedFields: string[] = [];
    for (const [mappedKey, mappedValue] of Object.entries(flatMapped)) {
      if (mappedValue && typeof mappedValue === "string" && mappedValue.length > 3) {
        if (outputStr.includes(mappedValue)) {
          containedFields.push(mappedKey);
        }
      }
    }

    if (containedFields.length >= 2) {
      rules.push({
        id: nextId(),
        targetField: outputKey,
        ruleType: "concat",
        config: { fields: containedFields, separator: " " },
        enabled: true,
        inferredFrom: "diff",
        description: `Concatenate: ${containedFields.join(" + ")}`,
      });
      continue;
    }

    // Check 5: HTML cleaning — output has fewer tags but same text
    for (const [mappedKey, mappedValue] of Object.entries(flatMapped)) {
      if (mappedValue && typeof mappedValue === "string") {
        const inputPlain = stripTags(mappedValue).trim();
        const outputPlain = stripTags(outputStr).trim();
        if (
          inputPlain.length > 20 &&
          outputPlain.length > 20 &&
          similarity(inputPlain, outputPlain) > 0.9 &&
          countTags(String(mappedValue)) > countTags(outputStr)
        ) {
          rules.push({
            id: nextId(),
            targetField: outputKey,
            ruleType: "html_clean",
            config: { sourceField: mappedKey },
            enabled: true,
            inferredFrom: "diff",
            description: `Clean HTML from "${mappedKey}"`,
          });
          directMatch = mappedKey;
          break;
        }
      }
    }
    if (directMatch) continue;

    // If we get here, the transformation is ambiguous
    ambiguous.push(outputKey);
  }

  return { rules, ambiguous };
}

// ---------------------------------------------------------------------------
// Tier 2: Pattern Detection
// ---------------------------------------------------------------------------

function inferFromPatterns(
  mapped: MappedRecord,
  output: TransformedRecord,
  templateType: string,
  nextId: () => string,
): { rules: RecipeRule[] } {
  const rules: RecipeRule[] = [];

  if (templateType === "practice") {
    const p = output as TransformedPracticePage;
    const content = p.content as Record<string, unknown>;
    const sections = content?.contentSections as Array<Record<string, unknown>> | undefined;
    const faq = content?.faq as Record<string, unknown> | undefined;
    const hero = content?.hero as Record<string, unknown> | undefined;

    // Detect body field from source mapped data
    const bodyFieldKey = findBodyFieldKey(mapped);
    const bodyField = mapped[bodyFieldKey];
    const bodyStr = bodyField && typeof bodyField === "string" ? bodyField : "";

    // Detect structural features in source body
    const hasH2 = /<h2[\s>]/i.test(bodyStr);
    const hasImages = /<img[^>]+src=/i.test(bodyStr);
    const hasFaqPatterns = detectFaqInSource(bodyStr);
    const isLongContent = bodyStr.length > 500;

    // Pattern: body → content sections via H2 split (or paragraph grouping)
    if (bodyStr) {
      if (hasH2) {
        // H2-based split
        rules.push({
          id: nextId(),
          targetField: "contentSections",
          ruleType: "h2_split",
          config: {
            sourceField: bodyFieldKey,
            includeImages: hasImages,
          },
          enabled: true,
          inferredFrom: "pattern",
          description: "Split body on H2 headings into sections",
        });
      } else if (isLongContent) {
        // No H2 but long content → paragraph grouping fallback
        rules.push({
          id: nextId(),
          targetField: "contentSections",
          ruleType: "h2_split",
          config: {
            sourceField: bodyFieldKey,
            includeImages: hasImages,
            fallbackMode: "paragraph_groups",
          },
          enabled: true,
          inferredFrom: "pattern",
          description: "Split long body into sections via paragraph grouping",
        });
      }
    }

    // Pattern: FAQ extraction — detect from source body
    if (hasFaqPatterns && bodyStr) {
      rules.push({
        id: nextId(),
        targetField: "faq",
        ruleType: "faq_extract",
        config: { sourceField: bodyFieldKey },
        enabled: true,
        inferredFrom: "pattern",
        description: "Extract FAQ items from body content",
      });
    } else {
      // Also check if the corrected output has FAQ items (user added them)
      const faqItems = faq?.items as unknown[] | undefined;
      if (faqItems && faqItems.length >= 2 && bodyStr) {
        rules.push({
          id: nextId(),
          targetField: "faq",
          ruleType: "faq_extract",
          config: { sourceField: bodyFieldKey },
          enabled: true,
          inferredFrom: "pattern",
          description: `Extract ${faqItems.length} FAQ items from body content`,
        });
      }
    }

    // Pattern: Hero extraction — only for image, not for description/tagline
    if (hero) {
      const heroHasExtractedImage =
        hero.backgroundImage &&
        !mapped["hero.backgroundImage"] &&
        !mapped["featured_image"];

      if (heroHasExtractedImage) {
        rules.push({
          id: nextId(),
          targetField: "hero",
          ruleType: "hero_extract",
          config: {
            sourceField: bodyFieldKey,
            imageStrategy: "first_image",
          },
          enabled: true,
          inferredFrom: "pattern",
          description: "Extract hero image from body",
        });
      }
    }
  }

  // Template-agnostic patterns

  // Pattern: meta_title similar to but not identical to title
  const outputTitle = (output as unknown as Record<string, unknown>).title as string | undefined;
  const metaTitle = (output as unknown as Record<string, unknown>).meta_title as string | undefined;
  if (metaTitle && outputTitle && metaTitle !== outputTitle && metaTitle.includes(outputTitle)) {
    const suffix = metaTitle.replace(outputTitle, "").trim();
    if (suffix) {
      rules.push({
        id: nextId(),
        targetField: "meta_title",
        ruleType: "concat",
        config: {
          fields: ["title"],
          template: `{{title}}${suffix}`,
        },
        enabled: true,
        inferredFrom: "pattern",
        description: `Generate meta title: title + "${suffix}"`,
      });
    }
  }

  return { rules };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flattenRecord(
  record: TransformedRecord,
  templateType: string,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  if (templateType === "practice") {
    const p = record as TransformedPracticePage;
    flat["title"] = p.title;
    flat["url_path"] = p.url_path;
    flat["meta_title"] = p.meta_title;
    flat["meta_description"] = p.meta_description;
    flat["canonical_url"] = p.canonical_url;
    flat["og_title"] = p.og_title;
    flat["og_description"] = p.og_description;
    flat["og_image"] = p.og_image;
    flat["noindex"] = p.noindex;
    flat["published_at"] = p.published_at;

    const content = p.content as Record<string, unknown>;
    const hero = content?.hero as Record<string, unknown>;
    if (hero) {
      flat["hero.sectionLabel"] = hero.sectionLabel;
      flat["hero.tagline"] = hero.tagline;
      flat["hero.description"] = hero.description;
      flat["hero.backgroundImage"] = hero.backgroundImage;
      flat["hero.backgroundImageAlt"] = hero.backgroundImageAlt;
    }
  } else {
    const b = record as TransformedBlogPost;
    flat["title"] = b.title;
    flat["slug"] = b.slug;
    flat["excerpt"] = b.excerpt;
    flat["featured_image"] = b.featured_image;
    flat["category"] = b.category;
    flat["body"] = b.body;
    flat["meta_title"] = b.meta_title;
    flat["meta_description"] = b.meta_description;
    flat["canonical_url"] = b.canonical_url;
    flat["og_title"] = b.og_title;
    flat["og_description"] = b.og_description;
    flat["og_image"] = b.og_image;
    flat["noindex"] = b.noindex;
    flat["published_at"] = b.published_at;
  }

  return flat;
}

function findBodyFieldKey(mapped: MappedRecord): string {
  if (mapped["body"]) return "body";
  if (mapped["content"]) return "content";
  if (mapped["contentSections.body"]) return "contentSections.body";
  return "body";
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function countTags(html: string): number {
  return (html.match(/<[^>]+>/g) ?? []).length;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "\u2026";
}

/**
 * Quick check if body HTML contains FAQ-like patterns.
 * Checks for dt/dd, h3 with question marks, or strong/b with question marks.
 */
function detectFaqInSource(html: string): boolean {
  if (!html) return false;

  // Check for <dt>/<dd> pairs
  const dtCount = (html.match(/<dt[^>]*>/gi) ?? []).length;
  if (dtCount >= 2) return true;

  // Check for h3 elements ending with ?
  const h3s = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) ?? [];
  const questionH3s = h3s.filter((h) => {
    const text = h.replace(/<[^>]*>/g, "").trim();
    return text.endsWith("?");
  });
  if (questionH3s.length >= 2) return true;

  // Check for strong/b elements with question marks
  const strongs = html.match(/<(?:strong|b)[^>]*>([\s\S]*?\?)[\s]*<\/(?:strong|b)>/gi) ?? [];
  if (strongs.length >= 2) return true;

  return false;
}

/**
 * Quick similarity check between two strings (Jaccard-like on words).
 */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
