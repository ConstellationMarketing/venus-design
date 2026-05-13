import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import * as ReactHelmetAsync from "react-helmet-async";
import { TooltipProvider } from "../components/ui/tooltip";
import { Toaster } from "../components/ui/toaster";
import { Toaster as Sonner } from "../components/ui/sonner";
import { SiteSettingsProvider } from "../contexts/SiteSettingsContext";
import type { SiteSettings } from "../lib/cms/publicLoaders";

const helmetModule = ReactHelmetAsync as Record<string, unknown>;
const helmetDefault =
  (helmetModule.default as Record<string, unknown> | undefined) ?? undefined;
const HelmetProvider =
  (helmetModule.HelmetProvider as ((props: {
    children: ReactNode;
    context?: Record<string, unknown>;
  }) => JSX.Element) | undefined) ||
  (helmetDefault?.HelmetProvider as ((props: {
    children: ReactNode;
    context?: Record<string, unknown>;
  }) => JSX.Element) | undefined);

interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
  helmetContext?: Record<string, unknown>;
  initialSiteSettings?: SiteSettings | null;
}

export default function AppProviders({
  children,
  queryClient,
  helmetContext,
  initialSiteSettings = null,
}: AppProvidersProps) {
  if (!HelmetProvider) {
    throw new Error("HelmetProvider is unavailable");
  }

  return (
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <SiteSettingsProvider initialSettings={initialSiteSettings}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </SiteSettingsProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
