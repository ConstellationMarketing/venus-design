import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

interface SiteLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

function isExternalHref(href: string) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href);
}

export default function SiteLink({
  href,
  children,
  rel,
  target,
  ...props
}: SiteLinkProps) {
  if (isExternalHref(href)) {
    const linkRel = target === "_blank"
      ? rel ?? "noopener noreferrer"
      : rel;

    return (
      <a href={href} target={target} rel={linkRel} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} {...props}>
      {children}
    </Link>
  );
}
