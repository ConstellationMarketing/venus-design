import { describe, expect, it } from "vitest";
import type { Page } from "@/lib/database.types";
import {
  buildDuplicatePageInsertPayload,
  generateDuplicatePageTitle,
  generatePageSlug,
  generatePageUrlPath,
  generateUniqueDuplicatePageUrlPath,
} from "./pageUrlPath";

describe("Admin page URL helpers", () => {
  it("slugifies titles for standard pages", () => {
    expect(generatePageSlug("Car Accident Lawyers")).toBe("car-accident-lawyers");
  });

  it("generates root-level paths for standard pages", () => {
    expect(generatePageUrlPath("Car Accident Lawyers", "standard")).toBe(
      "/car-accident-lawyers/",
    );
  });

  it("generates root-level paths for practice pages without forcing the legacy prefix", () => {
    expect(generatePageUrlPath("Car Accident Lawyers", "practice")).toBe(
      "/car-accident-lawyers/",
    );
  });

  it("appends copy to duplicate titles", () => {
    expect(generateDuplicatePageTitle("About Us")).toBe("About Us (Copy)");
  });

  it("creates a duplicate path from the duplicate title", () => {
    expect(
      generateUniqueDuplicatePageUrlPath("About Us", "standard", ["/about-us/"]),
    ).toBe("/about-us-copy/");
  });

  it("adds numeric suffixes when duplicate paths already exist", () => {
    expect(
      generateUniqueDuplicatePageUrlPath("About Us", "standard", [
        "/about-us/",
        "/about-us-copy/",
        "/about-us-copy-2/",
      ]),
    ).toBe("/about-us-copy-3/");
  });
});

describe("duplicate page payload helper", () => {
  const sourcePage: Page = {
    id: "source-id",
    page_id: 42,
    title: "About Us",
    url_path: "/about-us/",
    page_type: "standard",
    content: {
      blocks: [
        {
          type: "hero",
          heading: "Original heading",
          nested: {
            buttons: [
              { label: "Call now", href: "tel:4045555555" },
              { label: "Contact", href: "/contact/" },
            ],
          },
        },
      ],
    },
    meta_title: "About Us | Firm",
    meta_description: "Original description",
    canonical_url: "https://example.com/about-us/",
    og_title: "Original OG title",
    og_description: "Original OG description",
    og_image: "https://example.com/og-image.jpg",
    noindex: true,
    schema_type: "LegalService",
    schema_data: {
      faq: [
        { question: "Question 1", answer: "Answer 1" },
        { question: "Question 2", answer: "Answer 2" },
      ],
    },
    status: "published",
    published_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-02T00:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
  };

  it("preserves raw content and safe SEO fields while resetting identity and publish state", () => {
    const payload = buildDuplicatePageInsertPayload(sourcePage, [
      "/about-us/",
      "/about-us-copy/",
    ]);

    expect(payload).toEqual({
      title: "About Us (Copy)",
      url_path: "/about-us-copy-2/",
      page_type: "standard",
      content: sourcePage.content,
      meta_title: "About Us | Firm",
      meta_description: "Original description",
      canonical_url: null,
      og_title: "Original OG title",
      og_description: "Original OG description",
      og_image: "https://example.com/og-image.jpg",
      noindex: true,
      schema_type: "LegalService",
      schema_data: sourcePage.schema_data,
      status: "draft",
      published_at: null,
    });

    expect(payload.content).toEqual(sourcePage.content);
    expect(payload.content).toBe(sourcePage.content);
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("page_id");
    expect(payload).not.toHaveProperty("created_at");
    expect(payload).not.toHaveProperty("updated_at");
  });
});
