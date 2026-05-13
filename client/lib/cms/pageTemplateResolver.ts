import type { PreloadedPageDocument } from "./publicLoaders";
import { isPracticeAreaPageContentShape } from "./publicLoaders";

export type PageTemplateKind = "generic" | "practice";

export function resolvePageTemplate(
  document: PreloadedPageDocument | null | undefined,
): PageTemplateKind {
  if (!document) {
    return "generic";
  }

  if (document.pageType === "practice") {
    return "practice";
  }

  return isPracticeAreaPageContentShape(document.content)
    ? "practice"
    : "generic";
}
