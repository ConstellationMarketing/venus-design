import { describe, expect, it } from "vitest";
import {
  DEFAULT_FAVICON_HREF,
  buildFaviconLinks,
  getFaviconSettingsSignature,
  normalizeFaviconAssets,
} from "./favicon";

describe("favicon helpers", () => {
  it("falls back to the default favicon when no CMS favicon is configured", () => {
    expect(buildFaviconLinks()).toEqual([
      {
        rel: "icon",
        href: DEFAULT_FAVICON_HREF,
        type: "image/x-icon",
      },
    ]);
  });

  it("normalizes stored favicon asset payloads", () => {
    expect(normalizeFaviconAssets({
      sourceUrl: "https://cdn.example.com/favicon-source.svg",
      mimeType: "image/svg+xml",
      icon32Url: "https://cdn.example.com/favicon-32.png",
      appleTouchIconUrl: "https://cdn.example.com/favicon-180.png",
      manifest192Url: "https://cdn.example.com/favicon-192.png",
      manifest512Url: "https://cdn.example.com/favicon-512.png",
      svgUrl: "https://cdn.example.com/favicon-source.svg",
    })).toEqual({
      sourceUrl: "https://cdn.example.com/favicon-source.svg",
      mimeType: "image/svg+xml",
      icon32Url: "https://cdn.example.com/favicon-32.png",
      appleTouchIconUrl: "https://cdn.example.com/favicon-180.png",
      manifest192Url: "https://cdn.example.com/favicon-192.png",
      manifest512Url: "https://cdn.example.com/favicon-512.png",
      svgUrl: "https://cdn.example.com/favicon-source.svg",
    });
  });

  it("builds a full favicon link set from generated CMS assets", () => {
    const links = buildFaviconLinks({
      faviconSourceUrl: "https://cdn.example.com/favicon-source.svg",
      faviconAssets: {
        sourceUrl: "https://cdn.example.com/favicon-source.svg",
        mimeType: "image/svg+xml",
        icon32Url: "https://cdn.example.com/favicon-32.png",
        appleTouchIconUrl: "https://cdn.example.com/favicon-180.png",
        manifest192Url: "https://cdn.example.com/favicon-192.png",
        manifest512Url: "https://cdn.example.com/favicon-512.png",
        svgUrl: "https://cdn.example.com/favicon-source.svg",
      },
    });

    expect(links).toEqual([
      {
        rel: "icon",
        href: "https://cdn.example.com/favicon-source.svg",
        type: "image/svg+xml",
      },
      {
        rel: "icon",
        href: "https://cdn.example.com/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        rel: "icon",
        href: "https://cdn.example.com/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        href: "https://cdn.example.com/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        rel: "apple-touch-icon",
        href: "https://cdn.example.com/favicon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ]);
  });

  it("changes the favicon signature when the source changes", () => {
    const first = getFaviconSettingsSignature({ faviconSourceUrl: "https://cdn.example.com/a.png" });
    const second = getFaviconSettingsSignature({ faviconSourceUrl: "https://cdn.example.com/b.png" });

    expect(first).not.toBe(second);
  });
});
