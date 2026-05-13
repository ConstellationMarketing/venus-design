// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRouterState,
  refreshWhatConvertsDni,
  scheduleRefreshSeries,
  cancelScheduledRefreshes,
  startUniversalPhoneSync,
  syncPhoneNumbersNow,
} = vi.hoisted(() => ({
  mockRouterState: {
    location: {
      key: "initial",
      pathname: "/",
      search: "",
      hash: "",
    },
  },
  refreshWhatConvertsDni: vi.fn(),
  scheduleRefreshSeries: vi.fn(),
  cancelScheduledRefreshes: vi.fn(),
  startUniversalPhoneSync: vi.fn(),
  syncPhoneNumbersNow: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useLocation: () => mockRouterState.location,
}));

vi.mock("@site/lib/whatconvertsRefresh", () => ({
  refreshWhatConvertsDni,
  scheduleRefreshSeries,
  cancelScheduledRefreshes,
}));

vi.mock("@site/lib/syncDniPhone", () => ({
  startUniversalPhoneSync,
  syncPhoneNumbersNow,
}));

import WcDniManager from "./WcDniManager";
import { triggerDniRefreshAfterReveal } from "./dniReveal";

describe("WcDniManager", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
    root = createRoot(container);
    mockRouterState.location = {
      key: "initial",
      pathname: "/",
      search: "",
      hash: "",
    };
    refreshWhatConvertsDni.mockReset();
    scheduleRefreshSeries.mockReset();
    cancelScheduledRefreshes.mockReset();
    startUniversalPhoneSync.mockReset();
    syncPhoneNumbersNow.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("refreshes immediately on mount and schedules a route refresh on navigation changes", () => {
    act(() => {
      root.render(<WcDniManager />);
    });

    expect(refreshWhatConvertsDni).toHaveBeenCalledWith("initial-immediate", {
      force: true,
    });
    expect(scheduleRefreshSeries).toHaveBeenCalledWith(
      "initial",
      startUniversalPhoneSync,
    );

    refreshWhatConvertsDni.mockClear();
    scheduleRefreshSeries.mockClear();
    cancelScheduledRefreshes.mockClear();
    startUniversalPhoneSync.mockClear();
    syncPhoneNumbersNow.mockClear();

    mockRouterState.location = {
      key: "contact-page",
      pathname: "/contact/",
      search: "?source=nav",
      hash: "#faq",
    };

    act(() => {
      root.render(<WcDniManager />);
    });

    expect(cancelScheduledRefreshes).toHaveBeenCalled();
    expect(refreshWhatConvertsDni).toHaveBeenCalledWith("route-immediate", {
      force: true,
    });
    expect(scheduleRefreshSeries).toHaveBeenCalledWith(
      "route",
      startUniversalPhoneSync,
    );
  });

  it("re-runs DNI sync after phone-related DOM mutations", async () => {
    act(() => {
      root.render(<WcDniManager />);
    });

    refreshWhatConvertsDni.mockClear();
    startUniversalPhoneSync.mockClear();
    syncPhoneNumbersNow.mockClear();

    act(() => {
      const link = document.createElement("a");
      link.textContent = "404-555-1234";
      document.body.appendChild(link);
      link.setAttribute("href", "tel:4045551234");
    });

    await Promise.resolve();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(refreshWhatConvertsDni).toHaveBeenCalledWith("dom-mutation", {
      force: true,
    });
    expect(syncPhoneNumbersNow).toHaveBeenCalled();
    expect(startUniversalPhoneSync).toHaveBeenCalled();
  });

  it("routes reveal-triggered refreshes through the stronger global refresh flow", () => {
    triggerDniRefreshAfterReveal();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(refreshWhatConvertsDni).toHaveBeenCalledWith("content-reveal", {
      force: true,
    });
    expect(syncPhoneNumbersNow).toHaveBeenCalled();
    expect(startUniversalPhoneSync).toHaveBeenCalled();
    expect(scheduleRefreshSeries).toHaveBeenCalledWith(
      "content-reveal",
      startUniversalPhoneSync,
    );
  });
});
