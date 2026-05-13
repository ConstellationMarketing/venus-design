import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import AppProviders from "./AppProviders";
import type { SiteSettings } from "../lib/cms/publicLoaders";

interface AppRootProps {
  router: ReactNode;
  queryClient: QueryClient;
  helmetContext?: Record<string, unknown>;
  initialSiteSettings?: SiteSettings | null;
}

export default function AppRoot({
  router,
  queryClient,
  helmetContext,
  initialSiteSettings = null,
}: AppRootProps) {
  return (
    <AppProviders
      queryClient={queryClient}
      helmetContext={helmetContext}
      initialSiteSettings={initialSiteSettings}
    >
      {router}
    </AppProviders>
  );
}
