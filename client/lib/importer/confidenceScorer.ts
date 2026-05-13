// ============================================================================
// Confidence Scorer — Multi-dimensional scoring for transformed records
// ============================================================================

import type {
  FieldConfidence,
  DimensionScore,
  RecordConfidence,
  ConfidenceCategory,
  TransformationLogEntry,
} from "./recipeTypes";
import type { TransformedPracticePage, TransformedBlogPost, TransformedRecord, TemplateType } from "./types";

// ---------------------------------------------------------------------------
// Weight Configuration
// ---------------------------------------------------------------------------

interface WeightConfig {
  structural: number;
  extraction: number;
  content_quality: number;
  validation: number;
  ai_ambiguity: number;
}

const DEFAULT_WEIGHTS: WeightConfig = {
  structural: 0.30,
  extraction: 0.25,
  content_quality: 0.25,
  validation: 0.15,
  ai_ambiguity: 0.05,
};

const AI_ACTIVE_WEIGHTS: WeightConfig = {
  structural: 0.25,
  extraction: 0.20,
  content_quality: 0.20,
  validation: 0.15,
  ai_ambiguity: 0.20,
};

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Score a single transformed record across 5 dimensions.
 */
export function scoreRecord(params: {
  record: TransformedRecord;
  templateType: TemplateType;
  fieldConfidences: FieldConfidence[];
  transformationLog: TransformationLogEntry[];
  hasAIRules: boolean;
}): RecordConfidence {
  const { record, templateType, fieldConfidences, transformationLog, hasAIRules } = params;
  const weights = hasAIRules ? AI_ACTIVE_WEIGHTS : DEFAULT_WEIGHTS;

  const structuralScore = scoreStructural(record, templateType, fieldConfidences);
  const extractionScore = scoreExtraction(record, templateType, fieldConfidences);
  const contentQualityScore = scoreContentQuality(record, templateType);
  const validationScore = scoreValidation(record, templateType);
  const aiAmbiguityScore = scoreAIAmbiguity(transformationLog, hasAIRules);

  const dimensions: DimensionScore[] = [
    { category: "structural", score: structuralScore.score, weight: weights.structural, details: structuralScore.details },
    { category: "extraction", score: extractionScore.score, weight: weights.extraction, details: extractionScore.details },
    { category: "content_quality", score: contentQualityScore.score, weight: weights.content_quality, details: contentQualityScore.details },
    { category: "validation", score: validationScore.score, weight: weights.validation, details: validationScore.details },
    { category: "ai_ambiguity", score: aiAmbiguityScore.score, weight: weights.ai_ambiguity, details: aiAmbiguityScore.details },
  ];

  const overall = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);

  const flags: string[] = [];
  if (contentQualityScore.flags) flags.push(...contentQualityScore.flags);
  if (structuralScore.flags) flags.push(...structuralScore.flags);
  if (extractionScore.flags) flags.push(...extractionScore.flags);

  return {
    overall: Math.round(overall * 100) / 100,
    dimensions,
    fieldScores: fieldConfidences,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Dimension Scorers
// ---------------------------------------------------------------------------

interface DimensionResult {
  score: number;
  details: string[];
  flags?: string[];
}

/**
 * Structural: Are required fields present? Correct shapes?
 */
function scoreStructural(
  record: TransformedRecord,
  templateType: TemplateType,
  fieldConfidences: FieldConfidence[],
): DimensionResult {
  const details: string[] = [];
  const flags: string[] = [];
  let score = 1.0;

  if (templateType === "practice") {
    const p = record as TransformedPracticePage;

    if (!p.title || p.title === "Untitled") {
      score -= 0.3;
      details.push("Missing or default title");
      flags.push("missing_title");
    }

    if (!p.url_path || p.url_path === "//") {
      score -= 0.3;
      details.push("Missing URL path");
      flags.push("missing_url_path");
    }

    const content = p.content as Record<string, unknown>;
    if (!content?.hero || typeof content.hero !== "object") {
      score -= 0.2;
      details.push("Missing hero section");
      flags.push("missing_hero");
    }

    const sections = content?.contentSections as unknown[];
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      score -= 0.1;
      details.push("No content sections");
      flags.push("empty_sections");
    }
  } else {
    const b = record as TransformedBlogPost;

    if (!b.title || b.title === "Untitled") {
      score -= 0.3;
      details.push("Missing or default title");
      flags.push("missing_title");
    }

    if (!b.slug) {
      score -= 0.3;
      details.push("Missing slug");
      flags.push("missing_slug");
    }
  }

  // Factor in field-level structural confidences
  const structuralFields = fieldConfidences.filter((f) => f.category === "structural");
  if (structuralFields.length > 0) {
    const avgFieldScore = structuralFields.reduce((s, f) => s + f.score, 0) / structuralFields.length;
    score = (score + avgFieldScore) / 2;
  }

  if (details.length === 0) details.push("All required fields present");

  return { score: Math.max(0, Math.min(1, score)), details, flags };
}

/**
 * Extraction: Did extraction rules produce meaningful output?
 */
function scoreExtraction(
  record: TransformedRecord,
  templateType: TemplateType,
  fieldConfidences: FieldConfidence[],
): DimensionResult {
  const details: string[] = [];
  const flags: string[] = [];
  let score = 0.8;

  if (templateType === "practice") {
    const p = record as TransformedPracticePage;
    const content = p.content as Record<string, unknown>;
    const sections = content?.contentSections as Array<Record<string, unknown>> | undefined;
    const faq = content?.faq as Record<string, unknown> | undefined;
    const hero = content?.hero as Record<string, unknown> | undefined;

    if (sections && sections.length >= 2) {
      score += 0.1;
      details.push(`${sections.length} content sections extracted`);
    } else if (sections && sections.length === 1) {
      details.push("Only 1 content section — body may not have H2 headings");
    } else {
      score -= 0.2;
      details.push("No content sections extracted");
      flags.push("no_extraction");
    }

    const faqItems = faq?.items as unknown[] | undefined;
    if (faqItems && faqItems.length >= 2) {
      score += 0.05;
      details.push(`${faqItems.length} FAQ items extracted`);
    }

    if (hero?.backgroundImage) {
      score += 0.05;
      details.push("Hero image extracted");
    }

    if (hero?.description && String(hero.description).length > 20) {
      details.push("Hero description extracted");
    }
  } else {
    const b = record as TransformedBlogPost;

    if (b.body && b.body.length > 100) {
      details.push("Body content present");
    } else {
      score -= 0.2;
      details.push("Body content is short or missing");
      flags.push("short_body");
    }

    if (b.excerpt) {
      details.push("Excerpt present");
    }
  }

  // Factor in extraction field confidences
  const extractionFields = fieldConfidences.filter((f) => f.category === "extraction");
  if (extractionFields.length > 0) {
    const avgFieldScore = extractionFields.reduce((s, f) => s + f.score, 0) / extractionFields.length;
    score = (score + avgFieldScore) / 2;
  }

  return { score: Math.max(0, Math.min(1, score)), details, flags };
}

/**
 * Content Quality: Is the content meaningful? No garbage?
 */
function scoreContentQuality(
  record: TransformedRecord,
  templateType: TemplateType,
): DimensionResult {
  const details: string[] = [];
  const flags: string[] = [];
  let score = 0.9;

  const title = (record as unknown as Record<string, unknown>).title as string | undefined;

  // Title quality
  if (title) {
    const titleLen = title.length;
    if (titleLen < 5) {
      score -= 0.15;
      details.push("Title too short (<5 chars)");
      flags.push("short_title");
    } else if (titleLen > 100) {
      score -= 0.05;
      details.push("Title very long (>100 chars)");
    } else if (titleLen >= 10 && titleLen <= 80) {
      details.push("Title length is good");
    }
  }

  // Check for shortcode remnants in any string field
  const allText = JSON.stringify(record);
  if (/\[(et_pb_|vc_|fusion_)/i.test(allText)) {
    score -= 0.3;
    details.push("Shortcode remnants detected");
    flags.push("shortcode_remnants");
  }

  // Check for excessive HTML entities
  const entityCount = (allText.match(/&[a-z]+;|&#\d+;/gi) ?? []).length;
  if (entityCount > 50) {
    score -= 0.1;
    details.push("Excessive HTML entities detected");
    flags.push("encoding_issues");
  }

  if (templateType === "practice") {
    const p = record as TransformedPracticePage;
    const content = p.content as Record<string, unknown>;
    const sections = content?.contentSections as Array<Record<string, unknown>> | undefined;

    if (sections) {
      const emptyBodySections = sections.filter(
        (s) => !s.body || String(s.body).replace(/<[^>]*>/g, "").trim().length < 20,
      );
      if (emptyBodySections.length > 0) {
        score -= 0.1 * Math.min(emptyBodySections.length, 3);
        details.push(`${emptyBodySections.length} section(s) with very short/empty body`);
        flags.push("empty_section_bodies");
      }
    }
  } else {
    const b = record as TransformedBlogPost;
    if (b.body) {
      const plainText = b.body.replace(/<[^>]*>/g, "").trim();
      if (plainText.length < 100) {
        score -= 0.15;
        details.push("Body content very short (<100 chars)");
        flags.push("short_body");
      } else if (plainText.length > 200) {
        details.push("Body content length adequate");
      }
    }
  }

  if (details.length === 0) details.push("Content quality checks passed");

  return { score: Math.max(0, Math.min(1, score)), details, flags };
}

/**
 * Validation: Format checks, slug validity, no duplicates (within-record).
 */
function scoreValidation(
  record: TransformedRecord,
  templateType: TemplateType,
): DimensionResult {
  const details: string[] = [];
  let score = 1.0;

  if (templateType === "practice") {
    const p = record as TransformedPracticePage;

    // Slug format check
    if (p.url_path) {
      const slug = p.url_path.replace(/^\/+|\/+$/g, "");
      if (slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
        score -= 0.3;
        details.push("Invalid slug format");
      } else {
        details.push("Slug format valid");
      }
    }

    // URL format check
    const content = p.content as Record<string, unknown>;
    const hero = content?.hero as Record<string, unknown>;
    if (hero?.backgroundImage) {
      const imgUrl = String(hero.backgroundImage);
      if (imgUrl && !isValidImageUrl(imgUrl)) {
        score -= 0.1;
        details.push("Hero image URL may be invalid");
      }
    }
  } else {
    const b = record as TransformedBlogPost;

    if (b.slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(b.slug)) {
      score -= 0.3;
      details.push("Invalid slug format");
    } else if (b.slug) {
      details.push("Slug format valid");
    }

    if (b.featured_image && !isValidImageUrl(b.featured_image)) {
      score -= 0.1;
      details.push("Featured image URL may be invalid");
    }
  }

  if (details.length === 0) details.push("All validation checks passed");

  return { score: Math.max(0, Math.min(1, score)), details };
}

/**
 * AI Ambiguity: Confidence in AI-generated outputs.
 */
function scoreAIAmbiguity(
  transformationLog: TransformationLogEntry[],
  hasAIRules: boolean,
): DimensionResult {
  if (!hasAIRules) {
    return {
      score: 1.0,
      details: ["No AI rules used — deterministic processing"],
    };
  }

  const aiEntries = transformationLog.filter((e) => e.aiUsed);
  if (aiEntries.length === 0) {
    return {
      score: 1.0,
      details: ["No AI transformations applied"],
    };
  }

  const avgConfidence = aiEntries.reduce((s, e) => s + e.confidence, 0) / aiEntries.length;
  const lowConfidenceCount = aiEntries.filter((e) => e.confidence < 0.5).length;

  const details: string[] = [];
  details.push(`${aiEntries.length} AI transformation(s), avg confidence: ${(avgConfidence * 100).toFixed(0)}%`);
  if (lowConfidenceCount > 0) {
    details.push(`${lowConfidenceCount} low-confidence AI result(s)`);
  }

  return {
    score: Math.max(0, Math.min(1, avgConfidence)),
    details,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidImageUrl(url: string): boolean {
  if (url.startsWith("/")) return true; // relative URL is fine
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Determine the confidence level label for UI display.
 */
export function getConfidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

/**
 * Get a color class for confidence indicator dots.
 */
export function getConfidenceColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.5) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Get text color class for confidence.
 */
export function getConfidenceTextColor(score: number): string {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.5) return "text-yellow-600";
  return "text-red-600";
}
