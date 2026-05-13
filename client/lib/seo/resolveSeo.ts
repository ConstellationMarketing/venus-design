import { buildAllSchemas, type SchemaInput } from "@site/lib/schemaHelpers";
import type { PageMeta } from "@site/lib/cms/pageMeta";
import {
  normalizeCmsUrlPath,
  type SiteSettings,
} from "@site/lib/cms/publicLoaders";

export type SeoRouteType = "page" | "post";

export interface SeoImageValue {
  url?: string | null;
  secureUrl?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  type?: string | null;
}

export type SeoImageInput = string | SeoImageValue | null | undefined;

export interface ResolveSeoInput {
  pathname: string;
  settings: SiteSettings;
  routeType?: SeoRouteType;
  title?: string | null;
  meta?: PageMeta | null;
  description?: string | null;
  canonical?: string | null;
  image?: SeoImageInput;
  noindex?: boolean | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: SeoImageInput;
  schemaType?: string | string[] | null;
  schemaData?: Record<string, unknown> | null;
  pageContent?: unknown;
  publishedTime?: string | null;
  updatedTime?: string | null;
}

export interface ResolvedSeoImage {
  url: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
}

export interface ResolvedSeo {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  openGraph: {
    locale: string;
    type: "website" | "article";
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    image?: ResolvedSeoImage;
    updatedTime?: string;
  };
  twitter: {
    card: "summary" | "summary_large_image";
    title?: string;
    description?: string;
    image?: string;
  };
  schemas: Record<string, unknown>[];
}

const DEFAULT_OG_LOCALE = "en_US";

export function resolveSeo(input: ResolveSeoInput): ResolvedSeo {
  const routeType = input.routeType ?? "page";
  const siteName = cleanString(input.settings.siteName);
  const siteUrl = cleanUrl(input.settings.siteUrl);
  const visibleTitle = cleanString(input.title);
  const metaTitle = cleanString(input.meta?.meta_title);
  const socialTitle =
    cleanString(input.meta?.og_title) ??
    cleanString(input.ogTitle) ??
    metaTitle ??
    visibleTitle ??
    siteName;
  const pageTitle = appendSiteName(socialTitle, siteName);
  const description =
    cleanString(input.meta?.og_description) ??
    cleanString(input.ogDescription) ??
    cleanString(input.meta?.meta_description) ??
    cleanString(input.description);
  const canonical =
    cleanUrl(input.canonical) ??
    cleanUrl(input.meta?.canonical_url) ??
    buildRouteCanonical(siteUrl, input.pathname);
  const routeNoindex = input.noindex ?? input.meta?.noindex ?? false;
  const robots = routeNoindex || input.settings.siteNoindex ? "noindex, nofollow" : undefined;
  const image = resolveSocialImage(input.image, input.ogImage ?? input.meta?.og_image);
  const timestamp = cleanString(input.updatedTime) ?? cleanString(input.publishedTime);

  const schemaInput: SchemaInput = {
    title: socialTitle,
    description,
    url: canonical,
    image: image?.url,
    schemaType: input.schemaType ?? input.meta?.schema_type,
    schemaData: input.schemaData ?? input.meta?.schema_data,
    pageContent: input.pageContent,
    siteSettings: input.settings,
    routeType,
    publishedTime: cleanString(input.publishedTime),
    updatedTime: cleanString(input.updatedTime),
  };

  return {
    title: pageTitle,
    description,
    canonical,
    robots,
    openGraph: {
      locale: DEFAULT_OG_LOCALE,
      type: routeType === "post" ? "article" : "website",
      title: socialTitle,
      description,
      url: canonical,
      siteName,
      image,
      updatedTime: timestamp,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      image: image?.url,
    },
    schemas: [...buildAllSchemas(schemaInput), ...parseGlobalSchemas(input.settings.globalSchema)],
  };
}

function cleanString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanUrl(value: string | null | undefined) {
  return cleanString(value);
}

function appendSiteName(title?: string, siteName?: string) {
  if (!title) {
    return siteName;
  }

  const normalizedSiteName = siteName?.trim().toLowerCase();
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedSiteName) {
    return title;
  }

  const titleAlreadyIncludesSiteName =
    normalizedTitle === normalizedSiteName ||
    normalizedTitle.endsWith(`| ${normalizedSiteName}`) ||
    normalizedTitle.endsWith(`- ${normalizedSiteName}`);

  return titleAlreadyIncludesSiteName ? title : `${title} | ${siteName}`;
}

function buildRouteCanonical(siteUrl?: string, pathname?: string) {
  if (!siteUrl || !pathname) {
    return undefined;
  }

  return `${siteUrl}${normalizeCmsUrlPath(pathname)}`;
}

function resolveSocialImage(routeImageValue: SeoImageInput, ogImageValue: SeoImageInput): ResolvedSeoImage | undefined {
  const routeImage = resolveImage(routeImageValue);
  const ogImage = resolveImage(ogImageValue);
  const url = routeImage?.url ?? ogImage?.url;

  if (!url) {
    return undefined;
  }

  const enrichmentSource = ogImage ?? routeImage;

  return {
    url,
    secureUrl: enrichmentSource?.secureUrl,
    width: enrichmentSource?.width,
    height: enrichmentSource?.height,
    alt: enrichmentSource?.alt,
    type: enrichmentSource?.type,
  };
}

function resolveImage(value: SeoImageInput): ResolvedSeoImage | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    const url = cleanUrl(value);
    return url ? { url } : undefined;
  }

  const url = cleanUrl(value.url);
  if (!url) {
    return undefined;
  }

  return {
    url,
    secureUrl: cleanUrl(value.secureUrl),
    width: normalizePositiveNumber(value.width),
    height: normalizePositiveNumber(value.height),
    alt: cleanString(value.alt),
    type: cleanString(value.type),
  };
}

function normalizePositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseGlobalSchemas(rawSchema: string | null | undefined) {
  if (!rawSchema?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawSchema);
    if (Array.isArray(parsed)) {
      return parsed.filter(isRecord);
    }

    return isRecord(parsed) ? [parsed] : [];
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
