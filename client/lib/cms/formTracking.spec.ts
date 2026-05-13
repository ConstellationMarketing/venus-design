import { describe, expect, it } from "vitest";
import {
  buildFormTrackingPayload,
  isValidRedirectUrl,
  normalizeRedirectUrl,
} from "./formTracking";

describe("buildFormTrackingPayload", () => {
  it("captures UTM fields, click IDs, and page context", () => {
    const payload = buildFormTrackingPayload({
      currentUrl:
        "https://example.com/contact/?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=injury+lawyer&utm_content=hero&gclid=123&fbclid=456&msclkid=789&gbraid=abc&wbraid=xyz",
      landingUrl: "https://example.com/landing/",
      referrer: "https://google.com/",
    });

    expect(payload).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "summer",
      utm_term: "injury lawyer",
      utm_content: "hero",
      landing_page: "https://example.com/landing/",
      submission_page:
        "https://example.com/contact/?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=injury+lawyer&utm_content=hero&gclid=123&fbclid=456&msclkid=789&gbraid=abc&wbraid=xyz",
      referrer: "https://google.com/",
      gclid: "123",
      fbclid: "456",
      msclkid: "789",
      gbraid: "abc",
      wbraid: "xyz",
    });
  });

  it("falls back safely when values are missing", () => {
    const payload = buildFormTrackingPayload({
      currentUrl: "/contact/",
    });

    expect(payload.landing_page).toBe("/contact/");
    expect(payload.submission_page).toBe("/contact/");
    expect(payload.utm_source).toBe("");
    expect(payload.referrer).toBe("");
  });
});

describe("redirect URL validation", () => {
  it("accepts site-relative and absolute http urls", () => {
    expect(normalizeRedirectUrl("/thank-you/")).toBe("/thank-you/");
    expect(normalizeRedirectUrl("https://example.com/thanks")).toBe(
      "https://example.com/thanks",
    );
    expect(normalizeRedirectUrl("http://example.com/thanks")).toBe(
      "http://example.com/thanks",
    );
    expect(isValidRedirectUrl("/thank-you/")).toBe(true);
  });

  it("rejects malformed or unsafe redirect values", () => {
    expect(normalizeRedirectUrl("thank-you")).toBeNull();
    expect(normalizeRedirectUrl("javascript:alert(1)")).toBeNull();
    expect(isValidRedirectUrl("javascript:alert(1)")).toBe(false);
  });
});
