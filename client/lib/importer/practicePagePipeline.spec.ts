import { describe, it, expect, beforeAll } from "vitest";
import { autoMapFields } from "./autoMapper";
import { applyMapping } from "./fieldMapping";
import {
  prepareRecords,
  normalizeImportedPublishDate,
  normalizeUrlSlug,
  splitOnH2,
  stripH1Tags,
  removeFaqFromHtml,
  detectFaqPatterns,
  syncPracticeSourceImageFields,
} from "./preparer";
import { removeEmptyElements } from "./htmlNormalizer";
import { filterSecondaryContent, extractMainContent } from "./contentFilter";
import { stripShortcodes } from "./sourceCleaner";
import type {
  SourceRecord,
  TransformedBlogPost,
  TransformedPracticePage,
} from "./types";

// ---------------------------------------------------------------------------
// Test fixture: clean JSON practice page
// ---------------------------------------------------------------------------

const SITE_NAME = "Jupiter Law Group";

const CLEAN_JSON_SOURCE: SourceRecord = {
  title: "Personal Injury Attorney",
  url: "/practice-areas/personal-injury/",
  body: '<h2>Why Choose Us</h2><p>We fight for your rights...</p><h2>Types of Cases</h2><p>Car accidents, slip and fall...</p><h3>What is personal injury?</h3><p>Personal injury law covers...</p><h3>How long do I have to file?</h3><p>The statute of limitations...</p>',
  featured_image: "https://example.com/images/personal-injury.jpg",
  meta_description:
    "Expert personal injury attorneys serving the greater metro area.",
};

// ---------------------------------------------------------------------------
// 1. Auto-mapping: body & featured_image must be mappable
// ---------------------------------------------------------------------------

describe("Practice page auto-mapping", () => {
  it("maps body, featured_image, url, title, meta_description for practice template", () => {
    const columns = Object.keys(CLEAN_JSON_SOURCE);
    const config = autoMapFields(columns, "practice");
    const targetFields = config.mappings.map((m) => m.targetField);

    expect(targetFields).toContain("title");
    expect(targetFields).toContain("url_slug"); // "url" alias
    expect(targetFields).toContain("body");
    expect(targetFields).toContain("featured_image");
    expect(targetFields).toContain("meta_description");
  });

  it("maps body to _source.body cmsPath (source-only field)", async () => {
    // Verify the field definition uses _source. prefix
    const { getMappableFields } = await import("./templateFields");
    const fields = getMappableFields("practice");
    const bodyField = fields.find(
      (f: { key: string }) => f.key === "body",
    );
    expect(bodyField).toBeDefined();
    expect(bodyField.cmsPath).toBe("_source.body");
    expect(bodyField.label).toContain("(source)");
  });

  it("maps featured_image to _source.featured_image cmsPath (source-only field)", async () => {
    const { getMappableFields } = await import("./templateFields");
    const fields = getMappableFields("practice");
    const imgField = fields.find(
      (f: { key: string }) => f.key === "featured_image",
    );
    expect(imgField).toBeDefined();
    expect(imgField.cmsPath).toBe("_source.featured_image");
    expect(imgField.label).toContain("(source)");
  });

  it("maps common publish date aliases", () => {
    const config = autoMapFields(["post_date", "title"], "post");
    const publishDateMapping = config.mappings.find(
      (mapping) => mapping.sourceColumn === "post_date",
    );

    expect(publishDateMapping?.targetField).toBe("published_at");
  });
});

// ---------------------------------------------------------------------------
// 2. URL slug normalization
// ---------------------------------------------------------------------------

describe("normalizeUrlSlug", () => {
  it("extracts slug from /practice-areas/slug/ path", () => {
    expect(normalizeUrlSlug("/practice-areas/personal-injury/", "fallback")).toBe(
      "personal-injury",
    );
  });

  it("extracts slug from full URL", () => {
    expect(
      normalizeUrlSlug(
        "https://example.com/practice-areas/pi/",
        "fallback",
      ),
    ).toBe("pi");
  });

  it("strips leading/trailing slashes from bare slug", () => {
    expect(normalizeUrlSlug("/personal-injury/", "fallback")).toBe(
      "personal-injury",
    );
  });

  it("takes last segment from multi-segment path", () => {
    expect(normalizeUrlSlug("/services/legal/pi/", "fallback")).toBe("pi");
  });

  it("uses bare slug as-is", () => {
    expect(normalizeUrlSlug("personal-injury", "fallback")).toBe(
      "personal-injury",
    );
  });

  it("falls back to slugified title when empty", () => {
    expect(normalizeUrlSlug("", "My Page Title")).toBe("my-page-title");
  });
});

// ---------------------------------------------------------------------------
// 3. Full pipeline: prepareRecords with clean JSON
// ---------------------------------------------------------------------------

describe("Publish date normalization", () => {
  it("normalizes parseable date strings to ISO timestamps", () => {
    expect(normalizeImportedPublishDate("2024-01-15 10:30:00")).toBe(
      new Date("2024-01-15 10:30:00").toISOString(),
    );
  });

  it("returns null for invalid publish date strings", () => {
    expect(normalizeImportedPublishDate("not-a-real-date")).toBeNull();
  });
});

describe("Practice page full pipeline (prepareRecords)", () => {
  let result: TransformedPracticePage;

  beforeAll(() => {
    const columns = Object.keys(CLEAN_JSON_SOURCE);
    const config = autoMapFields(columns, "practice");
    const prepared = prepareRecords(
      [CLEAN_JSON_SOURCE],
      config,
      "practice",
      { siteName: SITE_NAME },
    );
    result = prepared[0].current as TransformedPracticePage;
  });

  it("title → page-level title field", () => {
    expect(result.title).toBe("Personal Injury Attorney");
  });

  it("title → hero.sectionLabel (H1 primary heading)", () => {
    const hero = (result.content as Record<string, any>).hero;
    expect(hero.sectionLabel).toBe("Personal Injury Attorney");
  });

  it("hero description remains empty", () => {
    const hero = (result.content as Record<string, any>).hero;
    expect(hero.description).toBe("");
  });

  it("hero tagline remains empty (not auto-filled from title)", () => {
    const hero = (result.content as Record<string, any>).hero;
    expect(hero.tagline).toBe("");
  });

  it("featured_image → hero background image", () => {
    const hero = (result.content as Record<string, any>).hero;
    expect(hero.backgroundImage).toBe(
      "https://example.com/images/personal-injury.jpg",
    );
  });

  it("body → content sections (H2 split)", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    // Should have 2 H2 sections (FAQ h3s are extracted)
    expect(sections.length).toBeGreaterThanOrEqual(2);
    // First section should contain "Why Choose Us"
    expect(sections[0].body).toContain("Why Choose Us");
    // Second section should contain "Types of Cases"
    expect(sections[1].body).toContain("Types of Cases");
  });

  it("defaults CTA visibility on alternating content sections", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    expect(sections[0].showCTAs).toBe(true);
    expect(sections[1].showCTAs).toBe(false);
  });

  it("FAQ extracted when present (2 items from h3?)", () => {
    const faq = (result.content as Record<string, any>).faq;
    expect(faq.enabled).toBe(true);
    expect(faq.items.length).toBe(2);
    expect(faq.items[0].question).toBe("What is personal injury?");
    expect(faq.items[1].question).toBe("How long do I have to file?");
  });

  it("FAQ content removed from body sections (no duplication)", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    const allBodies = sections.map((s: any) => s.body).join(" ");
    expect(allBodies).not.toContain("What is personal injury?");
    expect(allBodies).not.toContain("How long do I have to file?");
  });

  it("meta_title derived correctly: title | siteName", () => {
    expect(result.meta_title).toBe(
      `Personal Injury Attorney | ${SITE_NAME}`,
    );
  });

  it("meta_description = source value", () => {
    expect(result.meta_description).toBe(
      "Expert personal injury attorneys serving the greater metro area.",
    );
  });

  it("URL path does not add the /practice-areas/ prefix", () => {
    expect(result.url_path).toBe("/personal-injury/");
  });

  it("final CMS record has NO body or featured_image fields (source-only)", () => {
    const keys = Object.keys(result);
    expect(keys).not.toContain("body");
    expect(keys).not.toContain("featured_image");

    // Also check inside content
    const contentKeys = Object.keys(result.content as Record<string, any>);
    expect(contentKeys).not.toContain("body");
    expect(contentKeys).not.toContain("featured_image");
  });

  it("uses standard Practice Page schema structure", () => {
    const content = result.content as Record<string, any>;
    expect(content).toHaveProperty("hero");
    expect(content).toHaveProperty("socialProof");
    expect(content).toHaveProperty("contentSections");
    expect(content).toHaveProperty("faq");
    expect(result.page_type).toBe("practice");
    expect(result.status).toBe("draft");
  });

  it("falls back publish date to the import timestamp when none is mapped", () => {
    const prepared = prepareRecords([CLEAN_JSON_SOURCE], autoMapFields(Object.keys(CLEAN_JSON_SOURCE), "practice"), "practice", {
      siteName: SITE_NAME,
      importTimestamp: "2024-02-03T04:05:06.000Z",
    });
    const record = prepared[0].current as TransformedPracticePage;

    expect(record.published_at).toBe("2024-02-03T04:05:06.000Z");
    expect(record.publish_date_source).toBe("fallback");
  });

  it("preserves mapped publish dates for blog posts", () => {
    const source: SourceRecord = {
      title: "Mapped Publish Date Post",
      slug: "mapped-publish-date-post",
      body: "<p>Body</p>",
      publish_date: "2024-04-20T15:30:00Z",
    };
    const prepared = prepareRecords([source], autoMapFields(Object.keys(source), "post"), "post", {
      importTimestamp: "2024-02-03T04:05:06.000Z",
    });
    const record = prepared[0].current as TransformedBlogPost;

    expect(record.published_at).toBe("2024-04-20T15:30:00.000Z");
    expect(record.publish_date_source).toBe("mapped");
  });
});

// ---------------------------------------------------------------------------
// 4. meta_title fallback without siteName
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 5. hero.sectionLabel routing
// ---------------------------------------------------------------------------

describe("practice image syncing", () => {
  it("mirrors hero background image into featured_image when only hero image is mapped", () => {
    const synced = syncPracticeSourceImageFields({
      "hero.backgroundImage": "https://example.com/images/hero-only.jpg",
    });

    expect(synced["hero.backgroundImage"]).toBe(
      "https://example.com/images/hero-only.jpg",
    );
    expect(synced["featured_image"]).toBe(
      "https://example.com/images/hero-only.jpg",
    );
  });
});

describe("hero.sectionLabel H1 routing", () => {
  it("defaults hero.sectionLabel to title when no explicit mapping", () => {
    const source: SourceRecord = { title: "Car Accident Lawyer" };
    const config = autoMapFields(Object.keys(source), "practice");
    const prepared = prepareRecords([source], config, "practice");
    const p = prepared[0].current as TransformedPracticePage;
    const hero = (p.content as Record<string, any>).hero;
    expect(hero.sectionLabel).toBe("Car Accident Lawyer");
  });

  it("uses explicit hero.sectionLabel mapping when provided", () => {
    const source: SourceRecord = {
      title: "Car Accident Lawyer",
      hero_label: "Custom Hero Label",
    };
    const config = autoMapFields(Object.keys(source), "practice");
    // Manually add hero.sectionLabel mapping
    config.mappings.push({
      targetField: "hero.sectionLabel",
      sourceColumn: "hero_label",
      transform: "none",
    });
    const prepared = prepareRecords([source], config, "practice");
    const p = prepared[0].current as TransformedPracticePage;
    const hero = (p.content as Record<string, any>).hero;
    expect(hero.sectionLabel).toBe("Custom Hero Label");
  });

  it("template field label for hero.sectionLabel indicates H1", async () => {
    const { getMappableFields } = await import("./templateFields");
    const fields = getMappableFields("practice");
    const field = fields.find((f: { key: string }) => f.key === "hero.sectionLabel");
    expect(field).toBeDefined();
    expect(field.label).toContain("H1");
    expect(field.label).toContain("Title");
  });
});

// ---------------------------------------------------------------------------
// 6. meta_title fallback without siteName
// ---------------------------------------------------------------------------

describe("meta_title without siteName", () => {
  it("falls back to just title when siteName is empty", () => {
    const columns = Object.keys(CLEAN_JSON_SOURCE);
    const config = autoMapFields(columns, "practice");
    const prepared = prepareRecords(
      [CLEAN_JSON_SOURCE],
      config,
      "practice",
      // No siteName
    );
    const p = prepared[0].current as TransformedPracticePage;
    expect(p.meta_title).toBe("Personal Injury Attorney");
  });

  it("uses source meta_title when explicitly provided", () => {
    const source = {
      ...CLEAN_JSON_SOURCE,
      meta_title: "Custom SEO Title",
    };
    const columns = Object.keys(source);
    const config = autoMapFields(columns, "practice");
    const prepared = prepareRecords([source], config, "practice", {
      siteName: SITE_NAME,
    });
    const p = prepared[0].current as TransformedPracticePage;
    expect(p.meta_title).toBe("Custom SEO Title");
  });
});

// ---------------------------------------------------------------------------
// 7. H1 stripping, intro merging, FAQ deduplication
// ---------------------------------------------------------------------------

// Fixture: body with H1, intro paragraph, two H2 sections, FAQ heading, and FAQ h3 blocks
const BODY_WITH_H1_AND_INTRO =
  "<h1>Personal Injury Attorney</h1>" +
  "<p>We are a leading personal injury firm serving the metro area.</p>" +
  "<h2>Why Choose Us</h2><p>We fight for your rights with decades of experience.</p>" +
  "<h2>Types of Cases</h2><p>Car accidents, slip and fall, and more.</p>" +
  "<h2>Frequently Asked Questions</h2>" +
  '<h3>What is personal injury?</h3><p>Personal injury law covers physical and emotional harm.</p>' +
  '<h3>How long do I have to file?</h3><p>The statute of limitations varies by state.</p>';

describe("splitOnH2 — intro content merging", () => {
  it("merges pre-H2 content into the first H2 section instead of creating a standalone section", () => {
    const html =
      "<p>Intro paragraph here.</p>" +
      "<h2>Section One</h2><p>Content one.</p>" +
      "<h2>Section Two</h2><p>Content two.</p>";
    const sections = splitOnH2(html);
    expect(sections).toHaveLength(2);
    // First section starts with the intro, then the H2
    expect(sections[0]).toContain("Intro paragraph here.");
    expect(sections[0]).toContain("<h2");
    expect(sections[0]).toContain("Section One");
    // Second section is just the second H2
    expect(sections[1]).toContain("Section Two");
  });

  it("returns single section when no H2 tags present", () => {
    const html = "<p>Just a paragraph.</p>";
    const sections = splitOnH2(html);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toContain("Just a paragraph.");
  });

  it("works when there is no intro content before first H2", () => {
    const html =
      "<h2>First</h2><p>Content.</p><h2>Second</h2><p>More.</p>";
    const sections = splitOnH2(html);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toContain("First");
    expect(sections[1]).toContain("Second");
  });
});

describe("stripH1Tags", () => {
  it("removes H1 and its content from body HTML", () => {
    const html = "<h1>Page Title</h1><p>Body content.</p>";
    const result = stripH1Tags(html);
    expect(result).not.toContain("<h1");
    expect(result).not.toContain("Page Title");
    expect(result).toContain("Body content.");
  });

  it("removes H1 with attributes", () => {
    const html = '<h1 class="title">Big Title</h1><p>Rest.</p>';
    const result = stripH1Tags(html);
    expect(result).not.toContain("Big Title");
    expect(result).toContain("Rest.");
  });
});

describe("FAQ removal — no duplication in content sections", () => {
  it("removeFaqFromHtml strips h3 FAQ blocks from body", () => {
    const body =
      "<h2>Overview</h2><p>Some overview content.</p>" +
      '<h3>What is personal injury?</h3><p>Personal injury law covers physical and emotional harm.</p>' +
      '<h3>How long do I have to file?</h3><p>The statute of limitations varies by state.</p>';
    const faqItems = detectFaqPatterns(body);
    expect(faqItems.length).toBe(2);

    const cleaned = removeFaqFromHtml(body, faqItems);
    expect(cleaned).toContain("Overview");
    expect(cleaned).toContain("Some overview content.");
    expect(cleaned).not.toContain("What is personal injury?");
    expect(cleaned).not.toContain("How long do I have to file?");
  });

  it("removeFaqFromHtml also removes the FAQ H2 heading", () => {
    const body =
      "<h2>Overview</h2><p>Some overview content.</p>" +
      "<h2>Frequently Asked Questions</h2>" +
      '<h3>What is personal injury?</h3><p>Personal injury law covers physical and emotional harm.</p>' +
      '<h3>How long do I have to file?</h3><p>The statute of limitations varies by state.</p>';
    const faqItems = detectFaqPatterns(body);
    expect(faqItems.length).toBe(2);

    const cleaned = removeFaqFromHtml(body, faqItems);
    expect(cleaned).toContain("Overview");
    expect(cleaned).not.toContain("Frequently Asked Questions");
    expect(cleaned).not.toContain("What is personal injury?");
  });

  it("removeFaqFromHtml removes variant FAQ headings (FAQ, Common Questions, Q&A)", () => {
    const variants = [
      "<h2>FAQ</h2>",
      "<h2>FAQs</h2>",
      "<h2>Common Questions</h2>",
      "<h2>Q&amp;A</h2>",
      "<h2>Questions and Answers</h2>",
    ];
    const faqItems = [
      { question: "Q1?", answer: "<p>A1.</p>" },
      { question: "Q2?", answer: "<p>A2.</p>" },
    ];
    for (const heading of variants) {
      const body = "<p>Content.</p>" + heading + "<p>More content.</p>";
      const cleaned = removeFaqFromHtml(body, faqItems);
      expect(cleaned).toContain("Content.");
      // The FAQ heading tag itself should be stripped
      expect(cleaned).not.toContain(heading);
    }
  });

  it("does not remove non-FAQ h3 content", () => {
    const body =
      "<h2>Services</h2><p>We offer many services.</p>" +
      "<h3>Our Team</h3><p>Meet our attorneys.</p>" +
      '<h3>Is there a free consultation?</h3><p>Yes, we offer a free consultation.</p>' +
      '<h3>What areas do you serve?</h3><p>We serve the entire metro area.</p>';
    const faqItems = detectFaqPatterns(body);
    // Only the question-ending-with-? h3s are FAQ
    expect(faqItems.length).toBe(2);

    const cleaned = removeFaqFromHtml(body, faqItems);
    // Non-FAQ h3 "Our Team" should remain
    expect(cleaned).toContain("Our Team");
    expect(cleaned).toContain("Meet our attorneys.");
    // FAQ items should be removed
    expect(cleaned).not.toContain("Is there a free consultation?");
    expect(cleaned).not.toContain("What areas do you serve?");
  });
});

describe("Full pipeline with H1, intro, and FAQ", () => {
  let result: TransformedPracticePage;

  beforeAll(() => {
    const source: SourceRecord = {
      title: "Personal Injury Attorney",
      url: "/practice-areas/personal-injury/",
      body: BODY_WITH_H1_AND_INTRO,
      featured_image: "https://example.com/images/pi.jpg",
      meta_description: "Expert PI attorneys.",
    };
    const columns = Object.keys(source);
    const config = autoMapFields(columns, "practice");
    const prepared = prepareRecords([source], config, "practice", {
      siteName: SITE_NAME,
    });
    result = prepared[0].current as TransformedPracticePage;
  });

  it("H1 does NOT appear in any content section", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    const allBodies = sections.map((s: any) => s.body).join(" ");
    expect(allBodies).not.toContain("<h1");
  });

  it("intro paragraph is merged into first content section", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    // First section should contain both intro and first H2 content
    expect(sections[0].body).toContain(
      "We are a leading personal injury firm",
    );
    expect(sections[0].body).toContain("Why Choose Us");
  });

  it("produces exactly 2 content sections (one per H2)", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    expect(sections).toHaveLength(2);
  });

  it("FAQ items are extracted correctly", () => {
    const faq = (result.content as Record<string, any>).faq;
    expect(faq.enabled).toBe(true);
    expect(faq.items).toHaveLength(2);
    expect(faq.items[0].question).toBe("What is personal injury?");
    expect(faq.items[1].question).toBe("How long do I have to file?");
  });

  it("FAQ content does NOT appear in content sections", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    const allBodies = sections.map((s: any) => s.body).join(" ");
    expect(allBodies).not.toContain("What is personal injury?");
    expect(allBodies).not.toContain("How long do I have to file?");
    expect(allBodies).not.toContain("statute of limitations");
  });

  it("FAQ heading does NOT create its own content section", () => {
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];
    const allBodies = sections.map((s: any) => s.body).join(" ");
    expect(allBodies).not.toContain("Frequently Asked Questions");
    // Ensure no section is just an empty or near-empty FAQ heading remnant
    for (const s of sections) {
      const plain = (s.body as string).replace(/<[^>]*>/g, "").trim();
      expect(plain.length).toBeGreaterThan(10);
    }
  });

  it("hero.sectionLabel comes from title, not body H1", () => {
    const hero = (result.content as Record<string, any>).hero;
    expect(hero.sectionLabel).toBe("Personal Injury Attorney");
  });
});

// ===========================================================================
// HTML Normalizer Tests
// ===========================================================================

import {
  normalizeUrls,
  removeDuplicateBlocks,
  cleanInlineMarkup,
  normalizeHeadings,
  removeEmptySections,
  normalizeHtml,
} from "./htmlNormalizer";

// ---------------------------------------------------------------------------
// URL Normalization
// ---------------------------------------------------------------------------

describe("normalizeUrls", () => {
  const domain = "https://example.com";

  it("converts root-relative href to absolute", () => {
    const html = '<a href="/about">About</a>';
    const result = normalizeUrls(html, domain);
    expect(result).toBe('<a href="https://example.com/about">About</a>');
  });

  it("converts root-relative src to absolute", () => {
    const html = '<img src="/images/photo.jpg" alt="Photo">';
    const result = normalizeUrls(html, domain);
    expect(result).toBe(
      '<img src="https://example.com/images/photo.jpg" alt="Photo">',
    );
  });

  it("converts path-relative URLs to absolute", () => {
    const html = '<img src="images/photo.jpg">';
    const result = normalizeUrls(html, domain);
    expect(result).toBe('<img src="https://example.com/images/photo.jpg">');
  });

  it("leaves absolute URLs unchanged", () => {
    const html = '<a href="https://other.com/page">Link</a>';
    const result = normalizeUrls(html, domain);
    expect(result).toBe(html);
  });

  it("leaves data URIs unchanged", () => {
    const html = '<img src="data:image/png;base64,abc123">';
    const result = normalizeUrls(html, domain);
    expect(result).toBe(html);
  });

  it("leaves fragment-only links unchanged", () => {
    const html = '<a href="#section">Jump</a>';
    const result = normalizeUrls(html, domain);
    expect(result).toBe(html);
  });

  it("leaves mailto links unchanged", () => {
    const html = '<a href="mailto:test@example.com">Email</a>';
    const result = normalizeUrls(html, domain);
    expect(result).toBe(html);
  });

  it("leaves tel links unchanged", () => {
    const html = '<a href="tel:555-1234">Call</a>';
    const result = normalizeUrls(html, domain);
    expect(result).toBe(html);
  });

  it("handles protocol-relative URLs", () => {
    const html = '<img src="//cdn.example.com/img.jpg">';
    const result = normalizeUrls(html, domain);
    expect(result).toBe('<img src="https://cdn.example.com/img.jpg">');
  });

  it("handles srcset attributes with multiple entries", () => {
    const html =
      '<img srcset="/small.jpg 1x, /large.jpg 2x" src="/default.jpg">';
    const result = normalizeUrls(html, domain);
    expect(result).toContain("https://example.com/small.jpg 1x");
    expect(result).toContain("https://example.com/large.jpg 2x");
    expect(result).toContain('src="https://example.com/default.jpg"');
  });

  it("handles domain without protocol", () => {
    const html = '<a href="/page">Link</a>';
    const result = normalizeUrls(html, "example.com");
    expect(result).toBe('<a href="https://example.com/page">Link</a>');
  });

  it("returns html unchanged when no domain provided", () => {
    const html = '<a href="/page">Link</a>';
    const result = normalizeUrls(html, "");
    expect(result).toBe(html);
  });
});

// ---------------------------------------------------------------------------
// Duplicate Content Removal
// ---------------------------------------------------------------------------

describe("removeDuplicateBlocks", () => {
  it("removes identical duplicate paragraphs", () => {
    const html =
      "<p>This is a paragraph with enough content to be meaningful for dedup.</p>" +
      "<p>Another unique paragraph with different content entirely here.</p>" +
      "<p>This is a paragraph with enough content to be meaningful for dedup.</p>";
    const result = removeDuplicateBlocks(html);
    // Count occurrences of the duplicated text
    const matches = result.match(
      /This is a paragraph with enough content to be meaningful for dedup/g,
    );
    expect(matches).toHaveLength(1);
    expect(result).toContain("Another unique paragraph");
  });

  it("keeps unique blocks intact", () => {
    const html =
      "<p>First paragraph with substantial content for testing purposes.</p>" +
      "<p>Second paragraph with different content for testing purposes.</p>" +
      "<p>Third paragraph with yet more different content here today.</p>";
    const result = removeDuplicateBlocks(html);
    expect(result).toContain("First paragraph");
    expect(result).toContain("Second paragraph");
    expect(result).toContain("Third paragraph");
  });

  it("removes near-identical blocks differing only in formatting", () => {
    const html =
      '<p class="intro">Important content that should appear only once in output.</p>' +
      "<h2>Section</h2>" +
      "<p>Important content that should appear only once in output.</p>";
    const result = removeDuplicateBlocks(html);
    const matches = result.match(
      /Important content that should appear only once in output/g,
    );
    expect(matches).toHaveLength(1);
  });

  it("keeps short blocks even if duplicated (too generic to dedup)", () => {
    const html = "<p>Short.</p><p>Short.</p>";
    const result = removeDuplicateBlocks(html);
    // Short fingerprints (< 20 chars) are not deduped
    expect(result).toContain("Short.");
  });

  it("returns empty/null input unchanged", () => {
    expect(removeDuplicateBlocks("")).toBe("");
    expect(removeDuplicateBlocks("plain text no tags")).toBe(
      "plain text no tags",
    );
  });
});

// ---------------------------------------------------------------------------
// Inline Markup Cleanup
// ---------------------------------------------------------------------------

describe("cleanInlineMarkup", () => {
  it("unwraps plain <span> elements", () => {
    const html = "<p><span>Hello world</span></p>";
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p>Hello world</p>");
  });

  it("unwraps <span> with class attribute", () => {
    const html = '<p><span class="text-red">Hello</span></p>';
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p>Hello</p>");
  });

  it("unwraps nested spans", () => {
    const html = "<p><span><span>Deep text</span></span></p>";
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p>Deep text</p>");
  });

  it("flattens double-wrapped <strong>", () => {
    const html = "<p><strong><strong>Bold text</strong></strong></p>";
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p><strong>Bold text</strong></p>");
  });

  it("flattens double-wrapped <em>", () => {
    const html = "<p><em><em>Italic text</em></em></p>";
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p><em>Italic text</em></p>");
  });

  it("normalizes <b> to <strong> and <i> to <em>", () => {
    const html = "<p><b>Bold</b> and <i>italic</i></p>";
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p><strong>Bold</strong> and <em>italic</em></p>");
  });

  it("removes empty inline elements", () => {
    const html = "<p>Text<span></span> more<strong> </strong>end</p>";
    const result = cleanInlineMarkup(html);
    expect(result).not.toContain("<span>");
    expect(result).not.toContain("<strong>");
    expect(result).toContain("Text");
    expect(result).toContain("end");
  });

  it("handles complex nested inline markup", () => {
    const html =
      '<p><span class="x"><strong><span>Deep bold</span></strong></span></p>';
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p><strong>Deep bold</strong></p>");
  });

  it("preserves inline content structure", () => {
    const html = "<p><strong>Bold</strong> and <em>italic</em> text</p>";
    const result = cleanInlineMarkup(html);
    expect(result).toBe("<p><strong>Bold</strong> and <em>italic</em> text</p>");
  });
});

// ---------------------------------------------------------------------------
// Heading Normalization
// ---------------------------------------------------------------------------

describe("normalizeHeadings", () => {
  it("converts second H1 to H2", () => {
    const html = "<h1>Main Title</h1><p>Intro.</p><h1>Another H1</h1><p>Body.</p>";
    const result = normalizeHeadings(html);
    expect(result).toContain("<h1>Main Title</h1>");
    expect(result).toContain("<h2>Another H1</h2>");
    // Should not have two h1 tags
    const h1Count = (result.match(/<h1/g) || []).length;
    expect(h1Count).toBe(1);
  });

  it("converts multiple extra H1s to H2", () => {
    const html =
      "<h1>First</h1><h1>Second</h1><h1>Third</h1>";
    const result = normalizeHeadings(html);
    expect(result).toContain("<h1>First</h1>");
    expect(result).toContain("<h2>Second</h2>");
    expect(result).toContain("<h2>Third</h2>");
  });

  it("preserves single H1 unchanged", () => {
    const html = "<h1>Only Title</h1><h2>Section</h2><p>Content.</p>";
    const result = normalizeHeadings(html);
    expect(result).toBe(html);
  });

  it("fixes heading hierarchy gaps (H2 → H4 becomes H2 → H3)", () => {
    const html = "<h2>Section</h2><p>Text.</p><h4>Subsection</h4><p>More.</p>";
    const result = normalizeHeadings(html);
    expect(result).toContain("<h3>Subsection</h3>");
    expect(result).not.toContain("<h4>");
  });

  it("handles no headings gracefully", () => {
    const html = "<p>Just a paragraph.</p>";
    const result = normalizeHeadings(html);
    expect(result).toBe(html);
  });

  it("preserves correct hierarchy", () => {
    const html =
      "<h2>Main</h2><h3>Sub</h3><h4>Sub-sub</h4><h2>Next main</h2>";
    const result = normalizeHeadings(html);
    expect(result).toBe(html);
  });
});

// ---------------------------------------------------------------------------
// Low-Quality Section Removal
// ---------------------------------------------------------------------------

describe("removeEmptySections", () => {
  it("drops sections with less than 50 characters", () => {
    const sections = [
      "<h2>Real Section</h2><p>This section has enough content to be meaningful and useful for visitors.</p>",
      "<h2>Tiny</h2><p>Short.</p>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Real Section");
  });

  it("drops sections with no paragraph content", () => {
    const sections = [
      "<h2>A Section With Only A Heading And No Paragraph Content At All Here</h2>",
      "<h2>Good Section</h2><p>This section has a proper paragraph with meaningful content for readers.</p>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Good Section");
  });

  it("keeps sections with lists as content", () => {
    const sections = [
      "<h2>Items List</h2><ul><li>Item one with some content</li><li>Item two with some more content here</li></ul>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(1);
  });

  it("keeps sections with tables as content", () => {
    const sections = [
      "<h2>Data Table</h2><table><tr><td>Cell content here is meaningful</td><td>More data to make it long enough</td></tr></table>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(1);
  });

  it("keeps sections with blockquotes as content", () => {
    const sections = [
      "<h2>Quote</h2><blockquote>A substantial quote with enough content to pass the threshold check here.</blockquote>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(1);
  });

  it("never removes all sections (safety net)", () => {
    const sections = ["<h2>Short</h2>", "<h2>Also short</h2>"];
    const result = removeEmptySections(sections);
    // Should return originals since filtering would empty the array
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(removeEmptySections([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeHtml orchestrator
// ---------------------------------------------------------------------------

describe("normalizeHtml (orchestrator)", () => {
  it("applies URL normalization when sourceDomain provided", () => {
    const html = '<p><a href="/page">Link</a></p>';
    const result = normalizeHtml(html, {
      sourceDomain: "https://example.com",
    });
    expect(result).toContain("https://example.com/page");
  });

  it("skips URL normalization when no sourceDomain", () => {
    const html = '<p><a href="/page">Link</a></p>';
    const result = normalizeHtml(html);
    expect(result).toContain('href="/page"');
  });

  it("applies all cleanup steps in sequence", () => {
    const html =
      '<h1>Title</h1><h1>Duplicate H1</h1>' +
      '<p><span class="x"><b>Bold text</b></span></p>' +
      '<p><a href="/about">About</a></p>';
    const result = normalizeHtml(html, {
      sourceDomain: "https://example.com",
    });

    // Inline cleanup: span unwrapped, b→strong
    expect(result).toContain("<strong>Bold text</strong>");
    expect(result).not.toContain("<span");
    expect(result).not.toContain("<b>");

    // Heading normalization: second H1→H2
    expect(result).toContain("<h2>Duplicate H1</h2>");

    // URL normalization
    expect(result).toContain("https://example.com/about");
  });

  it("returns empty/blank input unchanged", () => {
    expect(normalizeHtml("")).toBe("");
    expect(normalizeHtml("  ")).toBe("  ");
  });
});

// ---------------------------------------------------------------------------
// Integration: removeEmptySections in full pipeline
// ---------------------------------------------------------------------------

describe("Full pipeline drops low-quality sections", () => {
  it("drops heading-only sections after FAQ removal", () => {
    const source: SourceRecord = {
      title: "Test Page",
      url: "/practice-areas/test/",
      body:
        "<h2>Real Content</h2><p>This is a substantive section with enough real content to pass quality filters and be kept in the output.</p>" +
        "<h2>Empty After FAQ</h2>" +
        '<h3>Is this a question?</h3><p>Yes, this is the answer to that question.</p>' +
        '<h3>Another question here?</h3><p>And another answer for this question too.</p>',
    };
    const columns = Object.keys(source);
    const config = autoMapFields(columns, "practice");
    const prepared = prepareRecords([source], config, "practice");
    const result = prepared[0].current as TransformedPracticePage;
    const sections = (result.content as Record<string, any>)
      .contentSections as any[];

    // The "Empty After FAQ" section should be dropped (only heading remains after FAQ extraction)
    for (const s of sections) {
      const plain = (s.body as string).replace(/<[^>]*>/g, "").trim();
      expect(plain.length).toBeGreaterThan(40);
    }
  });
});

// ===========================================================================
// Content Filter Tests (extractMainContent + filterSecondaryContent)
// ===========================================================================

// ---------------------------------------------------------------------------
// extractMainContent
// ---------------------------------------------------------------------------

describe("extractMainContent", () => {
  it("strips full HTML document shell (DOCTYPE, html, head, body)", () => {
    const html =
      '<!DOCTYPE html><html lang="en"><head><title>Test</title><style>.x{color:red}</style></head>' +
      '<body class="page"><h2>Content</h2><p>Real content here.</p></body></html>';
    const result = extractMainContent(html);
    expect(result).not.toContain("<!DOCTYPE");
    expect(result).not.toContain("<html");
    expect(result).not.toContain("<head");
    expect(result).not.toContain("<title>");
    expect(result).not.toContain("<style>");
    expect(result).not.toContain("<body");
    expect(result).toContain("Content");
    expect(result).toContain("Real content here.");
  });

  it("removes script, style, noscript tags entirely", () => {
    const html =
      '<script>var x = 1;</script><p>Keep this.</p>' +
      '<style>.hide{display:none}</style><noscript>Enable JS</noscript>';
    const result = extractMainContent(html);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("var x");
    expect(result).not.toContain("<style");
    expect(result).not.toContain("<noscript");
    expect(result).toContain("Keep this.");
  });

  it("removes HTML comments", () => {
    const html = "<!-- wp:paragraph --><p>Content here.</p><!-- /wp:paragraph -->";
    const result = extractMainContent(html);
    expect(result).not.toContain("<!--");
    expect(result).toContain("Content here.");
  });

  it("unwraps Divi builder layout containers", () => {
    const html =
      '<div class="et_pb_section et_pb_section_0">' +
      '<div class="et_pb_row et_pb_row_0">' +
      '<div class="et_pb_column et_pb_column_4_4">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Section Title</h2><p>The actual content lives here inside Divi wrappers.</p>" +
      "</div></div></div></div>";
    const result = extractMainContent(html);
    expect(result).toContain("Section Title");
    expect(result).toContain("The actual content lives here");
    // Should not contain builder class names
    expect(result).not.toContain("et_pb_section");
    expect(result).not.toContain("et_pb_row");
    expect(result).not.toContain("et_pb_column");
  });

  it("unwraps Elementor layout containers", () => {
    const html =
      '<div class="elementor-section elementor-section-boxed">' +
      '<div class="elementor-container">' +
      '<div class="elementor-widget-container">' +
      "<h2>Elementor Content</h2><p>This is Elementor-generated content with enough text here.</p>" +
      "</div></div></div>";
    const result = extractMainContent(html);
    expect(result).toContain("Elementor Content");
    expect(result).toContain("Elementor-generated content");
    expect(result).not.toContain("elementor-section");
  });

  it("unwraps generic layout wrapper divs (container, wrapper, row)", () => {
    const html =
      '<div id="page-container">' +
      '<div class="content-wrapper">' +
      '<div class="row">' +
      "<h2>Generic Theme</h2><p>Content from a custom WordPress theme with standard layout classes.</p>" +
      "</div></div></div>";
    const result = extractMainContent(html);
    expect(result).toContain("Generic Theme");
    expect(result).toContain("custom WordPress theme");
    expect(result).not.toContain("page-container");
    expect(result).not.toContain("content-wrapper");
  });

  it("preserves content inside builder content containers (et_pb_text_inner)", () => {
    const html =
      '<div class="et_pb_text_inner">' +
      "<h2>Preserved</h2><p>This content should survive extraction from the inner container.</p>" +
      "</div>";
    const result = extractMainContent(html);
    expect(result).toContain("Preserved");
    expect(result).toContain("This content should survive");
  });

  it("strips non-semantic attributes from remaining elements", () => {
    const html =
      '<div class="custom-class" id="my-div" data-track="yes" style="color:red">' +
      "<p>Content paragraph with meaningful text for the reader.</p></div>";
    const result = extractMainContent(html);
    expect(result).toContain("Content paragraph");
    expect(result).not.toContain("custom-class");
    expect(result).not.toContain("data-track");
    expect(result).not.toContain("style=");
  });

  it("handles already-clean semantic HTML (no wrappers to unwrap)", () => {
    const html =
      "<h2>Clean Content</h2><p>Already clean HTML with no builder wrappers.</p>" +
      "<ul><li>Item one</li><li>Item two</li></ul>";
    const result = extractMainContent(html);
    expect(result).toContain("<h2>Clean Content</h2>");
    expect(result).toContain("Already clean HTML");
    expect(result).toContain("<li>Item one</li>");
  });

  it("returns empty/blank input unchanged", () => {
    expect(extractMainContent("")).toBe("");
    expect(extractMainContent("  ")).toBe("  ");
  });

  it("handles deeply nested builder markup (multiple levels)", () => {
    const html =
      '<div class="et_pb_section">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column">' +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Deep Content</h2>" +
      "<p>Content buried under five levels of Divi wrappers should still be extracted.</p>" +
      "</div></div></div></div></div>";
    const result = extractMainContent(html);
    expect(result).toContain("Deep Content");
    expect(result).toContain("five levels of Divi wrappers");
  });
});

// ---------------------------------------------------------------------------
// filterSecondaryContent
// ---------------------------------------------------------------------------

describe("filterSecondaryContent", () => {
  it("removes 'Contact Us' sidebar block entirely (heading + content)", () => {
    const html =
      "<h2>Main Article</h2><p>This is the main article content with important legal information for visitors.</p>" +
      '<h2>Contact Us</h2><p>Call us at 555-123-4567</p><p><a href="mailto:info@firm.com">Email us</a></p>';
    const result = filterSecondaryContent(html, {
      templateType: "practice",
      removeContactBlocks: true,
    });
    expect(result.html).toContain("Main Article");
    expect(result.html).toContain("main article content");
    expect(result.html).not.toContain("Contact Us");
    expect(result.html).not.toContain("555-123-4567");
    expect(result.removed.length).toBeGreaterThan(0);
    expect(result.removed[0].reason).toMatch(/contact/i);
  });

  it("removes form blocks with nf-form-cont", () => {
    const html =
      "<h2>Important Info</h2><p>This section has substantive legal content about the practice area for readers.</p>" +
      '<h2>Get Help</h2><div class="nf-form-cont"><input type="text" name="name"><input type="email" name="email"><button type="submit">Send</button></div>';
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("Important Info");
    expect(result.html).not.toContain("nf-form-cont");
    expect(result.removed.some((r) => r.reason === "form-block")).toBe(true);
  });

  it("removes form blocks with <form> tag", () => {
    const html =
      "<h2>Content Section</h2><p>Substantial paragraph with meaningful legal content for the practice area page.</p>" +
      "<h2>Contact Form</h2><form action='/submit'><input type='text'><textarea></textarea><button>Submit</button></form>";
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("Content Section");
    expect(result.html).not.toContain("<form");
    expect(result.removed.some((r) => r.reason === "form-block")).toBe(true);
  });

  it("removes location/address blocks when removeContactBlocks is true", () => {
    const html =
      "<h2>Our Services</h2><p>We provide comprehensive legal services across multiple practice areas for clients.</p>" +
      "<h2>In Atlanta</h2><p>123 Main St, Atlanta, GA 30301</p><p>Call: 404-555-1234</p><p><a href='mailto:info@firm.com'>Email</a></p>";
    const result = filterSecondaryContent(html, {
      templateType: "practice",
      removeContactBlocks: true,
    });
    expect(result.html).toContain("Our Services");
    expect(result.html).not.toContain("In Atlanta");
    expect(result.html).not.toContain("123 Main St");
  });

  it("removes 'Recent Posts' heading + article listing", () => {
    const html =
      "<h2>Article Content</h2><p>Main content with enough text to be considered substantial and meaningful here.</p>" +
      "<h2>Recent Posts</h2>" +
      '<article class="post-123"><h3>Blog Post 1</h3></article>' +
      '<article class="post-456"><h3>Blog Post 2</h3></article>';
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("Article Content");
    expect(result.html).not.toContain("Recent Posts");
    expect(result.html).not.toContain("Blog Post 1");
  });

  it("removes high link-density navigation blocks", () => {
    const html =
      "<h2>Main Content</h2><p>Substantive paragraph with meaningful legal information for readers to understand.</p>" +
      "<h2>Related Links</h2>" +
      '<a href="/a">Link 1</a><a href="/b">Link 2</a><a href="/c">Link 3</a><a href="/d">Link 4</a>';
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("Main Content");
    expect(result.html).not.toContain("Related Links");
  });

  it("preserves main article content with H2 + paragraphs", () => {
    const html =
      "<h2>Understanding Personal Injury Law</h2>" +
      "<p>Personal injury law covers a wide range of cases including car accidents, slip and fall incidents, and medical malpractice claims. " +
      "Understanding your rights is the first step to getting the compensation you deserve for your injuries and damages.</p>" +
      "<h2>Types of Claims</h2>" +
      "<p>There are many different types of personal injury claims that our attorneys handle on a regular basis for our clients.</p>";
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("Understanding Personal Injury Law");
    expect(result.html).toContain("Types of Claims");
    expect(result.removed).toHaveLength(0);
  });

  it("preserves FAQ-like H3 + answer blocks", () => {
    const html =
      "<h2>Common Questions</h2>" +
      "<h3>What is personal injury law?</h3><p>Personal injury law covers physical and emotional harm caused by another party's negligence.</p>" +
      "<h3>How long do I have to file?</h3><p>The statute of limitations varies by state but is typically between one and three years.</p>";
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("What is personal injury law?");
    expect(result.html).toContain("How long do I have to file?");
  });

  it("preserves intro content before first heading", () => {
    const html =
      "<p>This introductory paragraph appears before any headings and should always be preserved.</p>" +
      "<h2>Contact Us</h2><p>Short contact widget text.</p>";
    const result = filterSecondaryContent(html, { removeContactBlocks: true });
    expect(result.html).toContain("introductory paragraph");
  });

  it("never removes all content (safety net)", () => {
    const html =
      "<h2>Contact Us</h2><p>Short contact.</p>";
    const result = filterSecondaryContent(html, { removeContactBlocks: true });
    // Since removing everything would leave empty, the safety net keeps it
    expect(result.html.length).toBeGreaterThan(0);
  });

  it("supports custom extraSecondaryHeadings patterns", () => {
    const html =
      "<h2>Main Content</h2><p>Important legal information about personal injury cases and how we can help.</p>" +
      "<h2>Office Hours</h2><p>Mon-Fri 9am-5pm, Sat by appointment.</p>";
    const result = filterSecondaryContent(html, {
      extraSecondaryHeadings: [/^office\s+hours$/i],
    });
    expect(result.html).toContain("Main Content");
    expect(result.html).not.toContain("Office Hours");
  });

  it("supports custom extraDetectors", () => {
    const html =
      "<h2>Main Content</h2><p>Substantive legal content about the practice area for our visitors and clients.</p>" +
      "<h2>Map</h2><p>View our location on the map below for directions.</p>";
    const result = filterSecondaryContent(html, {
      extraDetectors: [
        (heading) =>
          /^map$/i.test(heading) ? "map-widget" : null,
      ],
    });
    expect(result.html).toContain("Main Content");
    expect(result.html).not.toContain("Map");
    expect(result.removed.some((r) => r.reason === "map-widget")).toBe(true);
  });

  it("returns empty input unchanged", () => {
    const result = filterSecondaryContent("");
    expect(result.html).toBe("");
    expect(result.removed).toHaveLength(0);
  });

  it("removes comment sections", () => {
    const html =
      "<h2>Article</h2><p>Article content with enough text to be meaningful and substantive for readers here.</p>" +
      "<h2>Leave a Reply</h2><form><textarea></textarea><button>Post</button></form>";
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("Article");
    expect(result.html).not.toContain("Leave a Reply");
  });

  it("removes newsletter/subscribe widgets", () => {
    const html =
      "<h2>Legal Services</h2><p>Our firm provides comprehensive legal representation across many different practice areas.</p>" +
      "<h2>Subscribe</h2><p>Sign up for our newsletter.</p><input type='email'><input type='text'><button>Subscribe</button>";
    const result = filterSecondaryContent(html);
    expect(result.html).toContain("Legal Services");
    expect(result.html).not.toContain("Subscribe");
  });
});

// ---------------------------------------------------------------------------
// Enhanced removeEmptySections: heading-only + low-paragraph cleanup
// ---------------------------------------------------------------------------

describe("removeEmptySections — enhanced cleanup", () => {
  it("drops sections that contain only a heading + tiny paragraph", () => {
    const sections = [
      "<h2>Good Section</h2><p>This section has enough substantial paragraph content to pass the quality filters.</p>",
      "<h2>Weak Section</h2><p>Too short.</p>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("Good Section");
  });

  it("keeps sections with substantial paragraph content after heading", () => {
    const sections = [
      "<h2>Section One</h2><p>This paragraph has enough content to pass quality thresholds and be useful.</p>",
      "<h2>Section Two</h2><p>Another good paragraph with meaningful content for the visitors to read and learn from.</p>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(2);
  });

  it("keeps sections with list content even if paragraph text is short", () => {
    const sections = [
      "<h2>Items</h2><p>See below:</p><ul><li>First item with content</li><li>Second item with content</li></ul>",
    ];
    const result = removeEmptySections(sections);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Integration: extractMainContent + filterSecondaryContent in normalizeHtml
// ---------------------------------------------------------------------------

describe("normalizeHtml with content extraction and filtering", () => {
  it("strips page shell and normalizes in one pass", () => {
    const html =
      '<!DOCTYPE html><html><head><title>Page</title></head><body>' +
      '<div class="wrapper"><h2>Content</h2><p>Main paragraph with <b>bold</b> and a <a href="/link">link</a>.</p></div>' +
      "</body></html>";
    const result = normalizeHtml(html, {
      sourceDomain: "https://example.com",
    });
    expect(result).not.toContain("<!DOCTYPE");
    expect(result).not.toContain("<html");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("https://example.com/link");
  });

  it("skips content extraction when skipContentExtraction is true", () => {
    const html = '<div class="et_pb_section"><p>Content here.</p></div>';
    const result = normalizeHtml(html, { skipContentExtraction: true });
    // The et_pb_section class should be cleaned by inline cleanup but div should remain
    expect(result).toContain("Content here.");
  });

  it("filters secondary content when filterOptions provided", () => {
    const html =
      "<h2>Main Article</h2><p>Substantive legal content with enough text to pass quality filters and be useful to readers.</p>" +
      '<h2>Contact Us</h2><p>Call 404-555-1234</p><p><a href="mailto:info@firm.com">Email</a></p>';
    const result = normalizeHtml(html, {
      filterOptions: { templateType: "practice", removeContactBlocks: true },
    });
    expect(result).toContain("Main Article");
    expect(result).not.toContain("Contact Us");
  });
});

// ---------------------------------------------------------------------------
// Integration: Full Divi HTML through pipeline
// ---------------------------------------------------------------------------

describe("Full Divi HTML integration", () => {
  it("extracts clean content from Divi-wrapped practice page HTML", () => {
    const diviHtml =
      '<!DOCTYPE html><html><head><title>PI Lawyer</title><style>.et_pb{margin:0}</style></head>' +
      '<body class="et_pb_pagebuilder_layout">' +
      '<div id="page-container">' +
      '<div id="et-main-area">' +
      '<div class="et_pb_section et_pb_section_0">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column et_pb_column_4_4">' +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Understanding Car Accidents</h2>" +
      "<p>Car accidents are one of the most common causes of personal injury claims in the United States.</p>" +
      "</div></div></div></div></div>" +
      '<div class="et_pb_section et_pb_section_1">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column et_pb_column_4_4">' +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Types of Injuries</h2>" +
      "<p>Common injuries from car accidents include whiplash, broken bones, and traumatic brain injuries.</p>" +
      "</div></div></div></div></div>" +
      '<div class="et_pb_section et_pb_section_2">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column et_pb_column_4_4">' +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Contact Us</h2>" +
      '<p>Call us at <a href="tel:404-555-1234">404-555-1234</a></p>' +
      '<p><a href="mailto:info@firm.com">info@firm.com</a></p>' +
      "</div></div></div></div></div>" +
      '<div class="et_pb_section et_pb_section_3">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column">' +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Recent Posts</h2>" +
      '<article class="post-101"><h3>Blog Post Title</h3></article>' +
      '<article class="post-102"><h3>Another Post</h3></article>' +
      "</div></div></div></div></div>" +
      "</div></div></body></html>";

    const result = normalizeHtml(diviHtml, {
      filterOptions: { templateType: "practice", removeContactBlocks: true },
    });

    // Main content should survive
    expect(result).toContain("Understanding Car Accidents");
    expect(result).toContain("common causes of personal injury");
    expect(result).toContain("Types of Injuries");
    expect(result).toContain("whiplash, broken bones");

    // Secondary content should be removed
    expect(result).not.toContain("Contact Us");
    expect(result).not.toContain("404-555-1234");
    expect(result).not.toContain("Recent Posts");
    expect(result).not.toContain("Blog Post Title");

    // No builder classes should remain
    expect(result).not.toContain("et_pb_section");
    expect(result).not.toContain("et_pb_row");
    expect(result).not.toContain("page-container");

    // No document shell
    expect(result).not.toContain("<!DOCTYPE");
    expect(result).not.toContain("<html");
    expect(result).not.toContain("<style");
  });
});

// ===========================================================================
// Divi 2-Column Layout Tests (depth-tracking + column detection)
// ===========================================================================

describe("Divi 2-column layout: extractMainColumn via extractMainContent", () => {
  it("keeps 2/3 main column and removes 1/3 sidebar column", () => {
    const html =
      '<div class="et_pb_section">' +
      '<div class="et_pb_row">' +
      // Main column (2/3 width)
      '<div class="et_pb_column et_pb_column_2_3">' +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Understanding Personal Injury Claims</h2>" +
      "<p>Personal injury law covers a wide range of situations where individuals suffer harm due to another party's negligence or intentional actions.</p>" +
      "</div></div>" +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Types of Compensation</h2>" +
      "<p>Victims may be entitled to various forms of compensation including medical expenses, lost wages, and pain and suffering damages.</p>" +
      "</div></div>" +
      "</div>" +
      // Sidebar column (1/3 width)
      '<div class="et_pb_column et_pb_column_1_3">' +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h4>Contact US</h4>" +
      '<p>123 Main St, Marietta, GA 30060</p><p>Call: <a href="tel:770-555-1234">770-555-1234</a></p>' +
      '<p><a href="mailto:info@firm.com">info@firm.com</a></p>' +
      "</div></div>" +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h4>Recent Posts</h4>" +
      "<ul><li><a href='/blog/post-1'>Understanding Car Accident Claims</a></li>" +
      "<li><a href='/blog/post-2'>What To Do After a Slip and Fall</a></li>" +
      "<li><a href='/blog/post-3'>Workers Comp FAQ</a></li></ul>" +
      "</div></div>" +
      '<div class="et_pb_module et_pb_text">' +
      '<div class="et_pb_text_inner">' +
      "<h4>In Marietta &amp; Cobb County</h4>" +
      "<p>Serving the greater Cobb County area including Kennesaw, Acworth, and Smyrna.</p>" +
      "</div></div>" +
      "</div>" +
      "</div></div>";

    const result = extractMainContent(html);

    // Main content should survive
    expect(result).toContain("Understanding Personal Injury Claims");
    expect(result).toContain("negligence or intentional actions");
    expect(result).toContain("Types of Compensation");
    expect(result).toContain("medical expenses, lost wages");

    // Sidebar content should be removed
    expect(result).not.toContain("Contact US");
    expect(result).not.toContain("770-555-1234");
    expect(result).not.toContain("Recent Posts");
    expect(result).not.toContain("Understanding Car Accident Claims");
    expect(result).not.toContain("In Marietta");
    expect(result).not.toContain("Cobb County");
  });

  it("keeps 3/4 main column and removes 1/4 sidebar column", () => {
    const html =
      '<div class="et_pb_section">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column et_pb_column_3_4">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Main Content Area</h2>" +
      "<p>This is the primary content in a three-quarters width column with substantial legal information.</p>" +
      "</div></div>" +
      '<div class="et_pb_column et_pb_column_1_4">' +
      '<div class="et_pb_text_inner">' +
      "<h4>Sidebar Widget</h4>" +
      "<p>Call us today for a free consultation.</p>" +
      "</div></div>" +
      "</div></div>";

    const result = extractMainContent(html);

    expect(result).toContain("Main Content Area");
    expect(result).toContain("primary content");
    expect(result).not.toContain("Sidebar Widget");
    expect(result).not.toContain("free consultation");
  });
});

describe("Depth-tracking: deeply nested Divi divs", () => {
  it("correctly unwraps 8+ levels of nested Divi divs", () => {
    const html =
      '<div class="et_pb_section et_pb_section_0">' +
      '<div class="et_pb_row et_pb_row_0">' +
      '<div class="et_pb_column et_pb_column_4_4">' +
      '<div class="et_pb_module et_pb_text et_pb_text_0">' +
      '<div class="et_pb_text_inner">' +
      '<div class="custom-wrapper">' +
      '<div class="inner-content">' +
      '<div class="deep-div">' +
      "<h2>Deeply Nested Content Title</h2>" +
      "<p>This content is nested 8 levels deep inside Divi builder markup and should still be extracted correctly.</p>" +
      "</div></div></div></div></div></div></div></div>";

    const result = extractMainContent(html);

    expect(result).toContain("Deeply Nested Content Title");
    expect(result).toContain("nested 8 levels deep");
    // No builder classes should remain
    expect(result).not.toContain("et_pb_section");
    expect(result).not.toContain("et_pb_row");
    expect(result).not.toContain("et_pb_column");
    expect(result).not.toContain("et_pb_text_inner");
  });

  it("handles multiple content blocks at different nesting levels", () => {
    const html =
      '<div class="et_pb_section">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column et_pb_column_4_4">' +
      '<div class="et_pb_text_inner">' +
      "<h2>First Section</h2><p>Content of first section with enough text to be substantial.</p>" +
      "</div></div></div></div>" +
      '<div class="et_pb_section">' +
      '<div class="et_pb_row">' +
      '<div class="et_pb_column et_pb_column_4_4">' +
      '<div class="et_pb_module">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Second Section</h2><p>Content of second section at a deeper nesting level than the first.</p>" +
      "</div></div></div></div></div>";

    const result = extractMainContent(html);

    expect(result).toContain("First Section");
    expect(result).toContain("Content of first section");
    expect(result).toContain("Second Section");
    expect(result).toContain("Content of second section");
  });
});

describe("Full Divi 2-column page through normalizeHtml pipeline", () => {
  it("extracts only main column content and filters sidebar widgets", () => {
    const fullDiviPage =
      '<!DOCTYPE html><html><head><title>PI Law</title></head>' +
      '<body class="et_pb_pagebuilder_layout">' +
      '<div id="page-container"><div id="et-main-area">' +
      // Row with 2/3 + 1/3 columns
      '<div class="et_pb_section">' +
      '<div class="et_pb_row">' +
      // Main column
      '<div class="et_pb_column et_pb_column_2_3">' +
      '<div class="et_pb_module et_pb_text"><div class="et_pb_text_inner">' +
      "<h2>Car Accident Attorneys</h2>" +
      "<p>Our experienced car accident attorneys have been fighting for victims' rights for over twenty years in the greater Atlanta metropolitan area.</p>" +
      "</div></div>" +
      '<div class="et_pb_module et_pb_text"><div class="et_pb_text_inner">' +
      "<h2>What To Do After an Accident</h2>" +
      "<p>The first thing you should do after a car accident is seek medical attention, even if you feel fine initially. Many injuries do not present symptoms right away.</p>" +
      "</div></div>" +
      "</div>" +
      // Sidebar column
      '<div class="et_pb_column et_pb_column_1_3">' +
      '<div class="et_pb_module et_pb_text"><div class="et_pb_text_inner">' +
      "<h4>Contact US</h4>" +
      '<form class="nf-form-cont"><input type="text" name="name"><input type="email" name="email"><textarea name="message"></textarea><button type="submit">Send</button></form>' +
      "</div></div>" +
      '<div class="et_pb_module et_pb_text"><div class="et_pb_text_inner">' +
      "<h4>Our Locations</h4>" +
      "<p>456 Peachtree St NE, Atlanta, GA 30308</p>" +
      '<p><a href="tel:404-555-9876">404-555-9876</a></p>' +
      "</div></div>" +
      '<div class="et_pb_module et_pb_text"><div class="et_pb_text_inner">' +
      "<h4>Recent Posts</h4>" +
      "<ul><li><a href='/blog/1'>How to File a Claim</a></li><li><a href='/blog/2'>Understanding Damages</a></li></ul>" +
      "</div></div>" +
      "</div>" +
      "</div></div>" +
      "</div></div></body></html>";

    const result = normalizeHtml(fullDiviPage, {
      filterOptions: { templateType: "practice", removeContactBlocks: true },
    });

    // Main content should survive
    expect(result).toContain("Car Accident Attorneys");
    expect(result).toContain("fighting for victims");
    expect(result).toContain("What To Do After an Accident");
    expect(result).toContain("seek medical attention");

    // Sidebar content should be completely removed (by column detection)
    expect(result).not.toContain("Contact US");
    expect(result).not.toContain("nf-form-cont");
    expect(result).not.toContain("Our Locations");
    expect(result).not.toContain("404-555-9876");
    expect(result).not.toContain("Recent Posts");
    expect(result).not.toContain("How to File a Claim");

    // No builder markup
    expect(result).not.toContain("et_pb_");
    expect(result).not.toContain("page-container");
    expect(result).not.toContain("<!DOCTYPE");
  });

  it("blog post H2 titles from Recent Posts widget do NOT become content sections", () => {
    const html =
      '<div class="et_pb_section"><div class="et_pb_row">' +
      '<div class="et_pb_column et_pb_column_2_3">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Understanding Workers Compensation</h2>" +
      "<p>Workers compensation provides benefits to employees who are injured or become ill as a result of their job duties and responsibilities.</p>" +
      "</div></div>" +
      '<div class="et_pb_column et_pb_column_1_3">' +
      '<div class="et_pb_text_inner">' +
      "<h2>Recent Posts</h2>" +
      '<article class="post-201"><h3>Filing a Workers Comp Claim</h3><p>Learn how to file your claim quickly.</p></article>' +
      '<article class="post-202"><h3>Top 5 Workplace Injuries</h3><p>The most common injuries at work.</p></article>' +
      "</div></div>" +
      "</div></div>";

    const result = extractMainContent(html);

    // Main content survives
    expect(result).toContain("Understanding Workers Compensation");
    expect(result).toContain("benefits to employees");

    // Blog post titles from sidebar should NOT appear
    expect(result).not.toContain("Recent Posts");
    expect(result).not.toContain("Filing a Workers Comp Claim");
    expect(result).not.toContain("Top 5 Workplace Injuries");
  });
});

describe("h3-h6 sidebar headings in filterSecondaryContent", () => {
  it("removes blocks with h4 'Contact US' heading when in pre-heading content", () => {
    const html =
      "<h2>Main Legal Content</h2>" +
      "<p>This section covers the primary legal information about personal injury cases and claims process.</p>" +
      "<h4>Contact US</h4>" +
      '<p>Call 770-555-1234</p><p><a href="mailto:info@firm.com">Email us</a></p>';

    const result = filterSecondaryContent(html, {
      templateType: "practice",
      removeContactBlocks: true,
    });

    expect(result.html).toContain("Main Legal Content");
    expect(result.html).toContain("primary legal information");
    // The h4 Contact US sub-section should be stripped from the H2 block
    expect(result.html).not.toContain("Contact US");
  });

  it("removes standalone h4 Recent Posts blocks (no parent h2) when preceded by real content", () => {
    const html =
      "<h2>Legal Services Overview</h2>" +
      "<p>Our firm provides comprehensive legal representation for clients across the metropolitan area in many practice areas.</p>" +
      "<h4>Recent Posts</h4>" +
      "<ul><li><a href='/p1'>Post One Title Here</a></li><li><a href='/p2'>Post Two Title Here</a></li>" +
      "<li><a href='/p3'>Post Three Title Here</a></li><li><a href='/p4'>Post Four Title Here</a></li>" +
      "<li><a href='/p5'>Post Five Title Here</a></li></ul>";

    const result = filterSecondaryContent(html);

    // Main content kept
    expect(result.html).toContain("Legal Services Overview");
    expect(result.html).toContain("comprehensive legal representation");
    // H4 Recent Posts sub-section stripped
    expect(result.html).not.toContain("Recent Posts");
    expect(result.html).not.toContain("Post One Title Here");
  });

  it("strips h4 Recent Posts + link list from inside an H2 block", () => {
    const html =
      "<h2>Workers Compensation Benefits</h2>" +
      "<p>Workers compensation provides essential benefits to employees who are injured on the job. " +
      "Our attorneys have decades of experience handling these complex claims and getting results.</p>" +
      "<h4>Recent Posts</h4>" +
      "<ul>" +
      "<li><a href='/blog/filing-a-claim'>Filing a Workers Comp Claim</a></li>" +
      "<li><a href='/blog/top-injuries'>Top 5 Workplace Injuries</a></li>" +
      "<li><a href='/blog/benefits-guide'>Benefits Guide 2024</a></li>" +
      "</ul>";

    const result = filterSecondaryContent(html);

    expect(result.html).toContain("Workers Compensation Benefits");
    expect(result.html).toContain("essential benefits to employees");
    expect(result.html).not.toContain("Recent Posts");
    expect(result.html).not.toContain("Filing a Workers Comp Claim");
    expect(result.html).not.toContain("Top 5 Workplace Injuries");
  });
});

// ---------------------------------------------------------------------------
// removeEmptyElements — final cleanup pass
// ---------------------------------------------------------------------------

describe("removeEmptyElements", () => {
  it("removes empty <div></div> elements", () => {
    const html = "<p>Hello</p><div></div><p>World</p>";
    expect(removeEmptyElements(html)).toBe("<p>Hello</p><p>World</p>");
  });

  it("removes <div> with only whitespace", () => {
    const html = "<p>Hello</p><div>   </div><p>World</p>";
    expect(removeEmptyElements(html)).toBe("<p>Hello</p><p>World</p>");
  });

  it("removes <div> with only &nbsp;", () => {
    const html = "<p>Hello</p><div>&nbsp;</div><p>World</p>";
    expect(removeEmptyElements(html)).toBe("<p>Hello</p><p>World</p>");
  });

  it("removes <div> with only <br>", () => {
    const html = "<p>Hello</p><div><br></div><p>World</p>";
    expect(removeEmptyElements(html)).toBe("<p>Hello</p><p>World</p>");
  });

  it("removes <div><br />&nbsp;</div> combination", () => {
    const html = "<p>Keep</p><div><br />&nbsp; </div><p>Also keep</p>";
    expect(removeEmptyElements(html)).toBe("<p>Keep</p><p>Also keep</p>");
  });

  it("cascade-removes nested empty divs", () => {
    // After removing inner empty div, outer becomes empty too
    const html = "<p>Before</p><div><div></div></div><p>After</p>";
    expect(removeEmptyElements(html)).toBe("<p>Before</p><p>After</p>");
  });

  it("removes empty <p> and <span> elements", () => {
    const html = "<p>Content</p><p></p><span></span><p>More</p>";
    expect(removeEmptyElements(html)).toBe("<p>Content</p><p>More</p>");
  });

  it("preserves non-empty elements", () => {
    const html = "<div><p>Content here</p></div>";
    expect(removeEmptyElements(html)).toBe("<div><p>Content here</p></div>");
  });

  it("removes empty <section> and <article>", () => {
    const html = "<section></section><article> </article><p>Kept</p>";
    expect(removeEmptyElements(html)).toBe("<p>Kept</p>");
  });
});

// ---------------------------------------------------------------------------
// Bare div unwrapping & deep nesting cleanup
// ---------------------------------------------------------------------------

describe("extractMainContent — bare wrapper div handling", () => {
  it("removes deeply nested bare <div> elements (8+ levels) with only whitespace", () => {
    const html = "<div><div><div><div><div><div><div><div>  </div></div></div></div></div></div></div></div>";
    const result = extractMainContent(html);
    // All empty bare divs should be fully removed
    expect(result).toBe("");
  });

  it("unwraps bare <div> wrappers around content (content preserved)", () => {
    const html = "<div><div><div><p>Important content</p></div></div></div>";
    const result = extractMainContent(html);
    expect(result).toContain("<p>Important content</p>");
    // Should not contain bare div wrappers
    expect(result).not.toMatch(/<div>\s*<p>/i);
  });

  it("unwraps builder-classed divs from Divi source (classes available during extraction)", () => {
    const html = '<div class="et_pb_section"><div class="et_pb_row"><div class="et_pb_column"><div class="et_pb_text_inner"><h2>Title</h2><p>Body text here.</p></div></div></div></div>';
    const result = extractMainContent(html);
    expect(result).toContain("<h2>Title</h2>");
    expect(result).toContain("<p>Body text here.</p>");
    // Builder classes should be stripped from output
    expect(result).not.toContain("et_pb_");
  });

  it("strips builder classes on <p> tags in final output", () => {
    // After the sourceCleaner no longer strips builder classes,
    // stripNonSemanticAttributes in extractMainContent should handle it
    const html = '<div><p class="et_pb_text elementor-widget">Styled paragraph</p></div>';
    const result = extractMainContent(html);
    expect(result).toContain("Styled paragraph");
    expect(result).not.toContain("et_pb_");
    expect(result).not.toContain("elementor");
  });

  it("handles mixed bare + attributed divs in deep nesting", () => {
    const html = '<div><div class="et_pb_section"><div><div class="et_pb_row"><div><p>Content</p></div></div></div></div></div>';
    const result = extractMainContent(html);
    expect(result).toContain("<p>Content</p>");
    expect(result).not.toContain("et_pb_");
  });
});

describe("stripShortcodes — no longer strips builder CSS classes", () => {
  it("preserves builder class attributes for downstream processing", () => {
    const html = '<div class="et_pb_section et_pb_fullwidth"><p class="et_pb_text">Hello</p></div>';
    const result = stripShortcodes(html);
    // Classes should be preserved (no longer stripped here)
    expect(result).toContain('class="et_pb_section et_pb_fullwidth"');
    expect(result).toContain('class="et_pb_text"');
  });

  it("still strips Divi shortcode tags", () => {
    const html = '[et_pb_section][et_pb_row]<p>Content</p>[/et_pb_row][/et_pb_section]';
    const result = stripShortcodes(html);
    expect(result).not.toContain("[et_pb_");
    expect(result).toContain("<p>Content</p>");
  });
});
