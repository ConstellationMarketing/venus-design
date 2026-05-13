import { useEffect, useRef, useState } from "react";
import type { PracticeAreaPageContent } from "../lib/cms/practiceAreaPageTypes";
import { defaultPracticeAreaPageContent } from "../lib/cms/practiceAreaPageTypes";
import type { PageMeta } from "../lib/cms/pageMeta";
import { emptyPageMeta } from "../lib/cms/pageMeta";
import {
  isPracticeAreaPageContentShape,
  loadPracticeAreaPageDocument,
  normalizePracticeAreaPageContent,
} from "../lib/cms/publicLoaders";
import { consumePageData } from "../lib/pageDataInjection";

interface UsePracticeAreaPageContentResult {
  content: PracticeAreaPageContent;
  meta: PageMeta;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
  isLoading: boolean;
  error: Error | null;
  notFound: boolean;
}

const cache = new Map<string, {
  content: PracticeAreaPageContent;
  meta: PageMeta;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
}>();

export function usePracticeAreaPageContent(slug: string | undefined): UsePracticeAreaPageContentResult {
  const urlPath = slug ? `/practice-areas/${slug}/` : "";
  const injected = slug ? consumePageData(urlPath) : null;
  const cached = urlPath ? cache.get(urlPath) : null;
  const normalizedInjectedContent = isPracticeAreaPageContentShape(injected?.content)
    ? normalizePracticeAreaPageContent(injected.content)
    : null;
  const initialContent = normalizedInjectedContent || cached?.content || defaultPracticeAreaPageContent;
  const initialMeta = normalizedInjectedContent ? (injected?.meta || emptyPageMeta) : (cached?.meta || emptyPageMeta);
  const initialTitle = normalizedInjectedContent ? (injected?.title || "") : (cached?.title || "");
  const initialPublishedAt = normalizedInjectedContent ? (injected?.publishedAt ?? null) : (cached?.publishedAt ?? null);
  const initialUpdatedAt = normalizedInjectedContent ? (injected?.updatedAt ?? null) : (cached?.updatedAt ?? null);

  const [content, setContent] = useState<PracticeAreaPageContent>(initialContent);
  const [meta, setMeta] = useState<PageMeta>(initialMeta);
  const [title, setTitle] = useState(initialTitle);
  const [publishedAt, setPublishedAt] = useState<string | null>(initialPublishedAt);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [isLoading, setIsLoading] = useState(!normalizedInjectedContent && !cached);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);
  const prevSlug = useRef(slug);

  useEffect(() => {
    if (prevSlug.current !== slug) {
      prevSlug.current = slug;
      setIsLoading(true);
      setError(null);
      setNotFound(false);
    }

    if (!slug) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const currentUrlPath = `/practice-areas/${slug}/`;

    if (normalizedInjectedContent) {
      cache.set(currentUrlPath, {
        content: normalizedInjectedContent,
        meta: initialMeta,
        title: initialTitle,
        publishedAt: initialPublishedAt,
        updatedAt: initialUpdatedAt,
      });

      if (isMounted) {
        setContent(normalizedInjectedContent);
        setMeta(initialMeta);
        setTitle(initialTitle);
        setPublishedAt(initialPublishedAt);
        setUpdatedAt(initialUpdatedAt);
        setError(null);
        setNotFound(false);
        setIsLoading(false);
      }

      return () => {
        isMounted = false;
      };
    }

    async function fetchContent() {
      try {
        const cachedDocument = cache.get(currentUrlPath);
        if (cachedDocument) {
          if (isMounted) {
            setContent(cachedDocument.content);
            setMeta(cachedDocument.meta);
            setTitle(cachedDocument.title);
            setPublishedAt(cachedDocument.publishedAt);
            setUpdatedAt(cachedDocument.updatedAt);
            setIsLoading(false);
            setNotFound(false);
          }
          return;
        }

        const document = await loadPracticeAreaPageDocument(currentUrlPath);
        if (!document) {
          if (isMounted) {
            setNotFound(true);
          }
          return;
        }

        const normalizedContent = normalizePracticeAreaPageContent(document.content);

        cache.set(currentUrlPath, {
          content: normalizedContent,
          meta: document.meta,
          title: document.title,
          publishedAt: document.publishedAt,
          updatedAt: document.updatedAt,
        });

        if (isMounted) {
          setContent(normalizedContent);
          setMeta(document.meta);
          setTitle(document.title);
          setPublishedAt(document.publishedAt);
          setUpdatedAt(document.updatedAt);
          setNotFound(false);
          setError(null);
        }
      } catch (err) {
        console.error("[usePracticeAreaPageContent] Error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setContent(defaultPracticeAreaPageContent);
          setMeta(emptyPageMeta);
          setTitle("");
          setPublishedAt(null);
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
  }, [slug]);

  return { content, meta, title, publishedAt, updatedAt, isLoading, error, notFound };
}

export function clearPracticeAreaPageCache(slug?: string) {
  if (slug) {
    cache.delete(`/practice-areas/${slug}/`);
    return;
  }

  for (const key of cache.keys()) {
    cache.delete(key);
  }
}
