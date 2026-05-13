import { useEffect } from "react";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";
import {
  refreshWhatConvertsDni,
  registerWhatConvertsScriptNodes,
} from "@site/lib/whatconvertsRefresh";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function findMatchingNode(target: HTMLElement, node: Node): Node | null {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "script") {
    const script = element as HTMLScriptElement;
    if (script.src) {
      return target.querySelector(`script[src="${script.src}"]`);
    }

    const inlineContent = script.textContent?.trim();
    if (!inlineContent) {
      return null;
    }

    return (
      Array.from(target.querySelectorAll("script")).find(
        (existing) => existing.textContent?.trim() === inlineContent,
      ) || null
    );
  }

  if (tagName === "link") {
    const href = element.getAttribute("href");
    const rel = element.getAttribute("rel");
    if (href && rel) {
      return target.querySelector(`link[rel="${rel}"][href="${href}"]`);
    }
  }

  if (tagName === "meta") {
    const name = element.getAttribute("name");
    const property = element.getAttribute("property");
    const content = element.getAttribute("content");

    if (name && content) {
      return target.querySelector(`meta[name="${name}"][content="${content}"]`);
    }

    if (property && content) {
      return target.querySelector(`meta[property="${property}"][content="${content}"]`);
    }
  }

  const outerHtml = element.outerHTML.trim();
  return (
    Array.from(target.children).find(
      (existing) => existing.outerHTML.trim() === outerHtml,
    ) || null
  );
}

function injectHtmlSnippet(html: string, target: HTMLElement): Node[] {
  if (!html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const injected: Node[] = [];
  const sources = [...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)];

  for (const node of sources) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
      continue;
    }

    if (findMatchingNode(target, node)) {
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "SCRIPT") {
      const original = node as HTMLScriptElement;
      const script = document.createElement("script");

      for (const attr of Array.from(original.attributes)) {
        script.setAttribute(attr.name, attr.value);
      }

      if (script.src) {
        script.async = true;
      }

      if (original.textContent) {
        script.textContent = original.textContent;
      }

      target.appendChild(script);
      injected.push(script);
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const clone = node.cloneNode(true);
      target.appendChild(clone);
      injected.push(clone);
    }
  }

  return injected;
}

function injectGA4(measurementId: string): Node[] {
  if (!measurementId) {
    return [];
  }

  if (typeof window.gtag === "function") {
    return [];
  }

  const existingScript = document.querySelector(
    `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`,
  );
  if (existingScript) {
    return [];
  }

  const injected: Node[] = [];
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  document.head.appendChild(script);
  injected.push(script);

  return injected;
}

function injectGoogleAds(adsId: string, conversionLabel: string): Node[] {
  if (!adsId) {
    return [];
  }

  const injected: Node[] = [];

  if (typeof window.gtag !== "function") {
    const existingScript = document.querySelector(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${adsId}"]`,
    );

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag("js", new Date());

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
      script.async = true;
      document.head.appendChild(script);
      injected.push(script);
    }
  }

  window.gtag("config", adsId);

  if (conversionLabel) {
    window.gtag("event", "conversion", {
      send_to: `${adsId}/${conversionLabel}`,
    });
  }

  return injected;
}

export default function GlobalScripts() {
  const { settings, isLoading } = useSiteSettings();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const injected: Node[] = [];

    if (settings.ga4MeasurementId) {
      injected.push(...injectGA4(settings.ga4MeasurementId));
    }

    if (settings.googleAdsId) {
      injected.push(
        ...injectGoogleAds(
          settings.googleAdsId,
          settings.googleAdsConversionLabel,
        ),
      );
    }

    if (settings.headScripts) {
      injected.push(...injectHtmlSnippet(settings.headScripts, document.head));
    }

    if (settings.footerScripts) {
      injected.push(...injectHtmlSnippet(settings.footerScripts, document.body));
    }

    registerWhatConvertsScriptNodes(injected, "head-scripts-injected");
    refreshWhatConvertsDni("head-scripts-injected", { force: true });

    return () => {
      for (const node of injected) {
        node.parentNode?.removeChild(node);
      }
    };
  }, [
    isLoading,
    settings.footerScripts,
    settings.ga4MeasurementId,
    settings.googleAdsConversionLabel,
    settings.googleAdsId,
    settings.headScripts,
  ]);

  return null;
}
