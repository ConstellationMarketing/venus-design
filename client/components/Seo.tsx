import { useMemo } from "react";
import * as ReactHelmetAsync from "react-helmet-async";
import { useLocation } from "react-router-dom";
import type { PageMeta } from "@site/lib/cms/pageMeta";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";
import {
  resolveSeo,
  type SeoImageInput,
  type SeoRouteType,
} from "@site/lib/seo/resolveSeo";
import { buildFaviconLinks } from "@site/lib/seo/favicon";

const helmetModule = ReactHelmetAsync as Record<string, unknown>;
const helmetDefault = (helmetModule["default"] as Record<string, unknown> | undefined) ?? undefined;
const Helmet =
  (helmetModule["Helmet"] as ((props: { children: React.ReactNode }) => JSX.Element) | undefined) ||
  (helmetDefault?.["Helmet"] as ((props: { children: React.ReactNode }) => JSX.Element) | undefined);

interface SeoProps {
  routeType?: SeoRouteType;
  title?: string;
  meta?: PageMeta | null;
  description?: string;
  canonical?: string;
  image?: SeoImageInput;
  noindex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: SeoImageInput;
  schemaType?: string | string[] | null;
  schemaData?: Record<string, unknown> | null;
  pageContent?: unknown;
  publishedTime?: string | null;
  updatedTime?: string | null;
}

export default function Seo({
  routeType = "page",
  title,
  meta,
  description,
  canonical,
  image,
  noindex = false,
  ogTitle,
  ogDescription,
  ogImage,
  schemaType,
  schemaData,
  pageContent,
  publishedTime,
  updatedTime,
}: SeoProps) {
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();

  const faviconLinks = useMemo(() => buildFaviconLinks({
    faviconSourceUrl: settings.faviconSourceUrl,
    faviconAssets: settings.faviconAssets,
  }), [settings.faviconAssets, settings.faviconSourceUrl]);

  const resolvedSeo = useMemo(() => resolveSeo({
    pathname,
    settings,
    routeType,
    title,
    meta,
    description,
    canonical,
    image,
    noindex,
    ogTitle,
    ogDescription,
    ogImage,
    schemaType,
    schemaData,
    pageContent,
    publishedTime,
    updatedTime,
  }), [
    pathname,
    settings,
    routeType,
    title,
    meta,
    description,
    canonical,
    image,
    noindex,
    ogTitle,
    ogDescription,
    ogImage,
    schemaType,
    schemaData,
    pageContent,
    publishedTime,
    updatedTime,
  ]);

  if (!Helmet) {
    return null;
  }

  return (
    <Helmet>
      {resolvedSeo.title && <title>{resolvedSeo.title}</title>}
      {resolvedSeo.description && <meta name="description" content={resolvedSeo.description} />}
      {resolvedSeo.robots && <meta name="robots" content={resolvedSeo.robots} />}
      {resolvedSeo.canonical && <link rel="canonical" href={resolvedSeo.canonical} />}
      {faviconLinks.map((link) => (
        <link
          key={`favicon-${link.rel}-${link.sizes || "default"}-${link.href}`}
          rel={link.rel}
          href={link.href}
          {...(link.sizes ? { sizes: link.sizes } : {})}
          {...(link.type ? { type: link.type } : {})}
        />
      ))}

      <meta property="og:locale" content={resolvedSeo.openGraph.locale} />
      <meta property="og:type" content={resolvedSeo.openGraph.type} />
      {resolvedSeo.openGraph.title && <meta property="og:title" content={resolvedSeo.openGraph.title} />}
      {resolvedSeo.openGraph.description && <meta property="og:description" content={resolvedSeo.openGraph.description} />}
      {resolvedSeo.openGraph.url && <meta property="og:url" content={resolvedSeo.openGraph.url} />}
      {resolvedSeo.openGraph.siteName && <meta property="og:site_name" content={resolvedSeo.openGraph.siteName} />}
      {resolvedSeo.openGraph.image?.url && <meta property="og:image" content={resolvedSeo.openGraph.image.url} />}
      {resolvedSeo.openGraph.image?.secureUrl && <meta property="og:image:secure_url" content={resolvedSeo.openGraph.image.secureUrl} />}
      {resolvedSeo.openGraph.image?.width && <meta property="og:image:width" content={String(resolvedSeo.openGraph.image.width)} />}
      {resolvedSeo.openGraph.image?.height && <meta property="og:image:height" content={String(resolvedSeo.openGraph.image.height)} />}
      {resolvedSeo.openGraph.image?.alt && <meta property="og:image:alt" content={resolvedSeo.openGraph.image.alt} />}
      {resolvedSeo.openGraph.image?.type && <meta property="og:image:type" content={resolvedSeo.openGraph.image.type} />}
      {resolvedSeo.openGraph.updatedTime && <meta property="og:updated_time" content={resolvedSeo.openGraph.updatedTime} />}

      <meta name="twitter:card" content={resolvedSeo.twitter.card} />
      {resolvedSeo.twitter.title && <meta name="twitter:title" content={resolvedSeo.twitter.title} />}
      {resolvedSeo.twitter.description && <meta name="twitter:description" content={resolvedSeo.twitter.description} />}
      {resolvedSeo.twitter.image && <meta name="twitter:image" content={resolvedSeo.twitter.image} />}

      {resolvedSeo.schemas.map((schema, index) => (
        <script key={`ld-json-${index}`} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
