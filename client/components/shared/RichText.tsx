/**
 * Renders CMS rich-text content (HTML from Tiptap) as real HTML.
 * Supports {{form:id}} shortcodes that render CmsFormRenderer inline.
 *
 * Usage:
 *   <RichText html={faq.answer} className="text-white" />
 *
 * If the value is plain text (no tags) it still renders correctly.
 * Accepts the same props as a <div> so you can pass className, style, etc.
 */

import { useMemo, type HTMLAttributes } from "react";
import CmsFormRenderer from "@site/components/shared/CmsFormRenderer";
import { CMS_FORM_SHORTCODE_RE } from "@site/lib/cms/formPreload";

interface RichTextProps extends HTMLAttributes<HTMLDivElement> {
  /** The HTML string from the CMS / Tiptap editor */
  html: string | undefined | null;
  /** Render as a <span> instead of a <div> (for inline contexts) */
  inline?: boolean;
}

export default function RichText({
  html,
  inline = false,
  ...rest
}: RichTextProps) {
  if (!html) {
    return null;
  }

  const hasShortcodes = CMS_FORM_SHORTCODE_RE.test(html);
  CMS_FORM_SHORTCODE_RE.lastIndex = 0;

  if (!hasShortcodes) {
    const Tag = inline ? "span" : "div";
    return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return <RichTextWithForms html={html} inline={inline} {...rest} />;
}

function RichTextWithForms({
  html,
  inline = false,
  ...rest
}: {
  html: string;
  inline?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const segments = useMemo(() => parseSegments(html), [html]);
  const Tag = inline ? "span" : "div";

  return (
    <Tag {...rest}>
      {segments.map((segment, index) =>
        segment.type === "html" ? (
          <span
            key={index}
            dangerouslySetInnerHTML={{ __html: segment.content }}
          />
        ) : (
          <CmsFormRenderer key={index} formId={segment.content} />
        ),
      )}
    </Tag>
  );
}

type Segment =
  | { type: "html"; content: string }
  | { type: "form"; content: string };

function parseSegments(html: string): Segment[] {
  const segments: Segment[] = [];
  const regex = new RegExp(CMS_FORM_SHORTCODE_RE);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "html", content: html.slice(lastIndex, match.index) });
    }

    segments.push({ type: "form", content: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < html.length) {
    segments.push({ type: "html", content: html.slice(lastIndex) });
  }

  return segments;
}
