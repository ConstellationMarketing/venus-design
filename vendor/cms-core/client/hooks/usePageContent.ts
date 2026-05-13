import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type {
  PageKey,
  PageKeyToContent,
  PageRow,
} from "../lib/pageContentTypes";

// Supabase configuration
const SUPABASE_URL = "https://frncxsyzrtzwswnmbvtn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZybmN4c3l6cnR6d3N3bm1idnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDQ3MjYsImV4cCI6MjA4NTYyMDcyNn0.0qim3QrVOvjxTioWxzV1haFwWaM4TWLrplMOQ86dH0U";

interface UsePageContentResult<T> {
  content: T | null;
  metaTitle: string | null;
  metaDescription: string | null;
  schemaType: string | null;
  schemaData: Record<string, unknown> | null;
  isLoading: boolean;
  error: Error | null;
}

// Cache for page content to avoid refetching on navigation
const pageCache = new Map<string, PageRow>();

export function usePageContent<K extends PageKey>(
  pageKey: K,
): UsePageContentResult<PageKeyToContent[K]> {
  const [content, setContent] = useState<PageKeyToContent[K] | null>(null);
  const [metaTitle, setMetaTitle] = useState<string | null>(null);
  const [metaDescription, setMetaDescription] = useState<string | null>(null);
  const [schemaType, setSchemaType] = useState<string | null>(null);
  const [schemaData, setSchemaData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchPageContent() {
      try {
        // Check cache first
        const cached = pageCache.get(pageKey);
        if (cached) {
          if (isMounted) {
            setContent(cached.content as PageKeyToContent[K]);
            setMetaTitle(cached.meta_title);
            setMetaDescription(cached.meta_description);
            setSchemaType(cached.schema_type);
            setSchemaData(cached.schema_data);
            setIsLoading(false);
          }
          return;
        }

        // PageKey is already a URL path
        const urlPath = pageKey;

        // Use raw fetch instead of Supabase client (workaround for client issues)
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/pages?url_path=eq.${encodeURIComponent(urlPath)}&status=eq.published&select=*`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error(`Page not found: ${pageKey}`);
        }

        const pageData = data[0] as PageRow;

        // Cache the result
        pageCache.set(pageKey, pageData);

        if (isMounted) {
          setContent(pageData.content as PageKeyToContent[K]);
          setMetaTitle(pageData.meta_title);
          setMetaDescription(pageData.meta_description);
          setSchemaType(pageData.schema_type);
          setSchemaData(pageData.schema_data);
          setError(null);
        }
      } catch (err) {
        console.error("[usePageContent] Error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPageContent();

    return () => {
      isMounted = false;
    };
  }, [pageKey]);

  return {
    content,
    metaTitle,
    metaDescription,
    schemaType,
    schemaData,
    isLoading,
    error,
  };
}

// Helper to clear cache (useful after admin edits)
export function clearPageCache(pageKey?: PageKey) {
  if (pageKey) {
    pageCache.delete(pageKey);
  } else {
    pageCache.clear();
  }
}

// Helper to prefetch page content
export async function prefetchPageContent(pageKey: PageKey): Promise<void> {
  if (pageCache.has(pageKey)) {
    return;
  }

  // PageKey is already a URL path
  const urlPath = pageKey;

  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("url_path", urlPath)
    .eq("status", "published")
    .single();

  if (!error && data) {
    pageCache.set(pageKey, data as PageRow);
  }
}
