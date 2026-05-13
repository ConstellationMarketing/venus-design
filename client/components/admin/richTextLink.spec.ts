import { describe, expect, it } from "vitest";
import { normalizeCmsLinkHref } from "./richTextLink";

describe("normalizeCmsLinkHref", () => {
  it("preserves root-relative site links", () => {
    expect(normalizeCmsLinkHref("/about/")).toBe("/about/");
    expect(normalizeCmsLinkHref("/contact/")).toBe("/contact/");
  });

  it("converts plain internal slugs into root-relative site links", () => {
    expect(normalizeCmsLinkHref("about/")).toBe("/about/");
    expect(normalizeCmsLinkHref("blog/sample-post/")).toBe("/blog/sample-post/");
    expect(normalizeCmsLinkHref("./practice-areas/")).toBe("/practice-areas/");
  });

  it("preserves anchors, query links, mailto, and tel links", () => {
    expect(normalizeCmsLinkHref("#faq")).toBe("#faq");
    expect(normalizeCmsLinkHref("?utm_source=test")).toBe("?utm_source=test");
    expect(normalizeCmsLinkHref("mailto:hello@example.com")).toBe("mailto:hello@example.com");
    expect(normalizeCmsLinkHref("tel:4045551234")).toBe("tel:4045551234");
  });

  it("preserves absolute http urls and normalizes domain-like external urls", () => {
    expect(normalizeCmsLinkHref("https://designs-jupiter.netlify.app/about/")).toBe(
      "https://designs-jupiter.netlify.app/about/",
    );
    expect(normalizeCmsLinkHref("http://example.com/page")).toBe(
      "http://example.com/page",
    );
    expect(normalizeCmsLinkHref("example.com/about/")).toBe(
      "https://example.com/about/",
    );
    expect(normalizeCmsLinkHref("www.example.com/about/")).toBe(
      "https://www.example.com/about/",
    );
  });

  it("converts protocol-relative urls to https urls", () => {
    expect(normalizeCmsLinkHref("//cdn.example.com/file.pdf")).toBe(
      "https://cdn.example.com/file.pdf",
    );
  });
});
