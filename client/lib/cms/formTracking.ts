export const AUTO_TRACKED_FORM_FIELD_NAMES = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "landing_page",
  "submission_page",
  "referrer",
  "gclid",
  "fbclid",
  "msclkid",
  "gbraid",
  "wbraid",
] as const;

export type AutoTrackedFormFieldName =
  (typeof AUTO_TRACKED_FORM_FIELD_NAMES)[number];

export type FormTrackingPayload = Record<AutoTrackedFormFieldName, string>;

export const AUTO_TRACKED_FORM_FIELD_LABELS: Record<
  AutoTrackedFormFieldName,
  string
> = {
  utm_source: "UTM source",
  utm_medium: "UTM medium",
  utm_campaign: "UTM campaign",
  utm_term: "UTM term",
  utm_content: "UTM content",
  landing_page: "Landing page URL",
  submission_page: "Submission page URL",
  referrer: "Referrer URL",
  gclid: "Google click ID",
  fbclid: "Facebook click ID",
  msclkid: "Microsoft click ID",
  gbraid: "Google braid ID",
  wbraid: "Google web braid ID",
};

const TRACKING_QUERY_FIELDS: AutoTrackedFormFieldName[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "gbraid",
  "wbraid",
];

const LANDING_PAGE_STORAGE_KEY = "cms-form-landing-page";

export const EMPTY_FORM_TRACKING_PAYLOAD: FormTrackingPayload =
  AUTO_TRACKED_FORM_FIELD_NAMES.reduce((payload, key) => {
    payload[key] = "";
    return payload;
  }, {} as FormTrackingPayload);

interface BuildFormTrackingPayloadOptions {
  currentUrl?: string | URL | null;
  landingUrl?: string | URL | null;
  referrer?: string | null;
}

function toUrlString(value: string | URL | null | undefined) {
  if (!value) {
    return "";
  }

  return value.toString().trim();
}

function getSearchParams(value: string) {
  if (!value) {
    return new URLSearchParams();
  }

  try {
    return new URL(value, "https://forms.builder.invalid").searchParams;
  } catch {
    const queryIndex = value.indexOf("?");
    return new URLSearchParams(queryIndex >= 0 ? value.slice(queryIndex + 1) : "");
  }
}

function readStoredLandingPage() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.sessionStorage.getItem(LANDING_PAGE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeLandingPage(value: string) {
  if (typeof window === "undefined" || !value) {
    return;
  }

  try {
    window.sessionStorage.setItem(LANDING_PAGE_STORAGE_KEY, value);
  } catch {
    // Ignore sessionStorage failures.
  }
}

export function buildFormTrackingPayload(
  options: BuildFormTrackingPayloadOptions = {},
): FormTrackingPayload {
  const currentUrl = toUrlString(options.currentUrl);
  const landingUrl = toUrlString(options.landingUrl) || currentUrl;
  const referrer = (options.referrer ?? "").trim();
  const searchParams = getSearchParams(currentUrl);

  return {
    ...EMPTY_FORM_TRACKING_PAYLOAD,
    utm_source: searchParams.get("utm_source")?.trim() ?? "",
    utm_medium: searchParams.get("utm_medium")?.trim() ?? "",
    utm_campaign: searchParams.get("utm_campaign")?.trim() ?? "",
    utm_term: searchParams.get("utm_term")?.trim() ?? "",
    utm_content: searchParams.get("utm_content")?.trim() ?? "",
    landing_page: landingUrl,
    submission_page: currentUrl,
    referrer,
    gclid: searchParams.get("gclid")?.trim() ?? "",
    fbclid: searchParams.get("fbclid")?.trim() ?? "",
    msclkid: searchParams.get("msclkid")?.trim() ?? "",
    gbraid: searchParams.get("gbraid")?.trim() ?? "",
    wbraid: searchParams.get("wbraid")?.trim() ?? "",
  };
}

export function getBrowserFormTrackingPayload(): FormTrackingPayload {
  if (typeof window === "undefined") {
    return EMPTY_FORM_TRACKING_PAYLOAD;
  }

  const currentUrl = window.location.href;
  const landingUrl = readStoredLandingPage() || currentUrl;
  storeLandingPage(landingUrl);

  return buildFormTrackingPayload({
    currentUrl,
    landingUrl,
    referrer: document.referrer,
  });
}

export function normalizeRedirectUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function isValidRedirectUrl(value: string | null | undefined) {
  return !value?.trim() || normalizeRedirectUrl(value) !== null;
}

export function getTrackedFieldSummary() {
  return TRACKING_QUERY_FIELDS.map((fieldName) => fieldName)
    .concat(["landing_page", "submission_page", "referrer"])
    .join(", ");
}
