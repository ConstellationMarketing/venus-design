/**
 * WhatConverts Dynamic Number Insertion (DNI) refresh utility for SPAs.
 *
 * WhatConverts only scans phone numbers on full page loads by default.
 * This module re-triggers that scan after client-side route changes so
 * dynamically rendered phone numbers are still replaced with tracking numbers.
 *
 * The WC script itself is added by the site owner via Site Settings >
 * Analytics & Scripts > Head Scripts — this utility is a silent no-op
 * when the WC globals don't exist (not installed or ad-blocked).
 */

declare global {
  interface Window {
    /** WhatConverts command queue (official SPA API) */
    _wcq?: Array<Record<string, unknown>>;
    /** WhatConverts internal instance */
    _wci?: { run?: () => void };
    /** WhatConverts public namespace */
    WhatConverts?: { track?: () => void };
  }
}

export type WhatConvertsReadinessState = "absent" | "script-pending" | "ready";

interface WhatConvertsReadiness {
  state: WhatConvertsReadinessState;
  scripts: HTMLScriptElement[];
}

const THROTTLE_MS = 500;
const CLONE_THROTTLE_MS = 2_000;
const WHATCONVERTS_INLINE_PATTERN = /whatconverts|_wcq|_wci|WhatConverts/i;

let lastCallTs = 0;
let lastCloneTs = 0;
let scheduledTimers: ReturnType<typeof setTimeout>[] = [];
const observedWhatConvertsScripts = new WeakSet<HTMLScriptElement>();
let scriptObserverStarted = false;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function hasReadyWhatConvertsApi(): boolean {
  return Boolean(
    Array.isArray(window._wcq)
      || typeof window._wci?.run === "function"
      || typeof window.WhatConverts?.track === "function",
  );
}

function isWhatConvertsScript(script: HTMLScriptElement): boolean {
  const src = script.getAttribute("src")?.toLowerCase() ?? "";
  if (src.includes("whatconverts")) {
    return true;
  }

  const inlineContent = script.textContent?.trim() ?? "";
  return WHATCONVERTS_INLINE_PATTERN.test(inlineContent);
}

function collectWhatConvertsScripts(nodes?: Iterable<Node>): HTMLScriptElement[] {
  if (!isBrowser()) {
    return [];
  }

  if (!nodes) {
    return Array.from(document.querySelectorAll("script")).filter(isWhatConvertsScript);
  }

  const scripts = new Set<HTMLScriptElement>();

  const collectFromNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as Element;

    if (element.tagName === "SCRIPT") {
      const script = element as HTMLScriptElement;
      if (isWhatConvertsScript(script)) {
        scripts.add(script);
      }
    }

    element.querySelectorAll("script").forEach((nestedNode) => {
      const nestedScript = nestedNode as HTMLScriptElement;
      if (isWhatConvertsScript(nestedScript)) {
        scripts.add(nestedScript);
      }
    });
  };

  for (const node of nodes) {
    collectFromNode(node);
  }

  return Array.from(scripts);
}

function getRouteContext(): Record<string, string> {
  if (!isBrowser()) {
    return {
      path: "",
      pathname: "",
      search: "",
      hash: "",
      url: "",
    };
  }

  const pathname = window.location.pathname || "/";
  const search = window.location.search || "";
  const hash = window.location.hash || "";

  return {
    path: `${pathname}${search}${hash}`,
    pathname,
    search,
    hash,
    url: window.location.href,
  };
}

function observeWhatConvertsScripts(
  scripts: HTMLScriptElement[],
  reason: string,
): void {
  if (!isBrowser()) {
    return;
  }

  for (const script of scripts) {
    if (observedWhatConvertsScripts.has(script)) {
      continue;
    }

    observedWhatConvertsScripts.add(script);
    script.addEventListener(
      "load",
      () => {
        refreshWhatConvertsDni(`${reason}-script-load`, {
          force: true,
          retryOnLoad: false,
        });
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        // Silent — a blocked analytics script should never affect the app
      },
      { once: true },
    );
  }
}

function ensureWhatConvertsScriptObserver(): void {
  if (!isBrowser() || scriptObserverStarted || typeof MutationObserver === "undefined") {
    return;
  }

  scriptObserverStarted = true;

  const observer = new MutationObserver((mutations) => {
    const addedNodes: Node[] = [];

    for (const mutation of mutations) {
      addedNodes.push(...Array.from(mutation.addedNodes));
    }

    if (addedNodes.length === 0) {
      return;
    }

    registerWhatConvertsScriptNodes(addedNodes, "script-observer");
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  registerWhatConvertsScriptNodes(undefined, "script-observer-init");
}

function cloneWhatConvertsScript(original: HTMLScriptElement): void {
  const now = Date.now();
  if (now - lastCloneTs < CLONE_THROTTLE_MS) {
    return;
  }

  lastCloneTs = now;

  document
    .querySelectorAll("script[data-wc-dni-copy]")
    .forEach((element) => element.parentNode?.removeChild(element));

  const clone = document.createElement("script");
  clone.src = original.src;
  clone.async = true;
  clone.setAttribute("data-wc-dni-copy", "true");
  document.head.appendChild(clone);
  observeWhatConvertsScripts([clone], "script-clone");
}

export function getWhatConvertsReadiness(): WhatConvertsReadiness {
  if (!isBrowser()) {
    return {
      state: "absent",
      scripts: [],
    };
  }

  const scripts = collectWhatConvertsScripts();
  if (hasReadyWhatConvertsApi()) {
    return {
      state: "ready",
      scripts,
    };
  }

  if (scripts.length > 0) {
    return {
      state: "script-pending",
      scripts,
    };
  }

  return {
    state: "absent",
    scripts: [],
  };
}

export function registerWhatConvertsScriptNodes(
  nodes?: Iterable<Node>,
  reason = "script-register",
): void {
  if (!isBrowser()) {
    return;
  }

  ensureWhatConvertsScriptObserver();
  const scripts = collectWhatConvertsScripts(nodes);
  if (scripts.length > 0) {
    observeWhatConvertsScripts(scripts, reason);
  }
}

/**
 * Attempt to re-run the WhatConverts DNI scan.
 *
 * @param reason  Human-readable label used only for debug logging.
 * @param opts.force  When `true`, bypasses the throttle.
 */
export function refreshWhatConvertsDni(
  reason: string,
  opts?: { force?: boolean; retryOnLoad?: boolean },
): void {
  if (!isBrowser()) {
    return;
  }

  ensureWhatConvertsScriptObserver();

  const now = Date.now();
  if (!opts?.force && now - lastCallTs < THROTTLE_MS) {
    return;
  }

  lastCallTs = now;

  const readiness = getWhatConvertsReadiness();
  if (readiness.state === "absent") {
    return;
  }

  if (opts?.retryOnLoad !== false) {
    observeWhatConvertsScripts(readiness.scripts, reason);
  }

  const routeContext = getRouteContext();

  try {
    if (Array.isArray(window._wcq)) {
      window._wcq.push({
        event: "pageview",
        reason,
        ...routeContext,
      });
      return;
    }
  } catch {
    // Silently continue to next strategy
  }

  try {
    if (typeof window._wci?.run === "function") {
      window._wci.run();
      return;
    }

    if (typeof window.WhatConverts?.track === "function") {
      window.WhatConverts.track();
      return;
    }
  } catch {
    // Silently continue to next strategy
  }

  try {
    const original = readiness.scripts.find(
      (script) => script.src && !script.hasAttribute("data-wc-dni-copy"),
    );
    if (!original?.src) {
      return;
    }

    cloneWhatConvertsScript(original);
  } catch {
    // Silent — never break the app for analytics
  }
}

export function cancelScheduledRefreshes(): void {
  for (const id of scheduledTimers) {
    clearTimeout(id);
  }
  scheduledTimers = [];
}

export function scheduleRefreshSeries(
  reason: string,
  callback?: () => void,
): void {
  cancelScheduledRefreshes();

  const delays = [100, 500, 1500, 3000];

  for (const delay of delays) {
    const id = setTimeout(() => {
      refreshWhatConvertsDni(`${reason}-series-${delay}`, { force: true });
      try {
        callback?.();
      } catch {
        // Silent
      }
    }, delay);
    scheduledTimers.push(id);
  }
}
