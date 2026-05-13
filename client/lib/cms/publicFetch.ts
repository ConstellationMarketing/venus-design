type EnvMap = Record<string, string | undefined>;

function getImportMetaEnv(): EnvMap {
  const meta = import.meta as { env?: EnvMap };
  return meta.env ?? {};
}

export function getEnvValue(key: string): string | undefined {
  const importMetaEnv = getImportMetaEnv()[key];
  if (importMetaEnv) {
    return importMetaEnv;
  }

  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }

  return undefined;
}

export function getPublicCmsConfig() {
  const viteUrl = import.meta.env?.VITE_SUPABASE_URL;
  const viteAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

  return {
    url: viteUrl || getEnvValue("VITE_SUPABASE_URL") || "",
    anonKey: viteAnonKey || getEnvValue("VITE_SUPABASE_ANON_KEY") || "",
  };
}

export function buildRestHeaders(apiKey: string) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
}

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

function buildBrowserProxyUrl(resourcePath: string) {
  const path = `/api/public-cms?resource=${encodeURIComponent(resourcePath)}`;
  if (!isBrowserRuntime()) {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

function buildRestUrl(baseUrl: string, resourcePath: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  return `${normalizedBaseUrl}/rest/v1/${resourcePath}`;
}

async function fetchRestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T[]> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchRestRows<T>(resourcePath: string, apiKey?: string): Promise<T[]> {
  const { url, anonKey } = getPublicCmsConfig();
  const authKey = apiKey || anonKey;

  if (isBrowserRuntime()) {
    try {
      return await fetchRestJson<T>(buildBrowserProxyUrl(resourcePath));
    } catch (error) {
      if (!url || !authKey) {
        throw error;
      }

      return fetchRestJson<T>(buildRestUrl(url, resourcePath), {
        headers: buildRestHeaders(authKey),
      });
    }
  }

  if (!url || !authKey) {
    return [];
  }

  return fetchRestJson<T>(buildRestUrl(url, resourcePath), {
    headers: buildRestHeaders(authKey),
  });
}

export async function fetchRestSingle<T>(resourcePath: string, apiKey?: string): Promise<T | null> {
  const rows = await fetchRestRows<T>(resourcePath, apiKey);
  return rows[0] ?? null;
}
