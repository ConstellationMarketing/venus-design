const ABSOLUTE_URL_RE = /^https?:\/\//i;
const PROTOCOL_RELATIVE_RE = /^\/\//;
const SPECIAL_LINK_RE = /^(mailto:|tel:|#|\?)/i;
const ROOT_RELATIVE_RE = /^\//;
const DOMAIN_LIKE_RE = /^(?:www\.)?[^/\s]+\.[^/\s]+(?:\/.*)?$/i;

/**
 * Normalize a CMS-entered link so internal site paths remain site-relative,
 * while true external URLs keep or receive an https:// prefix.
 */
export function normalizeCmsLinkHref(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  if (ABSOLUTE_URL_RE.test(trimmed)) {
    return trimmed;
  }

  if (PROTOCOL_RELATIVE_RE.test(trimmed)) {
    return `https:${trimmed}`;
  }

  if (ROOT_RELATIVE_RE.test(trimmed) || SPECIAL_LINK_RE.test(trimmed)) {
    return trimmed;
  }

  if (DOMAIN_LIKE_RE.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return `/${trimmed.replace(/^[./]+/, "")}`;
}
