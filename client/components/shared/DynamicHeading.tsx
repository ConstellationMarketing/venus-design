import type { ElementType, HTMLAttributes } from "react";

interface DynamicHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The HTML heading tag to render (e.g. "h1", "h2"). Defaults to defaultTag. */
  tag?: string;
  /** Fallback tag if none is specified. Defaults to "h2". */
  defaultTag?: string;
  children: React.ReactNode;
}

const VALID_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/**
 * Renders a heading element using the specified tag while keeping the
 * same className / styling regardless of which tag is chosen.
 * This lets CMS admins change heading levels for SEO without
 * affecting the visual design.
 */
export default function DynamicHeading({
  tag,
  defaultTag = "h2",
  children,
  ...rest
}: DynamicHeadingProps) {
  const resolvedTag = tag && VALID_TAGS.has(tag) ? tag : defaultTag;
  const Tag = resolvedTag as ElementType;
  return <Tag {...rest}>{children}</Tag>;
}
