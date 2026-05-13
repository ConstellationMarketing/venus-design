import type {
  FieldMappingEntry,
  MappingConfig,
  TemplateType,
} from "./types";
import { getFieldsForTemplate } from "./templateFields";

/**
 * Normalize a string for fuzzy matching:
 * lowercase, strip underscores/hyphens/spaces, collapse whitespace.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+/g, "")
    .trim();
}

/**
 * Common aliases for CMS field keys.
 * Maps normalized alias → template field key.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  title: [
    "title", "pagetitle", "name", "heading", "h1",
    // WordPress API
    "titlerendered", "title.rendered",
    // Common CSV
    "posttitle", "post_title",
    // Firecrawl
    "metadata.title", "metadatatitle",
  ],
  "url_slug": [
    "slug", "urlslug", "url", "path", "urlpath", "permalink",
    // WordPress API
    "link",
    // Common CSV
    "postname", "post_name",
  ],
  slug: [
    "slug", "urlslug", "postslug", "permalink",
    // Common CSV
    "postname", "post_name",
  ],
  "meta_title": ["metatitle", "seotitle", "titletag"],
  "meta_description": [
    "metadescription", "seodescription", "metadesc", "description",
    // Firecrawl
    "metadata.description", "metadatadescription",
  ],
  "hero.tagline": ["tagline", "herotagline", "headline", "heroheadline"],
  "hero.description": [
    "herodescription", "herointro", "herobody", "intro", "introduction",
  ],
  "hero.backgroundImage": [
    "heroimage", "herobackground", "backgroundimage", "heroimg", "bannerimage",
  ],
  "hero.backgroundImageAlt": ["heroimagealt", "backgroundimagealt"],
  body: [
    "body", "content", "articlecontent", "postbody", "html", "article",
    // WordPress API
    "contentrendered", "content.rendered",
    // Common CSV
    "postcontent", "post_content",
    // Firecrawl
    "markdown",
  ],
  excerpt: [
    "excerpt", "summary", "shortdescription", "teaser",
    // WordPress API
    "excerptrendered", "excerpt.rendered",
    // Common CSV
    "postexcerpt", "post_excerpt",
  ],
  category: ["category", "categoryname", "cat", "topic"],
  featured_image: [
    "featuredimage", "image", "thumbnail", "thumbimage",
    "postimage", "coverimage",
    // Firecrawl
    "metadata.ogimage", "ogimage",
  ],
  "faq.heading": ["faqheading", "faqtitle"],
  "faq.description": ["faqdescription", "faqintro"],
  "og_image": ["ogimage", "socialmediaimage", "shareimage"],
  "og_title": ["ogtitle", "socialtitle"],
  "og_description": ["ogdescription", "socialdescription"],
  "canonical_url": ["canonicalurl", "canonical"],
  published_at: [
    "publishedat",
    "published_at",
    "publishdate",
    "publish_date",
    "published",
    "postdate",
    "post_date",
    "date",
  ],
};

/**
 * Build a reverse lookup: normalized alias → field key.
 */
function buildAliasLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [fieldKey, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      lookup.set(alias, fieldKey);
    }
  }
  return lookup;
}

const aliasLookup = buildAliasLookup();

/**
 * Try to match a source column name to a template field key.
 * Returns the matched field key or null.
 */
function matchColumn(
  sourceColumn: string,
  availableKeys: Set<string>,
): string | null {
  const norm = normalize(sourceColumn);

  // 1. Exact match on normalized field key
  for (const key of availableKeys) {
    if (normalize(key) === norm) return key;
  }

  // 2. Alias lookup
  const aliasMatch = aliasLookup.get(norm);
  if (aliasMatch && availableKeys.has(aliasMatch)) return aliasMatch;

  // 3. Partial match — source column contains or is contained by field key
  for (const key of availableKeys) {
    const normKey = normalize(key);
    if (normKey.includes(norm) || norm.includes(normKey)) {
      return key;
    }
  }

  return null;
}

/**
 * Auto-suggest field mappings based on source column names.
 * Returns a MappingConfig with best-effort mappings.
 */
export function autoMapFields(
  sourceColumns: string[],
  templateType: TemplateType,
): MappingConfig {
  const fields = getFieldsForTemplate(templateType);
  const availableKeys = new Set(
    fields.filter((f) => !f.repeaterParent).map((f) => f.key),
  );
  const mappings: FieldMappingEntry[] = [];
  const usedTargets = new Set<string>();

  for (const col of sourceColumns) {
    const matchedKey = matchColumn(col, availableKeys);
    if (matchedKey && !usedTargets.has(matchedKey)) {
      mappings.push({
        targetField: matchedKey,
        sourceColumn: col,
        transform: "none",
      });
      usedTargets.add(matchedKey);
    }
  }

  return { mappings };
}

/**
 * Get suggestions for a single source column (for manual mapping UI).
 * Returns ranked list of possible field keys.
 */
export function getSuggestionsForColumn(
  sourceColumn: string,
  templateType: TemplateType,
  usedTargets: Set<string>,
): string[] {
  const fields = getFieldsForTemplate(templateType);
  const norm = normalize(sourceColumn);
  const suggestions: { key: string; score: number }[] = [];

  for (const field of fields) {
    if (field.repeaterParent) continue;
    if (usedTargets.has(field.key)) continue;

    const normKey = normalize(field.key);
    const normLabel = normalize(field.label);

    let score = 0;

    // Exact match
    if (normKey === norm || normLabel === norm) {
      score = 100;
    }
    // Alias match
    else if (aliasLookup.get(norm) === field.key) {
      score = 90;
    }
    // Contains match
    else if (normKey.includes(norm) || norm.includes(normKey)) {
      score = 60;
    } else if (normLabel.includes(norm) || norm.includes(normLabel)) {
      score = 50;
    }

    if (score > 0) {
      suggestions.push({ key: field.key, score });
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .map((s) => s.key);
}
