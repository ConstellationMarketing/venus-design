import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@site/components/layout/Layout";
import PracticePageView from "@site/components/practice/PracticePageView";
import Seo from "@site/components/Seo";
import BlockRenderer from "@site/components/BlockRenderer";
import NotFound from "./NotFound";
import type { PageMeta } from "@site/lib/cms/pageMeta";
import { emptyPageMeta } from "@site/lib/cms/pageMeta";
import type { PreloadedPageDocument } from "@site/lib/cms/publicLoaders";
import {
  isRenderablePageContent,
  loadDynamicPageDocument,
  normalizeCmsUrlPath,
  normalizePracticeAreaPageContent,
} from "@site/lib/cms/publicLoaders";
import { resolvePageTemplate } from "@site/lib/cms/pageTemplateResolver";
import { getPreloadedPageDocument } from "@site/lib/preloadState";

const pageCache = new Map<string, PreloadedPageDocument>();

function normalizeDynamicPageDocument(document: PreloadedPageDocument | null): PreloadedPageDocument | null {
  if (!document || !isRenderablePageContent(document.content)) {
    return null;
  }

  return document;
}

export default function DynamicPage() {
  const { pathname } = useLocation();
  const queryPath = normalizeCmsUrlPath(pathname);
  const preloadedDocument = normalizeDynamicPageDocument(getPreloadedPageDocument(queryPath));
  const initialPage = preloadedDocument || pageCache.get(queryPath) || null;

  if (preloadedDocument && !pageCache.has(queryPath)) {
    pageCache.set(queryPath, preloadedDocument);
  }

  const [page, setPage] = useState<PreloadedPageDocument | null>(initialPage);
  const [isLoading, setIsLoading] = useState(!initialPage);
  const [notFound, setNotFound] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setIsLoading(true);
      setNotFound(false);
      setPage(null);
    }

    let isMounted = true;
    const normalizedPath = normalizeCmsUrlPath(pathname);

    async function fetchPage() {
      const cached = pageCache.get(normalizedPath);
      if (cached) {
        if (isMounted) {
          setPage(cached);
          setIsLoading(false);
          setNotFound(false);
        }
        return;
      }

      try {
        const document = normalizeDynamicPageDocument(await loadDynamicPageDocument(normalizedPath));
        if (!document) {
          if (isMounted) {
            setNotFound(true);
            setIsLoading(false);
          }
          return;
        }

        pageCache.set(normalizedPath, document);

        if (isMounted) {
          setPage(document);
          setNotFound(false);
        }
      } catch (err) {
        console.error("[DynamicPage] Failed to fetch CMS page:", err);
        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPage();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-[#183658]" />
        </div>
      </Layout>
    );
  }

  if (notFound || !page) {
    return <NotFound />;
  }

  const title = page.title || "";
  const meta: PageMeta = page.meta || emptyPageMeta;

  if (resolvePageTemplate(page) === "practice") {
    return (
      <PracticePageView
        content={normalizePracticeAreaPageContent(page.content)}
        meta={meta}
        title={title}
        publishedAt={page.publishedAt}
        updatedAt={page.updatedAt}
      />
    );
  }

  const content = page.content as Record<string, unknown> | import("@site/lib/blocks").ContentBlock[] | null;

  return (
    <Layout>
      <Seo
        title={title}
        meta={meta}
        pageContent={content}
        publishedTime={page.publishedAt}
        updatedTime={page.updatedAt}
      />
      <BlockRenderer content={content} />
    </Layout>
  );
}
