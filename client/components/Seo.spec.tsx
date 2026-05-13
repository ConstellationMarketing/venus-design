import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import * as ReactHelmetAsync from "react-helmet-async";
import Seo from "./Seo";
import { SiteSettingsProvider } from "@site/contexts/SiteSettingsContext";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@site/lib/cms/publicLoaders";
import type { PageMeta } from "@site/lib/cms/pageMeta";

const helmetModule = ReactHelmetAsync as Record<string, unknown>;
const helmetDefault = (helmetModule.default as Record<string, unknown> | undefined) ?? undefined;
const HelmetProvider =
  (helmetModule.HelmetProvider as ((props: { children: React.ReactNode; context?: Record<string, unknown> }) => JSX.Element) | undefined)
  || (helmetDefault?.HelmetProvider as ((props: { children: React.ReactNode; context?: Record<string, unknown> }) => JSX.Element) | undefined);

function renderSeo({
  settings = DEFAULT_SITE_SETTINGS,
  location = "/about/",
  props = {},
}: {
  settings?: SiteSettings;
  location?: string;
  props?: React.ComponentProps<typeof Seo>;
} = {}) {
  const helmetContext: Record<string, unknown> = {};

  renderToString(
    <HelmetProvider context={helmetContext}>
      <SiteSettingsProvider initialSettings={settings}>
        <StaticRouter location={location}>
          <Seo title="About Us" {...props} />
        </StaticRouter>
      </SiteSettingsProvider>
    </HelmetProvider>,
  );

  const helmet = (helmetContext as {
    helmet?: {
      link?: { toString: () => string };
      meta?: { toString: () => string };
    };
  }).helmet;

  return {
    linkHtml: helmet?.link?.toString() || "",
    metaHtml: helmet?.meta?.toString() || "",
  };
}

describe("Seo", () => {
  it("renders the default favicon link when no custom favicon is configured", () => {
    const { linkHtml } = renderSeo();
    expect(linkHtml).toContain('rel="icon"');
    expect(linkHtml).toContain('href="/favicon.ico"');
  });

  it("renders CMS favicon links into the SSR head output", () => {
    const settings: SiteSettings = {
      ...DEFAULT_SITE_SETTINGS,
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
    };

    const { linkHtml } = renderSeo({ settings });
    expect(linkHtml).toContain('href="https://cdn.example.com/favicon-source.svg"');
    expect(linkHtml).toContain('href="https://cdn.example.com/favicon-32.png"');
    expect(linkHtml).toContain('rel="apple-touch-icon"');
    expect(linkHtml).toContain('sizes="180x180"');
  });

  it("uses the route featured image as the default social image when OG metadata is only a plain URL", () => {
    const meta: PageMeta = {
      og_image: "https://cdn.example.com/plain-og.jpg",
    };

    const { metaHtml } = renderSeo({
      location: "/blog/featured-post/",
      props: {
        routeType: "post",
        title: "Featured Post",
        meta,
        image: "https://cdn.example.com/featured.jpg",
      },
    });

    expect(metaHtml).toContain('property="og:image" content="https://cdn.example.com/featured.jpg"');
    expect(metaHtml).toContain('name="twitter:image" content="https://cdn.example.com/featured.jpg"');
    expect(metaHtml).not.toContain("plain-og.jpg");
    expect(metaHtml).not.toContain("og:image:secure_url");
    expect(metaHtml).not.toContain("og:image:width");
    expect(metaHtml).not.toContain("og:image:height");
    expect(metaHtml).not.toContain("og:image:alt");
    expect(metaHtml).not.toContain("og:image:type");
  });

  it("keeps the route featured image URL while using a richer OG object for optional enrichment fields", () => {
    const meta: PageMeta = {
      og_image: {
        url: "https://cdn.example.com/rich-og.jpg",
        secureUrl: "https://secure.example.com/rich-og.jpg",
        width: 1200,
        height: 630,
        alt: "Attorney team photo",
        type: "image/jpeg",
      },
    };

    const { metaHtml } = renderSeo({
      location: "/blog/rich-post/",
      props: {
        routeType: "post",
        title: "Rich Post",
        meta,
        image: "https://cdn.example.com/featured.jpg",
      },
    });

    expect(metaHtml).toContain('property="og:image" content="https://cdn.example.com/featured.jpg"');
    expect(metaHtml).toContain('name="twitter:image" content="https://cdn.example.com/featured.jpg"');
    expect(metaHtml).toContain('property="og:image:secure_url" content="https://secure.example.com/rich-og.jpg"');
    expect(metaHtml).toContain('property="og:image:width" content="1200"');
    expect(metaHtml).toContain('property="og:image:height" content="630"');
    expect(metaHtml).toContain('property="og:image:alt" content="Attorney team photo"');
    expect(metaHtml).toContain('property="og:image:type" content="image/jpeg"');
  });

  it("falls back to the OG image object URL when no route featured image exists", () => {
    const meta: PageMeta = {
      og_image: {
        url: "https://cdn.example.com/social-only.jpg",
        width: 1200,
        height: 630,
      },
    };

    const { metaHtml } = renderSeo({
      location: "/blog/social-only/",
      props: {
        routeType: "post",
        title: "Social Only",
        meta,
      },
    });

    expect(metaHtml).toContain('property="og:image" content="https://cdn.example.com/social-only.jpg"');
    expect(metaHtml).toContain('name="twitter:image" content="https://cdn.example.com/social-only.jpg"');
    expect(metaHtml).toContain('property="og:image:width" content="1200"');
    expect(metaHtml).toContain('property="og:image:height" content="630"');
  });
});
