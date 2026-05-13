import { useEffect, useState } from "react";
import type { AboutPageContent } from "../lib/cms/aboutPageTypes";
import { defaultAboutContent } from "../lib/cms/aboutPageTypes";
import type { PageMeta } from "../lib/cms/pageMeta";
import { emptyPageMeta } from "../lib/cms/pageMeta";
import { loadAboutPageDocument, mergeAboutContentWithDefaults } from "../lib/cms/publicLoaders";
import { consumePageData } from "../lib/pageDataInjection";

interface UseAboutContentResult {
  content: AboutPageContent;
  meta: PageMeta;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
  isLoading: boolean;
  error: Error | null;
}

let cachedContent: AboutPageContent | null = null;
let cachedMeta: PageMeta | null = null;
let cachedTitle = "";
let cachedPublishedAt: string | null = null;
let cachedUpdatedAt: string | null = null;

const ABOUT_CONTENT_KEYS: (keyof AboutPageContent)[] = [
  "hero",
  "story",
  "missionVision",
  "team",
  "values",
  "stats",
  "whyChooseUs",
  "cta",
];

function isAboutContentShape(content: unknown): content is Partial<AboutPageContent> {
  if (!content || typeof content !== "object") {
    return false;
  }

  return ABOUT_CONTENT_KEYS.some((key) => key in (content as Record<string, unknown>));
}

function normalizeAboutContent(content: unknown): AboutPageContent {
  if (!isAboutContentShape(content)) {
    return defaultAboutContent;
  }

  return mergeAboutContentWithDefaults(content);
}

export function useAboutContent(): UseAboutContentResult {
  const injected = consumePageData("/about/");
  const normalizedInjectedContent = isAboutContentShape(injected?.content)
    ? normalizeAboutContent(injected.content)
    : null;
  const initialContent = normalizedInjectedContent || cachedContent || defaultAboutContent;
  const initialMeta = normalizedInjectedContent ? (injected?.meta || emptyPageMeta) : (cachedMeta || emptyPageMeta);
  const initialTitle = normalizedInjectedContent ? (injected?.title || "") : cachedTitle;
  const initialPublishedAt = normalizedInjectedContent ? (injected?.publishedAt ?? null) : cachedPublishedAt;
  const initialUpdatedAt = normalizedInjectedContent ? (injected?.updatedAt ?? null) : cachedUpdatedAt;

  const [content, setContent] = useState<AboutPageContent>(initialContent);
  const [meta, setMeta] = useState<PageMeta>(initialMeta);
  const [title, setTitle] = useState(initialTitle);
  const [publishedAt, setPublishedAt] = useState<string | null>(initialPublishedAt);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [isLoading, setIsLoading] = useState(!normalizedInjectedContent && !cachedContent);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (normalizedInjectedContent) {
      cachedContent = normalizedInjectedContent;
      cachedMeta = initialMeta;
      cachedTitle = initialTitle;
      cachedPublishedAt = initialPublishedAt;
      cachedUpdatedAt = initialUpdatedAt;

      if (isMounted) {
        setContent(normalizedInjectedContent);
        setMeta(initialMeta);
        setTitle(initialTitle);
        setPublishedAt(initialPublishedAt);
        setUpdatedAt(initialUpdatedAt);
        setError(null);
        setIsLoading(false);
      }

      return () => {
        isMounted = false;
      };
    }

    async function fetchAboutContent() {
      try {
        if (cachedContent) {
          if (isMounted) {
            setContent(cachedContent);
            setMeta(cachedMeta || emptyPageMeta);
            setTitle(cachedTitle);
            setPublishedAt(cachedPublishedAt);
            setUpdatedAt(cachedUpdatedAt);
            setIsLoading(false);
          }
          return;
        }

        const document = await loadAboutPageDocument();
        if (!document) {
          if (isMounted) {
            setContent(defaultAboutContent);
            setMeta(emptyPageMeta);
            setTitle("");
            setPublishedAt(null);
            setUpdatedAt(null);
          }
          return;
        }

        const normalizedContent = normalizeAboutContent(document.content);

        cachedContent = normalizedContent;
        cachedMeta = document.meta;
        cachedTitle = document.title;
        cachedPublishedAt = document.publishedAt;
        cachedUpdatedAt = document.updatedAt;

        if (isMounted) {
          setContent(normalizedContent);
          setMeta(document.meta);
          setTitle(document.title);
          setPublishedAt(document.publishedAt);
          setUpdatedAt(document.updatedAt);
          setError(null);
        }
      } catch (err) {
        console.error("[useAboutContent] Error:", err);
        if (isMounted) {
          const resolvedError = err instanceof Error ? err : new Error("Unknown error");
          setError(resolvedError);
          setContent(defaultAboutContent);
          setMeta(emptyPageMeta);
          setTitle("");
          setUpdatedAt(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAboutContent();

    return () => {
      isMounted = false;
    };
  }, []);

  return { content, meta, title, publishedAt, updatedAt, isLoading, error };
}

export function clearAboutContentCache() {
  cachedContent = null;
  cachedMeta = null;
  cachedTitle = "";
  cachedPublishedAt = null;
  cachedUpdatedAt = null;
}
