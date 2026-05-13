import { QueryClient } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import AppRoot from "./app/AppRoot";
import AppRouterShell from "./app/AppRouterShell";
import type { CmsPreloadedState } from "./lib/preloadState";
import { setActivePreloadedState } from "./lib/preloadState";

export interface RenderedRouteResult {
  html: string;
  helmet: {
    title: string;
    meta: string;
    link: string;
    script: string;
  };
}

export function renderRoute(urlPath: string, preloadedState: CmsPreloadedState): RenderedRouteResult {
  const helmetContext: Record<string, unknown> = {};
  const queryClient = new QueryClient();

  setActivePreloadedState(preloadedState);

  try {
    const html = renderToString(
      <AppRoot
        queryClient={queryClient}
        helmetContext={helmetContext}
        initialSiteSettings={preloadedState.site.settings}
        router={
          <StaticRouter location={urlPath}>
            <AppRouterShell />
          </StaticRouter>
        }
      />,
    );

    const helmetData = (helmetContext as {
      helmet?: {
        title?: { toString: () => string };
        meta?: { toString: () => string };
        link?: { toString: () => string };
        script?: { toString: () => string };
      };
    }).helmet;

    return {
      html,
      helmet: {
        title: helmetData?.title?.toString() || "",
        meta: helmetData?.meta?.toString() || "",
        link: helmetData?.link?.toString() || "",
        script: helmetData?.script?.toString() || "",
      },
    };
  } finally {
    setActivePreloadedState(null);
  }
}
