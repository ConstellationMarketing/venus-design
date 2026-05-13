import { useLocation, Navigate } from "react-router-dom";

/**
 * Enforces trailing slashes on all URLs (except root "/").
 * Redirects /about → /about/, /blog/my-post → /blog/my-post/, etc.
 * Preserves query strings and hash fragments.
 */
export default function TrailingSlashEnforcer() {
  const { pathname, search, hash } = useLocation();

  // Collapse any double (or more) slashes to a single slash
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed !== pathname) {
    const normalized = collapsed.length > 1 && !collapsed.endsWith("/")
      ? `${collapsed}/`
      : collapsed;
    return <Navigate to={`${normalized}${search}${hash}`} replace />;
  }

  if (pathname.length > 1 && !pathname.endsWith("/")) {
    return <Navigate to={`${pathname}/${search}${hash}`} replace />;
  }

  return null;
}
