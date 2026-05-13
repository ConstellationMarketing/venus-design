export const DEFAULT_FAVICON_HREF = "/favicon.ico";

export interface FaviconAssets {
  sourceUrl: string;
  mimeType: string;
  icon32Url: string;
  appleTouchIconUrl: string;
  manifest192Url: string;
  manifest512Url: string;
  svgUrl?: string;
}

export interface FaviconSettingsValue {
  faviconSourceUrl?: string | null;
  faviconAssets?: FaviconAssets | null;
}

export interface FaviconLinkDescriptor {
  rel: "icon" | "apple-touch-icon";
  href: string;
  sizes?: string;
  type?: string;
}

export const SUPPORTED_FAVICON_MIME_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/jpeg",
  "image/webp",
] as const;

export function normalizeFaviconAssets(value: unknown): FaviconAssets | null {
  if (!isRecord(value)) {
    return null;
  }

  const sourceUrl = cleanString(value.sourceUrl);
  const svgUrl = cleanString(value.svgUrl);
  const icon32Url = cleanString(value.icon32Url);
  const appleTouchIconUrl = cleanString(value.appleTouchIconUrl);
  const manifest192Url = cleanString(value.manifest192Url);
  const manifest512Url = cleanString(value.manifest512Url);
  const fallbackSource = sourceUrl || svgUrl || icon32Url || appleTouchIconUrl || manifest192Url || manifest512Url;

  if (!fallbackSource) {
    return null;
  }

  return {
    sourceUrl: fallbackSource,
    mimeType: cleanString(value.mimeType) || inferMimeTypeFromUrl(fallbackSource) || "image/png",
    icon32Url: icon32Url || fallbackSource,
    appleTouchIconUrl: appleTouchIconUrl || icon32Url || fallbackSource,
    manifest192Url: manifest192Url || icon32Url || fallbackSource,
    manifest512Url: manifest512Url || manifest192Url || icon32Url || fallbackSource,
    ...(svgUrl ? { svgUrl } : {}),
  };
}

export function buildFaviconLinks(settings?: FaviconSettingsValue | null): FaviconLinkDescriptor[] {
  const assets = normalizeFaviconAssets(settings?.faviconAssets);
  const sourceUrl = cleanString(settings?.faviconSourceUrl) || assets?.sourceUrl;
  const links: FaviconLinkDescriptor[] = [];

  const primaryHref = assets?.svgUrl || assets?.icon32Url || sourceUrl;
  if (primaryHref) {
    links.push({
      rel: "icon",
      href: primaryHref,
      type: assets?.svgUrl === primaryHref
        ? "image/svg+xml"
        : inferMimeTypeFromUrl(primaryHref) || assets?.mimeType || "image/png",
    });
  }

  if (assets?.icon32Url) {
    links.push({
      rel: "icon",
      href: assets.icon32Url,
      sizes: "32x32",
      type: "image/png",
    });
  }

  if (assets?.manifest192Url) {
    links.push({
      rel: "icon",
      href: assets.manifest192Url,
      sizes: "192x192",
      type: "image/png",
    });
  }

  if (assets?.manifest512Url) {
    links.push({
      rel: "icon",
      href: assets.manifest512Url,
      sizes: "512x512",
      type: "image/png",
    });
  }

  if (assets?.appleTouchIconUrl) {
    links.push({
      rel: "apple-touch-icon",
      href: assets.appleTouchIconUrl,
      sizes: "180x180",
      type: "image/png",
    });
  }

  if (!links.length) {
    links.push({
      rel: "icon",
      href: DEFAULT_FAVICON_HREF,
      type: "image/x-icon",
    });
  }

  return dedupeFaviconLinks(links);
}

export function getFaviconSettingsSignature(settings?: FaviconSettingsValue | null): string {
  return JSON.stringify({
    faviconSourceUrl: cleanString(settings?.faviconSourceUrl) || "",
    faviconAssets: normalizeFaviconAssets(settings?.faviconAssets),
  });
}

export function inferMimeTypeFromUrl(url?: string | null): string | undefined {
  const pathname = getUrlPathname(url);
  if (!pathname) {
    return undefined;
  }

  if (pathname.endsWith(".svg")) {
    return "image/svg+xml";
  }

  if (pathname.endsWith(".png")) {
    return "image/png";
  }

  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (pathname.endsWith(".webp")) {
    return "image/webp";
  }

  if (pathname.endsWith(".ico")) {
    return "image/x-icon";
  }

  return undefined;
}

function dedupeFaviconLinks(links: FaviconLinkDescriptor[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.rel}|${link.href}|${link.sizes || ""}|${link.type || ""}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getUrlPathname(url?: string | null) {
  const cleanUrl = cleanString(url);
  if (!cleanUrl) {
    return undefined;
  }

  try {
    return new URL(cleanUrl, "https://builder.local").pathname.toLowerCase();
  } catch {
    return cleanUrl.toLowerCase();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
