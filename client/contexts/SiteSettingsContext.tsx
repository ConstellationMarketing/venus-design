import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SITE_SETTINGS,
  loadSiteSettings,
  type SiteSettings,
} from "../lib/cms/publicLoaders";
import { getPreloadedSiteSettings } from "../lib/preloadState";

interface SiteSettingsContextValue {
  settings: SiteSettings;
  isLoading: boolean;
  phoneDisplay: string;
  phoneLabel: string;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

let settingsCache: SiteSettings | null = null;

interface SiteSettingsProviderProps {
  children: ReactNode;
  initialSettings?: SiteSettings | null;
}

export function SiteSettingsProvider({
  children,
  initialSettings = null,
}: SiteSettingsProviderProps) {
  const preloadedSettings = initialSettings || getPreloadedSiteSettings();
  const cachedSettings = settingsCache || preloadedSettings;

  const [settings, setSettings] = useState<SiteSettings>(cachedSettings || DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(!cachedSettings);

  useEffect(() => {
    let isMounted = true;

    if (cachedSettings) {
      settingsCache = cachedSettings;

      if (isMounted) {
        setSettings(cachedSettings);
        setIsLoading(false);
      }

      return () => {
        isMounted = false;
      };
    }

    async function fetchSettings() {
      if (settingsCache) {
        if (isMounted) {
          setSettings(settingsCache);
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedSettings = await loadSiteSettings();
        settingsCache = loadedSettings;

        if (isMounted) {
          setSettings(loadedSettings);
        }
      } catch (error) {
        console.warn("[SiteSettingsContext] Falling back to default settings:", error);
        if (isMounted) {
          setSettings(DEFAULT_SITE_SETTINGS);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const value: SiteSettingsContextValue = {
    settings,
    isLoading,
    phoneDisplay: settings.phoneDisplay,
    phoneLabel: settings.phoneAvailability,
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextValue {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    return {
      settings: DEFAULT_SITE_SETTINGS,
      isLoading: false,
      phoneDisplay: DEFAULT_SITE_SETTINGS.phoneDisplay,
      phoneLabel: DEFAULT_SITE_SETTINGS.phoneAvailability,
    };
  }

  return context;
}

export function useGlobalPhone() {
  const { settings, isLoading } = useSiteSettings();
  return {
    phoneNumber: settings.phoneNumber,
    phoneDisplay: settings.phoneDisplay,
    phoneLabel: settings.phoneAvailability,
    isLoading,
  };
}
