import type { CmsPreloadedState } from "../preloadState";
import { createEmptyPreloadedState } from "../preloadState";
import { populateRouteForms } from "./formPreload";
import {
  filterRecentPosts,
  isBlogPostPath,
  isPracticeAreaDetailPath,
  loadAboutPageDocument,
  loadBlogIndexPageDocument,
  loadBlogPostDocument,
  loadBlogSidebarData,
  loadContactPageDocument,
  loadDynamicPageDocument,
  loadHomePageDocument,
  loadPracticeAreaPageDocument,
  loadPracticeAreasPageDocument,
  loadRecentPosts,
  loadSiteSettings,
  normalizeCmsUrlPath,
  normalizePostSlug,
  type SiteSettings,
} from "./publicLoaders";

interface BuildRoutePreloadOptions {
  siteSettings?: SiteSettings | null;
}

async function finalizeRoutePreload(
  urlPath: string,
  state: CmsPreloadedState,
) {
  await populateRouteForms(urlPath, state);
  return state;
}

export async function buildRoutePreload(
  urlPath: string,
  options: BuildRoutePreloadOptions = {},
): Promise<CmsPreloadedState> {
  const normalizedPath = normalizeCmsUrlPath(urlPath);
  const state = createEmptyPreloadedState({
    urlPath: normalizedPath,
  });

  state.site.settings = options.siteSettings || (await loadSiteSettings());

  if (normalizedPath === "/") {
    state.page = {
      document: await loadHomePageDocument(),
    };
    return finalizeRoutePreload(normalizedPath, state);
  }

  if (normalizedPath === "/about/") {
    state.page = {
      document: await loadAboutPageDocument(),
    };
    return finalizeRoutePreload(normalizedPath, state);
  }

  if (normalizedPath === "/contact/") {
    const routeData = await loadContactPageDocument();
    state.page = {
      document: routeData.document,
    };
    return finalizeRoutePreload(normalizedPath, state);
  }

  if (normalizedPath === "/practice-areas/") {
    const routeData = await loadPracticeAreasPageDocument();
    state.page = {
      document: routeData.document,
    };
    return finalizeRoutePreload(normalizedPath, state);
  }

  if (isPracticeAreaDetailPath(normalizedPath)) {
    state.page = {
      document: await loadPracticeAreaPageDocument(normalizedPath),
    };
    return finalizeRoutePreload(normalizedPath, state);
  }

  if (normalizedPath === "/blog/") {
    const routeData = await loadBlogIndexPageDocument();
    state.page = {
      document: routeData.document,
    };
    state.blog = {
      recentPosts: await loadRecentPosts(routeData.view.recentPosts.postCount),
    };
    return finalizeRoutePreload(normalizedPath, state);
  }

  if (isBlogPostPath(normalizedPath)) {
    const slug = normalizePostSlug(normalizedPath.replace(/^\/blog\//, ""));
    const post = await loadBlogPostDocument(slug);
    state.post = {
      document: post,
    };
    const recentPosts = await loadRecentPosts(4);
    state.blog = {
      sidebar: await loadBlogSidebarData(),
      recentPosts: filterRecentPosts(recentPosts, post?.id, 3),
    };
    return finalizeRoutePreload(normalizedPath, state);
  }

  state.page = {
    document: await loadDynamicPageDocument(normalizedPath),
  };
  return finalizeRoutePreload(normalizedPath, state);
}
