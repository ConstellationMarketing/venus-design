// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("whatconvertsRefresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    delete (window as Window & { _wcq?: unknown })._wcq;
    delete (window as Window & { _wci?: unknown })._wci;
    delete (window as Window & { WhatConverts?: unknown }).WhatConverts;
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("returns absent readiness and stays quiet when no script is present", async () => {
    const module = await import("./whatconvertsRefresh");

    expect(module.getWhatConvertsReadiness().state).toBe("absent");
    expect(() => module.refreshWhatConvertsDni("no-script", { force: true })).not.toThrow();
    expect(document.querySelectorAll("script[data-wc-dni-copy]")).toHaveLength(0);
  });

  it("pushes full route context through the WhatConverts queue when available", async () => {
    window.history.replaceState({}, "", "/contact/?utm_source=test#faq");
    const wcq: Array<Record<string, unknown>> = [];
    (window as Window & { _wcq?: Array<Record<string, unknown>> })._wcq = wcq;

    const module = await import("./whatconvertsRefresh");
    module.refreshWhatConvertsDni("route-change", { force: true });

    expect(wcq).toHaveLength(1);
    expect(wcq[0]).toMatchObject({
      event: "pageview",
      reason: "route-change",
      path: "/contact/?utm_source=test#faq",
      pathname: "/contact/",
      search: "?utm_source=test",
      hash: "#faq",
    });
  });

  it("registers WhatConverts script load handlers and refreshes once the script loads", async () => {
    const wcq: Array<Record<string, unknown>> = [];
    (window as Window & { _wcq?: Array<Record<string, unknown>> })._wcq = wcq;

    const module = await import("./whatconvertsRefresh");
    const script = document.createElement("script");
    script.src = "https://cdn.example.com/whatconverts.js";
    document.head.appendChild(script);

    module.registerWhatConvertsScriptNodes([script], "manual-register");
    script.dispatchEvent(new Event("load"));

    expect(wcq).toHaveLength(1);
    expect(String(wcq[0]["reason"])).toContain("script-load");
  });

  it("schedules repeated refresh attempts and cancels them when requested", async () => {
    const wcq: Array<Record<string, unknown>> = [];
    (window as Window & { _wcq?: Array<Record<string, unknown>> })._wcq = wcq;

    const module = await import("./whatconvertsRefresh");

    module.scheduleRefreshSeries("route-series");
    vi.advanceTimersByTime(3_100);
    expect(wcq).toHaveLength(4);

    wcq.length = 0;
    module.scheduleRefreshSeries("cancelled-series");
    module.cancelScheduledRefreshes();
    vi.advanceTimersByTime(3_100);
    expect(wcq).toHaveLength(0);
  });
});
