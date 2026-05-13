import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  cancelScheduledRefreshes,
  refreshWhatConvertsDni,
  scheduleRefreshSeries,
} from "@site/lib/whatconvertsRefresh";
import {
  startUniversalPhoneSync,
  syncPhoneNumbersNow,
} from "@site/lib/syncDniPhone";

const PHONE_TEXT_PATTERN = /(?:\+?1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4}\b/;

function nodeMayContainPhoneContent(node: Node | null): boolean {
  if (!node) {
    return false;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return PHONE_TEXT_PATTERN.test(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const element = node as Element;
  if (element.matches('a[href^="tel:"]')) {
    return true;
  }

  if (element.querySelector('a[href^="tel:"]')) {
    return true;
  }

  return PHONE_TEXT_PATTERN.test(element.textContent || "");
}

function mutationMayAffectPhoneContent(mutation: MutationRecord): boolean {
  if (mutation.type === "attributes") {
    return nodeMayContainPhoneContent(mutation.target);
  }

  if (mutation.type === "characterData") {
    return nodeMayContainPhoneContent(mutation.target);
  }

  return [
    ...Array.from(mutation.addedNodes),
    ...Array.from(mutation.removedNodes),
  ].some((node) => nodeMayContainPhoneContent(node));
}

function runImmediateDniPass(reason: string, force = false): void {
  refreshWhatConvertsDni(reason, { force });
  syncPhoneNumbersNow();
}

/**
 * Invisible component that orchestrates WhatConverts DNI refreshes
 * across initial load, route changes, DOM mutations, and content reveals.
 *
 * Must live inside `<BrowserRouter>`.
 */
export default function WcDniManager() {
  const location = useLocation();
  const isFirstMount = useRef(true);
  const mutationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    runImmediateDniPass("initial-immediate", true);
    startUniversalPhoneSync();
    scheduleRefreshSeries("initial", startUniversalPhoneSync);

    const onLoad = () => {
      runImmediateDniPass("window-load", true);
      startUniversalPhoneSync();
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    return () => {
      window.removeEventListener("load", onLoad);
    };
  }, []);

  const navigationSignal = `${location.key}:${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    cancelScheduledRefreshes();
    runImmediateDniPass("route-immediate", true);
    startUniversalPhoneSync();
    scheduleRefreshSeries("route", startUniversalPhoneSync);
  }, [navigationSignal]);

  useEffect(() => {
    if (!document.body) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutationMayAffectPhoneContent(mutation))) {
        return;
      }

      if (mutationDebounce.current) {
        clearTimeout(mutationDebounce.current);
      }

      mutationDebounce.current = setTimeout(() => {
        runImmediateDniPass("dom-mutation", true);
        startUniversalPhoneSync();
      }, 250);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href"],
    });

    return () => {
      observer.disconnect();
      if (mutationDebounce.current) {
        clearTimeout(mutationDebounce.current);
      }
    };
  }, []);

  return null;
}
