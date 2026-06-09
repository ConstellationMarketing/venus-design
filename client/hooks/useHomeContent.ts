import { useEffect, useState } from "react";
import type { HomePageContent } from "../lib/cms/homePageTypes";
import { defaultHomeContent } from "../lib/cms/homePageTypes";
import type { PageMeta } from "../lib/cms/pageMeta";
import { emptyPageMeta } from "../lib/cms/pageMeta";
import { consumePageData } from "../lib/pageDataInjection";
import {
  isHomePageContentShape,
  loadHomePageDocument,
  normalizeHomePageContent,
} from "../lib/cms/publicLoaders";

interface UseHomeContentResult {
  content: HomePageContent;
  meta: PageMeta;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
  isLoading: boolean;
  error: Error | null;
}


export function useHomeContent(): UseHomeContentResult {
  const injected = consumePageData("/");
  const normalizedInjectedContent = isHomePageContentShape(injected?.content)
    ? normalizeHomePageContent(injected.content)
    : null;
  const initialContent = normalizedInjectedContent || defaultHomeContent;
  const initialMeta = normalizedInjectedContent ? (injected?.meta || emptyPageMeta) : emptyPageMeta;
  const initialTitle = normalizedInjectedContent ? (injected?.title || "") : "";
  const initialPublishedAt = normalizedInjectedContent ? (injected?.publishedAt ?? null) : null;
  const initialUpdatedAt = normalizedInjectedContent ? (injected?.updatedAt ?? null) : null;

  const [content, setContent] = useState<HomePageContent>(initialContent);
  const [meta, setMeta] = useState<PageMeta>(initialMeta);
  const [title, setTitle] = useState(initialTitle);
  const [publishedAt, setPublishedAt] = useState<string | null>(initialPublishedAt);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [isLoading, setIsLoading] = useState(!normalizedInjectedContent);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (normalizedInjectedContent) {
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

    async function fetchHomeContent() {
      try {
        const document = await loadHomePageDocument();
        if (!document) {
          if (isMounted) {
            setContent(defaultHomeContent);
            setMeta(emptyPageMeta);
            setTitle("");
            setPublishedAt(null);
            setUpdatedAt(null);
          }
          return;
        }

        const normalizedContent = normalizeHomePageContent(document.content);

        if (isMounted) {
          setContent(normalizedContent);
          setMeta(document.meta);
          setTitle(document.title);
          setPublishedAt(document.publishedAt);
          setUpdatedAt(document.updatedAt);
          setError(null);
        }
      } catch (err) {
        console.error("[useHomeContent] Error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setContent(defaultHomeContent);
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

    fetchHomeContent();

    return () => {
      isMounted = false;
    };
  }, []);

  return { content, meta, title, publishedAt, updatedAt, isLoading, error };
}

export function clearHomeContentCache() {}
