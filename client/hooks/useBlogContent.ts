import { useEffect, useState } from "react";
import type { PageMeta } from "../lib/cms/pageMeta";
import { emptyPageMeta } from "../lib/cms/pageMeta";
import type { ContentBlock } from "../lib/blocks";
import {
  DEFAULT_BLOG_HERO,
  DEFAULT_RECENT_POSTS_CONFIG,
  type BlogHeroData,
  type PreloadedPageDocument,
  type RecentPostsConfig,
  isContentBlockArray,
  loadBlogIndexPageDocument,
  shapeBlogIndexView,
} from "../lib/cms/publicLoaders";
import { getPreloadedPageDocument } from "../lib/preloadState";

interface UseBlogContentResult {
  hero: BlogHeroData;
  recentPosts: RecentPostsConfig;
  meta: PageMeta;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
  isLoading: boolean;
}

let cachedDocument: PreloadedPageDocument<ContentBlock[] | null> | null = null;

export function useBlogContent(): UseBlogContentResult {
  const preloadedDocument = getPreloadedPageDocument<ContentBlock[] | null>("/blog/");
  const normalizedPreloadedDocument = preloadedDocument && isContentBlockArray(preloadedDocument.content)
    ? preloadedDocument
    : null;
  const initialDocument = normalizedPreloadedDocument || cachedDocument;
  const initialView = shapeBlogIndexView(initialDocument);
  const initialTitle = initialDocument?.title || "";
  const initialPublishedAt = initialDocument?.publishedAt ?? null;
  const initialUpdatedAt = initialDocument?.updatedAt ?? null;

  const [hero, setHero] = useState<BlogHeroData>(initialView.hero);
  const [recentPosts, setRecentPosts] = useState<RecentPostsConfig>(initialView.recentPosts);
  const [meta, setMeta] = useState<PageMeta>(initialView.meta || emptyPageMeta);
  const [title, setTitle] = useState(initialTitle);
  const [publishedAt, setPublishedAt] = useState<string | null>(initialPublishedAt);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [isLoading, setIsLoading] = useState(!normalizedPreloadedDocument && !cachedDocument);

  useEffect(() => {
    let isMounted = true;

    if (normalizedPreloadedDocument) {
      cachedDocument = normalizedPreloadedDocument;

      if (isMounted) {
        setHero(initialView.hero);
        setRecentPosts(initialView.recentPosts);
        setMeta(initialView.meta || emptyPageMeta);
        setTitle(initialTitle);
        setPublishedAt(initialPublishedAt);
        setUpdatedAt(initialUpdatedAt);
        setIsLoading(false);
      }

      return () => {
        isMounted = false;
      };
    }

    async function fetchBlogPage() {
      if (cachedDocument) {
        const view = shapeBlogIndexView(cachedDocument);
        if (isMounted) {
          setHero(view.hero);
          setRecentPosts(view.recentPosts);
          setMeta(view.meta);
          setTitle(cachedDocument.title);
          setPublishedAt(cachedDocument.publishedAt);
          setUpdatedAt(cachedDocument.updatedAt);
          setIsLoading(false);
        }
        return;
      }

      try {
        const routeData = await loadBlogIndexPageDocument();
        if (!routeData.document) {
          if (isMounted) {
            setHero(DEFAULT_BLOG_HERO);
            setRecentPosts(DEFAULT_RECENT_POSTS_CONFIG);
            setMeta(emptyPageMeta);
            setTitle("");
            setPublishedAt(null);
            setUpdatedAt(null);
          }
          return;
        }

        if (!isContentBlockArray(routeData.document.content)) {
          if (isMounted) {
            setHero(DEFAULT_BLOG_HERO);
            setRecentPosts(DEFAULT_RECENT_POSTS_CONFIG);
            setMeta(emptyPageMeta);
            setTitle("");
            setPublishedAt(null);
            setUpdatedAt(null);
          }
          return;
        }

        cachedDocument = routeData.document;
        const view = shapeBlogIndexView(routeData.document);

        if (isMounted) {
          setHero(view.hero);
          setRecentPosts(view.recentPosts);
          setMeta(view.meta);
          setTitle(routeData.document.title);
          setPublishedAt(routeData.document.publishedAt);
          setUpdatedAt(routeData.document.updatedAt);
        }
      } catch (err) {
        console.error("[useBlogContent] Error:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchBlogPage();

    return () => {
      isMounted = false;
    };
  }, []);

  return { hero, recentPosts, meta, title, publishedAt, updatedAt, isLoading };
}
