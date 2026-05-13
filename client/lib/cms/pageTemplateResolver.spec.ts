import { describe, expect, it } from "vitest";
import { resolvePageTemplate } from "./pageTemplateResolver";
import type { PreloadedPageDocument } from "./publicLoaders";

describe("resolvePageTemplate", () => {
  it("uses page_type first for non-prefixed practice pages", () => {
    const document: PreloadedPageDocument = {
      urlPath: "/car-accident-lawyers/",
      title: "Car Accident Lawyers",
      pageType: "practice",
      content: [{ type: "hero", sectionLabel: "Hero", tagline: "", description: "" }],
      meta: {
        meta_title: null,
        meta_description: null,
        canonical_url: null,
        og_title: null,
        og_description: null,
        og_image: null,
        noindex: false,
        schema_type: null,
        schema_data: null,
      },
      publishedAt: null,
      updatedAt: null,
    };

    expect(resolvePageTemplate(document)).toBe("practice");
  });

  it("falls back to practice content shape when page_type is missing", () => {
    const document: PreloadedPageDocument = {
      urlPath: "/wrongful-death/",
      title: "Wrongful Death",
      content: {
        hero: {
          sectionLabel: "Wrongful Death",
          tagline: "",
          description: "",
        },
        socialProof: {
          mode: "none",
          testimonials: [],
          awards: { logos: [] },
        },
        contentSections: [],
        faq: {
          enabled: false,
          heading: "",
          description: "",
          items: [],
        },
      },
      meta: {
        meta_title: null,
        meta_description: null,
        canonical_url: null,
        og_title: null,
        og_description: null,
        og_image: null,
        noindex: false,
        schema_type: null,
        schema_data: null,
      },
      publishedAt: null,
      updatedAt: null,
    };

    expect(resolvePageTemplate(document)).toBe("practice");
  });

  it("keeps standard block pages on the generic renderer", () => {
    const document: PreloadedPageDocument = {
      urlPath: "/about-firm/",
      title: "About Firm",
      pageType: "standard",
      content: [
        {
          type: "heading",
          level: 1,
          text: "About Firm",
        },
      ],
      meta: {
        meta_title: null,
        meta_description: null,
        canonical_url: null,
        og_title: null,
        og_description: null,
        og_image: null,
        noindex: false,
        schema_type: null,
        schema_data: null,
      },
      publishedAt: null,
      updatedAt: null,
    };

    expect(resolvePageTemplate(document)).toBe("generic");
  });
});
