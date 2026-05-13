/**
 * JSON-LD Schema.org structured data helpers.
 *
 * Builds schema objects for common Schema.org structured data types,
 * auto-detects FAQ content, and handles flexible schema_type parsing
 * (string, JSON array string, or native array).
 */

import type { SiteSettings } from "@site/lib/cms/publicLoaders";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FaqItem {
  question: string;
  answer: string;
}

export type SchemaRouteType = "page" | "post";

export interface SchemaInput {
  /** Page title (used as name / headline) */
  title?: string;
  /** Page meta description */
  description?: string;
  /** Full canonical URL of the page */
  url?: string;
  /** OG / featured image URL */
  image?: string;
  /** Raw schema_type value from the CMS (string, JSON array, or array) */
  schemaType?: string | string[] | null;
  /** Custom overrides authored in the admin JSON editor */
  schemaData?: Record<string, unknown> | null;
  /** Structured page content — used to auto-detect FAQ items */
  pageContent?: unknown;
  /** Site-wide settings (phone, address, name, logo, socials) */
  siteSettings?: SiteSettings;
  /** Whether the current route is a standard page or a real blog post */
  routeType?: SchemaRouteType;
  /** Real publish timestamp for blog/article schema */
  publishedTime?: string;
  /** Real update timestamp for blog/article schema */
  updatedTime?: string;
}

/* ------------------------------------------------------------------ */
/*  parseSchemaTypes                                                   */
/* ------------------------------------------------------------------ */

/**
 * Normalise the `schema_type` field into an array of type strings.
 *
 * Handles:
 *  - `null` / `undefined` → `[]`
 *  - A plain string like `"LocalBusiness"` → `["LocalBusiness"]`
 *  - A comma-separated string `"LocalBusiness,FAQPage"` → `["LocalBusiness","FAQPage"]`
 *  - A JSON array string `'["LocalBusiness","FAQPage"]'` → `["LocalBusiness","FAQPage"]`
 *  - A native string array → returned as-is
 */
export function parseSchemaTypes(
  raw: string | string[] | null | undefined,
): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((s) => s.trim()).filter(Boolean);

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      // Fall through to comma split
    }
  }

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  extractFaqItems                                                    */
/* ------------------------------------------------------------------ */

/**
 * Auto-detect FAQ question/answer pairs from structured page content.
 *
 * Looks for common patterns:
 *  - `content.faq.items` (home page)
 *  - `content.faqs` or `content.faqItems`
 *  - Any top-level array property whose objects have `question` + `answer` keys
 */
export function extractFaqItems(content: unknown): FaqItem[] {
  if (!content || typeof content !== "object") return [];

  const obj = content as Record<string, unknown>;

  if (obj.faq && typeof obj.faq === "object") {
    const faq = obj.faq as Record<string, unknown>;
    if (faq.enabled !== false && Array.isArray(faq.items) && faq.items.length > 0) {
      const valid = faq.items.filter(isFaqShape);
      if (valid.length) return valid;
    }
  }

  for (const key of ["faqs", "faqItems", "faq_items", "questions"]) {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0) {
      const valid = val.filter(isFaqShape);
      if (valid.length) return valid;
    }
  }

  for (const val of Object.values(obj)) {
    if (Array.isArray(val) && val.length > 0 && val.every(isFaqShape)) {
      return val;
    }
  }

  return [];
}

function isFaqShape(item: unknown): item is FaqItem {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.question === "string" &&
    o.question.length > 0 &&
    typeof o.answer === "string" &&
    o.answer.length > 0
  );
}

/* ------------------------------------------------------------------ */
/*  Schema builders                                                    */
/* ------------------------------------------------------------------ */

/** Strip HTML tags for plain-text schema values */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildLocalBusinessSchema(
  input: SchemaInput,
): Record<string, unknown> {
  const s = input.siteSettings;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
  };

  assignOptional(schema, {
    name: s?.siteName || input.title,
    url: input.url,
    description: input.description,
    image: input.image,
    logo: s?.logoUrl,
  });

  if (s?.phoneNumber) {
    schema.telephone = s.phoneDisplay || s.phoneNumber;
  }

  const address = buildPostalAddress(s);
  if (address) {
    schema.address = address;
  }

  const socialUrls = s?.socialLinks
    ?.filter((link) => link.enabled && link.url)
    .map((link) => link.url);
  if (socialUrls?.length) {
    schema.sameAs = socialUrls;
  }

  return schema;
}

export function buildAttorneySchema(
  input: SchemaInput,
): Record<string, unknown> {
  const s = input.siteSettings;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Attorney",
  };

  assignOptional(schema, {
    name: s?.siteName || input.title,
    url: input.url,
    description: input.description,
    image: input.image,
    logo: s?.logoUrl,
  });

  if (s?.phoneNumber) {
    schema.telephone = s.phoneDisplay || s.phoneNumber;
  }

  const address = buildPostalAddress(s);
  if (address) {
    schema.address = address;
  }

  return schema;
}

export function buildWebPageSchema(
  input: SchemaInput,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
  };

  assignOptional(schema, {
    name: input.title,
    description: input.description,
    url: input.url,
    image: input.image,
  });

  if (input.siteSettings?.siteName && input.siteSettings.siteUrl) {
    schema.isPartOf = {
      "@type": "WebSite",
      name: input.siteSettings.siteName,
      url: input.siteSettings.siteUrl,
    };
  }

  return schema;
}

export function buildFaqSchema(input: SchemaInput): Record<string, unknown> | null {
  const items = extractFaqItems(input.pageContent);
  if (!items.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: stripHtml(item.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtml(item.answer),
      },
    })),
  };
}

export function buildArticleSchema(input: SchemaInput): Record<string, unknown> | null {
  if (!input.title) {
    return null;
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
  };

  assignOptional(schema, {
    description: input.description,
    image: input.image,
    datePublished: input.publishedTime,
    dateModified: input.updatedTime || input.publishedTime,
  });

  if (input.url) {
    schema.mainEntityOfPage = {
      "@type": "WebPage",
      "@id": input.url,
    };
    schema.url = input.url;
  }

  return schema;
}

/** Builds AboutPage or ContactPage schema (simple WebPage subtypes) */
function buildSimplePageSchema(
  type: string,
  input: SchemaInput,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
  };

  assignOptional(schema, {
    name: input.title,
    description: input.description,
    url: input.url,
    image: input.image,
  });

  return schema;
}

/* ------------------------------------------------------------------ */
/*  buildAllSchemas — main entry point                                 */
/* ------------------------------------------------------------------ */

/**
 * Given the page's schema configuration and content, build an array
 * of JSON-LD objects ready for injection into `<head>`.
 *
 * Custom `schemaData` overrides are merged on top of auto-generated fields
 * for explicitly-requested types (custom values win).
 *
 * FAQPage is auto-injected whenever the page content contains detectable
 * FAQ items, even if the admin has not explicitly selected FAQPage in the
 * schema type selector.
 */
export function buildAllSchemas(input: SchemaInput): Record<string, unknown>[] {
  const types = parseSchemaTypes(input.schemaType);
  const schemas: Record<string, unknown>[] = [];

  for (const type of types) {
    let schema: Record<string, unknown> | null = null;

    switch (type) {
      case "LocalBusiness":
      case "LegalService":
        schema = buildLocalBusinessSchema(input);
        if (type === "LegalService") {
          schema["@type"] = "LegalService";
        }
        break;
      case "Attorney":
        schema = buildAttorneySchema(input);
        break;
      case "WebPage":
        schema = buildWebPageSchema(input);
        break;
      case "FAQPage":
        schema = buildFaqSchema(input);
        break;
      case "AboutPage":
      case "ContactPage":
        schema = buildSimplePageSchema(type, input);
        break;
      case "Article":
      case "BlogPosting":
      case "NewsArticle":
        schema = buildArticleSchema(input);
        if (schema) {
          schema["@type"] = type;
        }
        break;
      default:
        schema = {
          "@context": "https://schema.org",
          "@type": type,
        };
        assignOptional(schema, {
          name: input.title,
          url: input.url,
          description: input.description,
        });
        break;
    }

    if (schema) {
      if (input.schemaData && Object.keys(input.schemaData).length > 0) {
        Object.assign(schema, input.schemaData);
      }
      schemas.push(schema);
    }
  }

  if (!types.includes("FAQPage") && input.pageContent) {
    const faqSchema = buildFaqSchema(input);
    if (faqSchema) {
      schemas.push(faqSchema);
    }
  }

  const requestedArticleTypes = ["Article", "BlogPosting", "NewsArticle"];
  const hasExplicitArticleType = types.some((type) => requestedArticleTypes.includes(type));
  if (input.routeType === "post" && !hasExplicitArticleType) {
    const articleSchema = buildArticleSchema(input);
    if (articleSchema) {
      schemas.push(articleSchema);
    }
  }

  return schemas;
}

/**
 * Returns true when the page content contains detectable FAQ items.
 * Convenience helper for use in admin UI components.
 */
export function hasFaqContent(content: unknown): boolean {
  return extractFaqItems(content).length > 0;
}

/* ------------------------------------------------------------------ */
/*  Address parsing helpers                                            */
/* ------------------------------------------------------------------ */

function assignOptional(target: Record<string, unknown>, values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    if (value == null) {
      continue;
    }

    if (typeof value === "string" && !value.trim()) {
      continue;
    }

    target[key] = value;
  }
}

function buildPostalAddress(siteSettings?: SiteSettings) {
  if (!siteSettings?.addressLine1) {
    return null;
  }

  const address: Record<string, unknown> = {
    "@type": "PostalAddress",
    streetAddress: siteSettings.addressLine1,
  };

  assignOptional(address, {
    addressLocality: parseCity(siteSettings.addressLine2),
    addressRegion: parseState(siteSettings.addressLine2),
    postalCode: parseZip(siteSettings.addressLine2),
  });

  return address;
}

/** Extract city from "City, State 00000" → "City" */
function parseCity(line?: string): string {
  if (!line) return "";
  const parts = line.split(",");
  return parts[0]?.trim() || "";
}

/** Extract state from "City, State 00000" → "State" */
function parseState(line?: string): string {
  if (!line) return "";
  const parts = line.split(",");
  if (parts.length < 2) return "";
  const stateZip = parts[1]?.trim() || "";
  return stateZip.replace(/\d+/g, "").trim();
}

/** Extract zip from "City, State 00000" → "00000" */
function parseZip(line?: string): string {
  if (!line) return "";
  const match = line.match(/\d{5}(-\d{4})?/);
  return match?.[0] || "";
}
