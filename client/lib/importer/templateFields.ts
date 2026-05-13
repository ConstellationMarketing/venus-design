import type { TemplateFieldDefinition, TemplateType } from "./types";

// ============================================================================
// Practice Area Page — Field Definitions
// ============================================================================

export const practicePageFields: TemplateFieldDefinition[] = [
  // --- Row-level fields ---
  {
    key: "title",
    label: "Page Title",
    cmsPath: "title",
    required: true,
    type: "text",
    group: "Page Info",
    helpText: "The main title of the practice area page",
  },
  {
    key: "url_slug",
    label: "URL Slug",
    cmsPath: "url_slug",
    required: true,
    type: "text",
    group: "Page Info",
    helpText:
      "URL-safe slug (e.g. 'personal-injury'). Will be placed under /practice-areas/<slug>/",
  },
  {
    key: "published_at",
    label: "Publish Date",
    cmsPath: "published_at",
    required: false,
    type: "text",
    group: "Page Info",
    helpText: "Optional publish date or date-time. If not mapped, import time will be used.",
  },
  {
    key: "meta_title",
    label: "Meta Title",
    cmsPath: "meta_title",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "SEO title tag. Falls back to page title if empty.",
  },
  {
    key: "meta_description",
    label: "Meta Description",
    cmsPath: "meta_description",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "SEO meta description",
  },

  // --- SEO (extended) ---
  {
    key: "canonical_url",
    label: "Canonical URL",
    cmsPath: "canonical_url",
    required: false,
    type: "url",
    group: "SEO",
    helpText: "Canonical URL override for this page",
  },
  {
    key: "og_title",
    label: "OG Title",
    cmsPath: "og_title",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "Open Graph title for social sharing",
  },
  {
    key: "og_description",
    label: "OG Description",
    cmsPath: "og_description",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "Open Graph description for social sharing",
  },
  {
    key: "og_image",
    label: "OG Image",
    cmsPath: "og_image",
    required: false,
    type: "image",
    group: "SEO",
    helpText: "Open Graph image URL for social sharing",
  },
  {
    key: "noindex",
    label: "Noindex",
    cmsPath: "noindex",
    required: false,
    type: "boolean",
    group: "SEO",
    helpText: "If true, search engines will not index this page",
  },

  // --- Source-only fields (consumed by pipeline, never in final CMS output) ---
  {
    key: "body",
    label: "Body Content (source)",
    cmsPath: "_source.body",
    required: false,
    type: "richtext",
    group: "Source",
    helpText:
      "Main body HTML — automatically split into content sections, FAQ extracted if present. This is a pipeline input, not a direct CMS field.",
  },
  {
    key: "featured_image",
    label: "Featured Image (source)",
    cmsPath: "_source.featured_image",
    required: false,
    type: "image",
    group: "Source",
    helpText:
      "Primary image — used as hero background if no hero image is explicitly mapped. This is a pipeline input, not a direct CMS field.",
  },

  // --- Hero section ---
  {
    key: "hero.sectionLabel",
    label: "Page Title / Hero H1",
    cmsPath: "content.hero.sectionLabel",
    required: false,
    type: "text",
    group: "Hero",
    helpText:
      "Primary page heading (H1). For Practice Page imports, this is the main page title displayed in the hero. Defaults to the source title.",
  },
  {
    key: "hero.tagline",
    label: "Hero Tagline",
    cmsPath: "content.hero.tagline",
    required: false,
    type: "text",
    group: "Hero",
    helpText: "Main headline in the hero banner",
  },
  {
    key: "hero.description",
    label: "Hero Description",
    cmsPath: "content.hero.description",
    required: false,
    type: "richtext",
    group: "Hero",
    helpText: "Paragraph text below the hero tagline (HTML allowed)",
  },
  {
    key: "hero.backgroundImage",
    label: "Hero Background Image",
    cmsPath: "content.hero.backgroundImage",
    required: false,
    type: "image",
    group: "Hero",
    helpText: "URL to the hero background image",
  },
  {
    key: "hero.backgroundImageAlt",
    label: "Hero Image Alt Text",
    cmsPath: "content.hero.backgroundImageAlt",
    required: false,
    type: "text",
    group: "Hero",
    helpText: "Alt text for the hero background image",
  },

  // --- Content Sections (repeater) ---
  {
    key: "contentSections",
    label: "Content Sections",
    cmsPath: "content.contentSections",
    required: false,
    type: "json",
    group: "Content Sections",
    repeater: true,
    helpText: "Repeating content sections with body text and image",
  },
  {
    key: "contentSections.body",
    label: "Section Body",
    cmsPath: "content.contentSections[].body",
    required: false,
    type: "richtext",
    group: "Content Sections",
    repeaterParent: "contentSections",
    repeaterIndexPattern: "_",
    helpText: "Rich text body for this content section (HTML allowed)",
  },
  {
    key: "contentSections.image",
    label: "Section Image",
    cmsPath: "content.contentSections[].image",
    required: false,
    type: "image",
    group: "Content Sections",
    repeaterParent: "contentSections",
    repeaterIndexPattern: "_",
    helpText: "Image URL for this content section",
  },
  {
    key: "contentSections.imageAlt",
    label: "Section Image Alt",
    cmsPath: "content.contentSections[].imageAlt",
    required: false,
    type: "text",
    group: "Content Sections",
    repeaterParent: "contentSections",
    repeaterIndexPattern: "_",
    helpText: "Alt text for the section image",
  },
  {
    key: "contentSections.imagePosition",
    label: "Image Position",
    cmsPath: "content.contentSections[].imagePosition",
    required: false,
    type: "select",
    group: "Content Sections",
    repeaterParent: "contentSections",
    repeaterIndexPattern: "_",
    helpText: "'left' or 'right' (defaults to alternating)",
  },

  // --- FAQ (repeater) ---
  {
    key: "faq.heading",
    label: "FAQ Heading",
    cmsPath: "content.faq.heading",
    required: false,
    type: "text",
    group: "FAQ",
    helpText: "Heading for the FAQ section",
  },
  {
    key: "faq.description",
    label: "FAQ Description",
    cmsPath: "content.faq.description",
    required: false,
    type: "text",
    group: "FAQ",
    helpText: "Short description below the FAQ heading",
  },
  {
    key: "faq.items",
    label: "FAQ Items",
    cmsPath: "content.faq.items",
    required: false,
    type: "json",
    group: "FAQ",
    repeater: true,
    helpText: "Repeating FAQ question/answer pairs",
  },
  {
    key: "faq.items.question",
    label: "FAQ Question",
    cmsPath: "content.faq.items[].question",
    required: false,
    type: "text",
    group: "FAQ",
    repeaterParent: "faq.items",
    repeaterIndexPattern: "_",
    helpText: "The question text",
  },
  {
    key: "faq.items.answer",
    label: "FAQ Answer",
    cmsPath: "content.faq.items[].answer",
    required: false,
    type: "richtext",
    group: "FAQ",
    repeaterParent: "faq.items",
    repeaterIndexPattern: "_",
    helpText: "The answer text (HTML allowed)",
  },
];

// ============================================================================
// Blog Post — Field Definitions
// ============================================================================

export const blogPostFields: TemplateFieldDefinition[] = [
  {
    key: "title",
    label: "Post Title",
    cmsPath: "title",
    required: true,
    type: "text",
    group: "Post Info",
    helpText: "The title of the blog post",
  },
  {
    key: "slug",
    label: "URL Slug",
    cmsPath: "slug",
    required: true,
    type: "text",
    group: "Post Info",
    helpText: "URL-safe slug (e.g. 'my-blog-post')",
  },
  {
    key: "excerpt",
    label: "Excerpt",
    cmsPath: "excerpt",
    required: false,
    type: "text",
    group: "Post Info",
    helpText: "Short summary of the post",
  },
  {
    key: "published_at",
    label: "Publish Date",
    cmsPath: "published_at",
    required: false,
    type: "text",
    group: "Post Info",
    helpText: "Optional publish date or date-time. If not mapped, import time will be used.",
  },
  {
    key: "category",
    label: "Category",
    cmsPath: "category",
    required: false,
    type: "text",
    group: "Post Info",
    helpText:
      "Category name. Existing categories are reused when possible and a new category is created only when needed.",
  },
  {
    key: "featured_image",
    label: "Featured Image",
    cmsPath: "featured_image",
    required: false,
    type: "image",
    group: "Post Info",
    helpText: "URL to the featured image",
  },
  {
    key: "body",
    label: "Body",
    cmsPath: "body",
    required: false,
    type: "richtext",
    group: "Content",
    helpText: "Full article body (HTML string)",
  },
  {
    key: "meta_title",
    label: "Meta Title",
    cmsPath: "meta_title",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "SEO title tag",
  },
  {
    key: "meta_description",
    label: "Meta Description",
    cmsPath: "meta_description",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "SEO meta description",
  },
  {
    key: "og_image",
    label: "OG Image",
    cmsPath: "og_image",
    required: false,
    type: "image",
    group: "SEO",
    helpText: "Open Graph image URL for social sharing",
  },
  {
    key: "canonical_url",
    label: "Canonical URL",
    cmsPath: "canonical_url",
    required: false,
    type: "url",
    group: "SEO",
    helpText: "Canonical URL override for this post",
  },
  {
    key: "og_title",
    label: "OG Title",
    cmsPath: "og_title",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "Open Graph title for social sharing",
  },
  {
    key: "og_description",
    label: "OG Description",
    cmsPath: "og_description",
    required: false,
    type: "text",
    group: "SEO",
    helpText: "Open Graph description for social sharing",
  },
  {
    key: "noindex",
    label: "Noindex",
    cmsPath: "noindex",
    required: false,
    type: "boolean",
    group: "SEO",
    helpText: "If true, search engines will not index this post",
  },
];

// ============================================================================
// Preparation Section Definitions
// ============================================================================

export interface PreparationSection {
  key: string;
  label: string;
  /** Whether the section is collapsed by default */
  defaultCollapsed?: boolean;
}

const practicePagePreparationSections: PreparationSection[] = [
  { key: "basic", label: "Basic Info" },
  { key: "hero", label: "Hero" },
  { key: "contentSections", label: "Content Sections" },
  { key: "faq", label: "FAQ" },
  { key: "seo", label: "SEO", defaultCollapsed: true },
];

const blogPostPreparationSections: PreparationSection[] = [
  { key: "basic", label: "Basic Info" },
  { key: "body", label: "Body" },
  { key: "seo", label: "SEO", defaultCollapsed: true },
];

const preparationSectionsByTemplate: Record<TemplateType, PreparationSection[]> = {
  practice: practicePagePreparationSections,
  post: blogPostPreparationSections,
};

export function getPreparationSections(
  templateType: TemplateType,
): PreparationSection[] {
  return preparationSectionsByTemplate[templateType] ?? [];
}

// ============================================================================
// Lookup
// ============================================================================

const fieldsByTemplate: Record<TemplateType, TemplateFieldDefinition[]> = {
  practice: practicePageFields,
  post: blogPostFields,
};

export function getFieldsForTemplate(
  templateType: TemplateType,
): TemplateFieldDefinition[] {
  return fieldsByTemplate[templateType] ?? [];
}

/**
 * Returns only the top-level mappable fields (excludes repeater children,
 * which are handled via their parent repeater).
 */
export function getMappableFields(
  templateType: TemplateType,
): TemplateFieldDefinition[] {
  return getFieldsForTemplate(templateType).filter((f) => !f.repeaterParent);
}

/**
 * Returns repeater child fields for a given parent key.
 */
export function getRepeaterChildFields(
  templateType: TemplateType,
  parentKey: string,
): TemplateFieldDefinition[] {
  return getFieldsForTemplate(templateType).filter(
    (f) => f.repeaterParent === parentKey,
  );
}

/**
 * Returns required fields for validation.
 */
export function getRequiredFields(
  templateType: TemplateType,
): TemplateFieldDefinition[] {
  return getFieldsForTemplate(templateType).filter((f) => f.required);
}

/**
 * Returns image fields for a given template (used for image ingestion).
 */
export function getImageFields(
  templateType: TemplateType,
): TemplateFieldDefinition[] {
  return getFieldsForTemplate(templateType).filter((f) => f.type === "image");
}

/**
 * Returns grouped fields for UI display.
 */
export function getGroupedFields(
  templateType: TemplateType,
): Record<string, TemplateFieldDefinition[]> {
  const fields = getFieldsForTemplate(templateType);
  const groups: Record<string, TemplateFieldDefinition[]> = {};
  for (const field of fields) {
    if (!groups[field.group]) {
      groups[field.group] = [];
    }
    groups[field.group].push(field);
  }
  return groups;
}
