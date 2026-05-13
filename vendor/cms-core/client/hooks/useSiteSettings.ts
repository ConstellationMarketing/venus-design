import { useState, useEffect } from "react";
import type { SiteSettings, SiteSettingsRow } from "../lib/siteSettingsTypes";
import {
  DEFAULT_SITE_SETTINGS,
  rowToSiteSettings,
} from "../lib/siteSettingsTypes";

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}


interface UseSiteSettingsResult {
  settings: SiteSettings;
  isLoading: boolean;
  error: Error | null;
}

// Global cache for site settings (singleton pattern)
let settingsCache: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

export function useSiteSettings(): UseSiteSettingsResult {
  const [settings, setSettings] = useState<SiteSettings>(
    settingsCache || DEFAULT_SITE_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(!settingsCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSettings() {
      // If already cached, use it
      if (settingsCache) {
        if (isMounted) {
          setSettings(settingsCache);
          setIsLoading(false);
        }
        return;
      }

      // If fetch is already in progress, wait for it
      if (fetchPromise) {
        try {
          const result = await fetchPromise;
          if (isMounted) {
            setSettings(result);
            setIsLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            setError(err instanceof Error ? err : new Error("Unknown error"));
            setIsLoading(false);
          }
        }
        return;
      }

      // Start new fetch
      fetchPromise = (async () => {
        // Use the public view which excludes sensitive fields (analytics IDs, scripts)
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/site_settings_public?settings_key=eq.global&select=*`,
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
          // No settings in DB yet, use defaults
          return DEFAULT_SITE_SETTINGS;
        }

        const row = data[0] as SiteSettingsRow;
        return rowToSiteSettings(row);
      })();

      try {
        const result = await fetchPromise;
        settingsCache = result;

        if (isMounted) {
          setSettings(result);
          setError(null);
        }
      } catch (err) {
        console.error("[useSiteSettings] Error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          // Still use defaults on error
          setSettings(DEFAULT_SITE_SETTINGS);
        }
      } finally {
        fetchPromise = null;
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSettings();
const handleInvalidation = () => {
  if (isMounted) {
    setIsLoading(true);
    fetchSettings();
  }
};

listeners.add(handleInvalidation);

    return () => {
      isMounted = false;
      listeners.delete(handleInvalidation);
    };
  }, []);

  return {
    settings,
    isLoading,
    error,
  };
}

// Helper to clear cache (call after admin saves settings)
export function clearSiteSettingsCache() {
  settingsCache = null;
  fetchPromise = null;
  listeners.forEach((fn) => fn());
}

// Helper to get the global phone number (for pages that want to use it)
export function useGlobalPhone() {
  const { settings, isLoading } = useSiteSettings();

  return {
    phoneNumber: settings.phoneNumber,
    phoneDisplay: settings.phoneDisplay,
    phoneAvailability: settings.phoneAvailability,
    applyGlobally: settings.applyPhoneGlobally,
    isLoading,
  };
}
