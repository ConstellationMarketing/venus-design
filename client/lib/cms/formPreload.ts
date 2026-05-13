import type { CmsPreloadedState } from "../preloadState";
import { normalizeCmsUrlPath } from "./publicLoaders";
import { fetchRestRows } from "./publicFetch";
import {
  isCmsFormLookupId,
  normalizeCmsForm,
  type CmsForm,
} from "./formTypes";

export const CMS_FORM_SHORTCODE_RE = /\{\{form:([a-z0-9-]+)\}\}/gi;

export interface CmsFormLookups {
  ids: string[];
  names: string[];
}

interface CmsFormLookupAccumulator {
  ids: Set<string>;
  names: Set<string>;
}

function createLookupAccumulator(): CmsFormLookupAccumulator {
  return {
    ids: new Set<string>(),
    names: new Set<string>(),
  };
}

function addLookup(lookups: CmsFormLookupAccumulator, lookup: string) {
  const normalizedLookup = lookup.trim();
  if (!normalizedLookup) {
    return;
  }

  if (isCmsFormLookupId(normalizedLookup)) {
    lookups.ids.add(normalizedLookup);
    return;
  }

  lookups.names.add(normalizedLookup);
}

function finalizeLookups(lookups: CmsFormLookupAccumulator): CmsFormLookups {
  return {
    ids: [...lookups.ids],
    names: [...lookups.names],
  };
}

function discoverShortcodesInString(value: string, lookups: CmsFormLookupAccumulator) {
  let match: RegExpExecArray | null;
  CMS_FORM_SHORTCODE_RE.lastIndex = 0;

  while ((match = CMS_FORM_SHORTCODE_RE.exec(value)) !== null) {
    addLookup(lookups, match[1]);
  }

  CMS_FORM_SHORTCODE_RE.lastIndex = 0;
}

function walkContent(value: unknown, lookups: CmsFormLookupAccumulator) {
  if (typeof value === "string") {
    discoverShortcodesInString(value, lookups);
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => walkContent(entry, lookups));
    return;
  }

  const record = value as Record<string, unknown>;

  if (record.type === "contact-section") {
    lookups.names.add("contact-block");
  }

  if (typeof record.formName === "string") {
    addLookup(lookups, record.formName);
  }

  Object.values(record).forEach((entry) => walkContent(entry, lookups));
}

export function discoverCmsFormLookups(value: unknown): CmsFormLookups {
  const lookups = createLookupAccumulator();
  walkContent(value, lookups);
  return finalizeLookups(lookups);
}

export function mergeCmsFormLookups(...sources: CmsFormLookups[]): CmsFormLookups {
  const merged = createLookupAccumulator();

  sources.forEach((source) => {
    source.ids.forEach((id) => merged.ids.add(id));
    source.names.forEach((name) => merged.names.add(name));
  });

  return finalizeLookups(merged);
}

export function routeUsesCmsForm(
  form: Pick<CmsForm, "id" | "name">,
  lookups: CmsFormLookups,
) {
  return lookups.ids.includes(form.id) || lookups.names.includes(form.name);
}

export function discoverRouteFormLookups(
  urlPath: string,
  state: CmsPreloadedState,
): CmsFormLookups {
  const normalizedPath = normalizeCmsUrlPath(urlPath);
  const routeLookups = createLookupAccumulator();

  if (normalizedPath === "/" || normalizedPath === "/contact/") {
    routeLookups.names.add("contact");
  }

  if (state.page?.document) {
    walkContent(state.page.document.content, routeLookups);
  }

  if (state.post?.document) {
    walkContent(state.post.document.body, routeLookups);
    walkContent(state.post.document.excerpt, routeLookups);
  }

  return finalizeLookups(routeLookups);
}

async function loadCmsFormByLookup(lookup: string) {
  const filter = isCmsFormLookupId(lookup)
    ? `id=eq.${lookup}`
    : `name=eq.${encodeURIComponent(lookup)}`;
  const rows = await fetchRestRows<CmsForm>(
    `cms_forms?${filter}&limit=1&select=*`,
  );

  return rows[0] ? normalizeCmsForm(rows[0]) : null;
}

export async function loadCmsFormsForLookups(
  lookups: CmsFormLookups,
): Promise<CmsForm[]> {
  const lookupList = [...lookups.ids, ...lookups.names];
  if (lookupList.length === 0) {
    return [];
  }

  const forms = await Promise.all(
    lookupList.map((lookup) => loadCmsFormByLookup(lookup)),
  );

  const dedupedForms = new Map<string, CmsForm>();
  forms.forEach((form) => {
    if (form) {
      dedupedForms.set(form.id, form);
    }
  });

  return [...dedupedForms.values()];
}

export function attachPreloadedForms(
  state: CmsPreloadedState,
  forms: CmsForm[],
) {
  forms.forEach((form) => {
    state.forms.byId[form.id] = form;
    state.forms.byName[form.name] = form;
  });
}

export async function populateRouteForms(
  urlPath: string,
  state: CmsPreloadedState,
) {
  const lookups = discoverRouteFormLookups(urlPath, state);
  const forms = await loadCmsFormsForLookups(lookups);
  attachPreloadedForms(state, forms);
  return forms;
}
