import type {
  TemplateType,
  TransformedPracticePage,
  TransformedBlogPost,
  TransformedRecord,
  MappingConfig,
  SourceRecord,
} from "./types";
import { applyMapping, collectRepeaterData, slugify } from "./fieldMapping";
import {
  createPracticeAreaContentSection,
  defaultPracticeAreaPageContent,
  normalizePracticeAreaContentSections,
} from "@site/lib/cms/practiceAreaPageTypes";
import {
  cleanPracticeContentBody,
  detectFaqPatterns,
  resolveImportPublishDate,
  syncPracticeSourceImageFields,
} from "./preparer";

/**
 * Transform an array of mapped records into the exact CMS schema shapes
 * ready for server submission.
 */
export function transformRecords(
  sourceRecords: SourceRecord[],
  mappingConfig: MappingConfig,
  templateType: TemplateType,
): TransformedRecord[] {
  const importTimestamp = new Date().toISOString();

  return sourceRecords.map((source) => {
    const mapped =
      templateType === "practice"
        ? syncPracticeSourceImageFields(applyMapping(source, mappingConfig))
        : applyMapping(source, mappingConfig);

    if (templateType === "practice") {
      return transformPracticePage(mapped, source, mappingConfig, importTimestamp);
    }
    return transformBlogPost(mapped, importTimestamp);
  });
}

// ---------------------------------------------------------------------------
// Practice Area Page Transformer
// ---------------------------------------------------------------------------

function transformPracticePage(
  mapped: Record<string, unknown>,
  sourceRecord: SourceRecord,
  config: MappingConfig,
  importTimestamp: string,
): TransformedPracticePage {
  const syncedMapped = syncPracticeSourceImageFields(mapped);
  const title = String(mapped["title"] ?? "Untitled");
  const rawSlug = mapped["url_slug"]
    ? String(mapped["url_slug"])
    : slugify(title);
  const urlPath = `/${rawSlug.replace(/^\/+|\/+$/g, "")}/`;
  const publishDate = resolveImportPublishDate(mapped["published_at"], importTimestamp);

  // Build content sections from repeater data or mapped arrays
  let contentSections = collectRepeaterData(
    sourceRecord,
    "practice",
    "contentSections",
    config,
  );

  // Build FAQ items before content section cleanup so extracted FAQ content
  // does not also appear in regular content sections.
  let faqItems = collectRepeaterData(
    sourceRecord,
    "practice",
    "faq.items",
    config,
  );

  // If no repeater data found, check if there's a single body mapped
  if (contentSections.length === 0 && mapped["contentSections.body"]) {
    let body = cleanPracticeContentBody(String(mapped["contentSections.body"]));
    if (faqItems.length === 0) {
      const detected = detectFaqPatterns(body);
      if (detected.length >= 2) {
        faqItems = detected;
      }
    }
    if (faqItems.length > 0) {
      body = cleanPracticeContentBody(body, faqItems);
    }

    contentSections = [
      createPracticeAreaContentSection(0, {
        body,
        image: mapped["contentSections.image"]
          ? String(mapped["contentSections.image"])
          : "",
        imageAlt: mapped["contentSections.imageAlt"]
          ? String(mapped["contentSections.imageAlt"])
          : "",
      }) as unknown as Record<string, unknown>,
    ];
  }

  // Normalize content sections
  const normalizedSections = normalizePracticeAreaContentSections(
    contentSections.map((section) => ({
      body: cleanPracticeContentBody(String(section.body ?? ""), faqItems),
      image: String(section.image ?? ""),
      imageAlt: String(section.imageAlt ?? ""),
      imagePosition: section.imagePosition as "left" | "right" | undefined,
      showCTAs:
        typeof section.showCTAs === "boolean" ? section.showCTAs : undefined,
    })),
  );

  // Normalize FAQ items
  const normalizedFaq = faqItems.map((item) => ({
    question: String(item.question ?? ""),
    answer: ensureHtml(String(item.answer ?? "")),
  }));

  // Build the content object matching PracticeAreaPageContent
  const content: Record<string, unknown> = {
    hero: {
      sectionLabel:
        defaultPracticeAreaPageContent.hero.sectionLabel,
      tagline: mapped["hero.tagline"]
        ? String(mapped["hero.tagline"])
        : defaultPracticeAreaPageContent.hero.tagline,
      description: mapped["hero.description"]
        ? ensureHtml(String(mapped["hero.description"]))
        : defaultPracticeAreaPageContent.hero.description,
      backgroundImage: syncedMapped["hero.backgroundImage"]
        ? String(syncedMapped["hero.backgroundImage"])
        : syncedMapped["featured_image"]
          ? String(syncedMapped["featured_image"])
          : "",
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
    meta_title: mapped["meta_title"] ? String(mapped["meta_title"]) : undefined,
    meta_description: mapped["meta_description"]
      ? String(mapped["meta_description"])
      : undefined,
    canonical_url: null,
    og_title: null,
    og_description: null,
    og_image: null,
    noindex: false,
    schema_type: null,
    schema_data: null,
    published_at: publishDate.publishedAt,
    publish_date_source: publishDate.source,
    status: "draft",
  };
}

// ---------------------------------------------------------------------------
// Blog Post Transformer
// ---------------------------------------------------------------------------

function transformBlogPost(
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
    meta_title: mapped["meta_title"] ? String(mapped["meta_title"]) : undefined,
    meta_description: mapped["meta_description"]
      ? String(mapped["meta_description"])
      : undefined,
    canonical_url: null,
    og_title: null,
    og_description: null,
    og_image: mapped["og_image"] ? String(mapped["og_image"]) : null,
    noindex: false,
    published_at: publishDate.publishedAt,
    publish_date_source: publishDate.source,
    status: "draft",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure a value is wrapped in HTML tags if it's plain text.
 */
function ensureHtml(text: string): string {
  if (!text || text.trim() === "") return "";
  // Already has HTML tags
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  // Wrap plain text in paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return `<p>${text}</p>`;
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}
