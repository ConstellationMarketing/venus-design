import type { CmsForm } from "./cms/formTypes";
import type {
  BlogSidebarData,
  PreloadedPageDocument,
  PreloadedPostDocument,
  SiteSettings,
} from "./cms/publicLoaders";
import { normalizeCmsUrlPath } from "./cms/publicLoaders";

export { normalizeCmsUrlPath };

export interface CmsPreloadedRoute {
  urlPath: string;
}

export interface CmsPreloadedState {
  route: CmsPreloadedRoute;
  site: {
    settings: SiteSettings | null;
  };
  forms: {
    byId: Record<string, CmsForm>;
    byName: Record<string, CmsForm>;
  };
  page?: {
    document: PreloadedPageDocument | null;
  };
  post?: {
    document: PreloadedPostDocument | null;
  };
  blog?: {
    sidebar?: BlogSidebarData | null;
    recentPosts?: PreloadedPostDocument[] | null;
  };
}

declare global {
  interface Window {
    __CMS_PRELOADED_STATE__?: CmsPreloadedState;
  }
}

let activePreloadedState: CmsPreloadedState | null = null;

export function createEmptyPreloadedState(
  route: CmsPreloadedRoute,
): CmsPreloadedState {
  return {
    route,
    site: {
      settings: null,
    },
    forms: {
      byId: {},
      byName: {},
    },
  };
}

export function setActivePreloadedState(state: CmsPreloadedState | null) {
  activePreloadedState = state;
}

export function initializeBrowserPreloadedState() {
  if (typeof window === "undefined") {
    return null;
  }

  activePreloadedState = window.__CMS_PRELOADED_STATE__ ?? null;
  return activePreloadedState;
}

export function getActivePreloadedState() {
  if (activePreloadedState) {
    return activePreloadedState;
  }

  if (typeof window !== "undefined") {
    return window.__CMS_PRELOADED_STATE__ ?? null;
  }

  return null;
}

export function getMatchingRoutePreloadedState(urlPath: string) {
  const state = getActivePreloadedState();
  if (!state) {
    return null;
  }

  return normalizeCmsUrlPath(state.route.urlPath) === normalizeCmsUrlPath(urlPath)
    ? state
    : null;
}

function getResolvedPreloadedState(urlPath?: string) {
  return urlPath
    ? getMatchingRoutePreloadedState(urlPath)
    : getActivePreloadedState();
}

export function getPreloadedSiteSettings(urlPath?: string) {
  const state = getResolvedPreloadedState(urlPath);
  return state?.site.settings ?? null;
}

export function getPreloadedForm(idOrName: string, urlPath?: string) {
  const state = getResolvedPreloadedState(urlPath);
  if (!state) {
    return null;
  }

  return state.forms.byId[idOrName] ?? state.forms.byName[idOrName] ?? null;
}

export function getPreloadedForms(urlPath?: string) {
  const state = getResolvedPreloadedState(urlPath);
  if (!state) {
    return [];
  }

  return Object.values(state.forms.byId);
}

export function getPreloadedPageDocument<TContent = unknown>(urlPath: string) {
  const state = getMatchingRoutePreloadedState(urlPath);
  const document = state?.page?.document;

  if (!document) {
    return null;
  }

  return normalizeCmsUrlPath(document.urlPath) === normalizeCmsUrlPath(urlPath)
    ? (document as PreloadedPageDocument<TContent>)
    : null;
}

export function getPreloadedPostDocument(urlPath: string) {
  const state = getMatchingRoutePreloadedState(urlPath);
  return state?.post?.document ?? null;
}

export function getPreloadedBlogSidebar(urlPath: string) {
  const state = getMatchingRoutePreloadedState(urlPath);
  return state?.blog?.sidebar ?? null;
}

export function getPreloadedRecentPosts(urlPath: string) {
  const state = getMatchingRoutePreloadedState(urlPath);
  return state?.blog?.recentPosts ?? null;
}

export function serializePreloadedState(state: CmsPreloadedState) {
  return JSON.stringify(state).replace(/</g, "\\u003c");
}
