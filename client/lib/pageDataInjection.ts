import type { PageMeta } from "./cms/pageMeta";
import { emptyPageMeta } from "./cms/pageMeta";
import type { PreloadedPostDocument } from "./cms/publicLoaders";
import { normalizeCmsUrlPath } from "./cms/publicLoaders";
import {
  getPreloadedPageDocument,
  getPreloadedPostDocument,
} from "./preloadState";

export interface InjectedPageData {
  urlPath: string;
  title?: string;
  pageType?: string | null;
  content?: unknown;
  meta: PageMeta;
  publishedAt?: string | null;
  updatedAt?: string | null;
  post?: InjectedPostData;
}

export interface InjectedPostData extends PreloadedPostDocument {}

export function consumePageData(urlPath: string): InjectedPageData | null {
  const normalizedPath = normalizeCmsUrlPath(urlPath);
  const pageDocument = getPreloadedPageDocument(normalizedPath);
  const postDocument = getPreloadedPostDocument(normalizedPath);

  if (!pageDocument && !postDocument) {
    return null;
  }

  if (postDocument) {
    return {
      urlPath: normalizedPath,
      title: postDocument.title,
      meta: {
        meta_title: postDocument.meta_title,
        meta_description: postDocument.meta_description,
        canonical_url: postDocument.canonical_url,
        og_title: postDocument.og_title,
        og_description: postDocument.og_description,
        og_image: postDocument.og_image,
        noindex: postDocument.noindex,
      },
      publishedAt: postDocument.published_at ?? postDocument.created_at ?? null,
      updatedAt: postDocument.updated_at,
      post: postDocument,
    };
  }

  return {
    urlPath: pageDocument?.urlPath || normalizedPath,
    title: pageDocument?.title || "",
    pageType: pageDocument?.pageType ?? null,
    content: pageDocument?.content,
    meta: pageDocument?.meta ?? emptyPageMeta,
    publishedAt: pageDocument?.publishedAt ?? null,
    updatedAt: pageDocument?.updatedAt ?? null,
  };
}
