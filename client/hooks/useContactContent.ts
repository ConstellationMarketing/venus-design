import { useEffect, useState } from "react";
import type { ContactPageContent } from "../lib/cms/contactPageTypes";
import { defaultContactContent } from "../lib/cms/contactPageTypes";
import type { PageMeta } from "../lib/cms/pageMeta";
import { emptyPageMeta } from "../lib/cms/pageMeta";
import {
  isContactPageContentShape,
  loadContactPageDocument,
  normalizeContactPageContent,
} from "../lib/cms/publicLoaders";
import { consumePageData } from "../lib/pageDataInjection";

interface UseContactContentResult {
  content: ContactPageContent;
  meta: PageMeta;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
  isLoading: boolean;
  error: Error | null;
}

let cachedContent: ContactPageContent | null = null;
let cachedMeta: PageMeta | null = null;
let cachedTitle = "";
let cachedPublishedAt: string | null = null;
let cachedUpdatedAt: string | null = null;

export function useContactContent(): UseContactContentResult {
  const injected = consumePageData("/contact/");
  const normalizedInjectedContent = isContactPageContentShape(injected?.content)
    ? normalizeContactPageContent(injected.content)
    : null;
  const initialContent = normalizedInjectedContent || cachedContent || defaultContactContent;
  const initialMeta = normalizedInjectedContent ? (injected?.meta || emptyPageMeta) : (cachedMeta || emptyPageMeta);
  const initialTitle = normalizedInjectedContent ? (injected?.title || "") : cachedTitle;
  const initialPublishedAt = normalizedInjectedContent ? (injected?.publishedAt ?? null) : cachedPublishedAt;
  const initialUpdatedAt = normalizedInjectedContent ? (injected?.updatedAt ?? null) : cachedUpdatedAt;

  const [content, setContent] = useState<ContactPageContent>(initialContent);
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

    async function fetchContent() {
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

        const routeData = await loadContactPageDocument();
        const document = routeData.document;

        if (!document) {
          if (isMounted) {
            setContent(defaultContactContent);
            setMeta(emptyPageMeta);
            setTitle("");
            setPublishedAt(null);
            setUpdatedAt(null);
          }
          return;
        }

        const normalizedContent = normalizeContactPageContent(document.content);

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
        console.error("[useContactContent] Error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setContent(defaultContactContent);
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

    fetchContent();

    return () => {
      isMounted = false;
    };
  }, []);

  return { content, meta, title, publishedAt, updatedAt, isLoading, error };
}

export function clearContactContentCache() {
  cachedContent = null;
  cachedMeta = null;
  cachedTitle = "";
  cachedPublishedAt = null;
  cachedUpdatedAt = null;
}
