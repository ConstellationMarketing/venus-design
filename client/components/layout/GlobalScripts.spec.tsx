// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteSettings } from "@site/lib/cms/publicLoaders";

const {
  mockUseSiteSettings,
  refreshWhatConvertsDni,
  registerWhatConvertsScriptNodes,
} = vi.hoisted(() => ({
  mockUseSiteSettings: vi.fn(),
  refreshWhatConvertsDni: vi.fn(),
  registerWhatConvertsScriptNodes: vi.fn(),
}));

vi.mock("@site/contexts/SiteSettingsContext", () => ({
  useSiteSettings: () => mockUseSiteSettings(),
}));

vi.mock("@site/lib/whatconvertsRefresh", () => ({
  refreshWhatConvertsDni,
  registerWhatConvertsScriptNodes,
}));

import GlobalScripts from "./GlobalScripts";

const baseSettings: SiteSettings = {
  siteName: "",
  logoUrl: "",
  logoAlt: "",
  faviconSourceUrl: "",
  faviconAssets: null,
  phoneNumber: "",
  phoneDisplay: "",
  phoneAvailability: "",
  applyPhoneGlobally: true,
  headerCtaText: "",
  headerCtaUrl: "",
  navigationItems: [],
  footerAboutLinks: [],
  footerPracticeLinks: [],
  footerResourcesHeading: "",
  footerPracticeAreasHeading: "",
  footerTaglineHtml: "",
  addressLine1: "",
  addressLine2: "",
  mapEmbedUrl: "",
  socialLinks: [],
  copyrightText: "",
  siteUrl: "",
  siteNoindex: false,
  ga4MeasurementId: "",
  googleAdsId: "",
  googleAdsConversionLabel: "",
  headScripts: '<script src="https://cdn.example.com/whatconverts.js"></script>',
  footerScripts: '<script>window.footerMarker = true;</script>',
  globalSchema: "",
};

describe("GlobalScripts", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockUseSiteSettings.mockReturnValue({
      settings: baseSettings,
      isLoading: false,
    });
    refreshWhatConvertsDni.mockReset();
    registerWhatConvertsScriptNodes.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  it("injects site scripts once and registers WhatConverts readiness", () => {
    act(() => {
      root.render(<GlobalScripts />);
    });

    expect(document.head.querySelectorAll('script[src="https://cdn.example.com/whatconverts.js"]')).toHaveLength(1);
    expect(document.body.querySelectorAll("script").length).toBeGreaterThanOrEqual(1);
    expect(registerWhatConvertsScriptNodes).toHaveBeenCalledTimes(1);
    expect(refreshWhatConvertsDni).toHaveBeenCalledWith("head-scripts-injected", {
      force: true,
    });

    act(() => {
      root.render(<GlobalScripts />);
    });

    expect(document.head.querySelectorAll('script[src="https://cdn.example.com/whatconverts.js"]')).toHaveLength(1);
  });

  it("does nothing while site settings are still loading", () => {
    mockUseSiteSettings.mockReturnValue({
      settings: baseSettings,
      isLoading: true,
    });

    act(() => {
      root.render(<GlobalScripts />);
    });

    expect(document.head.querySelectorAll("script")).toHaveLength(0);
    expect(registerWhatConvertsScriptNodes).not.toHaveBeenCalled();
    expect(refreshWhatConvertsDni).not.toHaveBeenCalled();
  });
});
