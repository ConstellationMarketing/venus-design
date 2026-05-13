import { useEffect, useState } from "react";
import { getPreloadedForm } from "../lib/preloadState";
import {
  isCmsFormLookupId,
  normalizeCmsForm,
  type CmsForm,
} from "../lib/cms/formTypes";
import { fetchRestRows } from "../lib/cms/publicFetch";

const formCache = new Map<string, CmsForm>();
let allFormsCache: CmsForm[] | null = null;

function cacheForm(form: CmsForm) {
  const normalizedForm = normalizeCmsForm(form);
  formCache.set(normalizedForm.id, normalizedForm);
  formCache.set(normalizedForm.name, normalizedForm);
  return normalizedForm;
}

function getCachedOrPreloadedForm(idOrName: string | undefined) {
  if (!idOrName) {
    return null;
  }

  const cached = formCache.get(idOrName);
  if (cached) {
    return cached;
  }

  const preloaded = getPreloadedForm(idOrName);
  return preloaded ? cacheForm(preloaded) : null;
}

export function useCmsForm(idOrName: string | undefined) {
  const [form, setForm] = useState<CmsForm | null>(
    getCachedOrPreloadedForm(idOrName),
  );
  const [isLoading, setIsLoading] = useState(!form && !!idOrName);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!idOrName) {
      return;
    }

    let mounted = true;

    async function fetchForm() {
      const cached = getCachedOrPreloadedForm(idOrName);
      if (cached) {
        if (mounted) {
          setForm(cached);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      try {
        const filter = isCmsFormLookupId(idOrName)
          ? `id=eq.${idOrName}`
          : `name=eq.${encodeURIComponent(idOrName)}`;
        const rows = await fetchRestRows<CmsForm>(
          `cms_forms?${filter}&limit=1&select=*`,
        );
        if (rows.length === 0) {
          if (mounted) {
            setForm(null);
            setIsLoading(false);
          }
          return;
        }

        const loadedForm = cacheForm(rows[0]);

        if (mounted) {
          setForm(loadedForm);
          setError(null);
        }
      } catch (err) {
        console.warn("[useCmsForm] Unable to load CMS form:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setForm(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchForm();

    return () => {
      mounted = false;
    };
  }, [idOrName]);

  return { form, isLoading, error };
}

export function useCmsForms() {
  const [forms, setForms] = useState<CmsForm[]>(allFormsCache ?? []);
  const [isLoading, setIsLoading] = useState(!allFormsCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchForms() {
      if (allFormsCache) {
        if (mounted) {
          setForms(allFormsCache);
          setIsLoading(false);
        }
        return;
      }

      try {
        const rows = await fetchRestRows<CmsForm>(
          "cms_forms?order=created_at.asc&select=*",
        );
        const normalizedRows = rows.map(cacheForm);
        allFormsCache = normalizedRows;

        if (mounted) {
          setForms(normalizedRows);
          setError(null);
        }
      } catch (err) {
        console.warn("[useCmsForms] Unable to load CMS forms:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setForms([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchForms();

    return () => {
      mounted = false;
    };
  }, []);

  return { forms, isLoading, error };
}

export function clearFormCache() {
  formCache.clear();
  allFormsCache = null;
}
