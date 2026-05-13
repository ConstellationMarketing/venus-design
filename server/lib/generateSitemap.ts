/**
 * Sitemap generation utilities for the dev Express server.
 *
 * Mirrors the Netlify functions in vendor/cms-core/netlify/functions/:
 *   sitemap.ts        → generateSitemapIndex()
 *   sitemap-pages.ts  → generatePagesSitemap()
 *   sitemap-posts.ts  → generatePostsSitemap()
 *
 * CMS database is the single source of truth — no hardcoded routes.
 * Only published, non-noindex content is included.
 */

interface PageRow {
  url_path: string;
  updated_at: string;
  noindex: boolean;
}

interface PostRow {
  slug: string;
  updated_at: string;
  noindex: boolean;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Sitemap index that points to /sitemap-pages.xml and /sitemap-posts.xml */
export function generateSitemapIndex(siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, "");
  const today = new Date().toISOString().split("T")[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(origin)}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(origin)}/sitemap-posts.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

/** Sitemap of all published, indexable CMS pages */
export async function generatePagesSitemap(siteUrl: string): Promise<string> {
  const origin = siteUrl.replace(/\/+$/, "");
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  let pages: PageRow[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/pages?status=eq.published&select=url_path,updated_at,noindex&order=url_path.asc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (res.ok) {
        pages = await res.json();
      } else {
        console.error("[Sitemap] Pages fetch returned", res.status);
      }
    } catch (err) {
      console.error("[Sitemap] Error fetching pages:", err);
    }
  }

  const urlEntries = pages
    .filter((p) => !p.noindex && !p.url_path.startsWith("/admin"))
    .map((p) => {
      const pagePath = p.url_path === '/' ? '/' : p.url_path.replace(/\/?$/, '/');
      const loc = escapeXml(`${origin}${pagePath}`);
      const lastmod = p.updated_at
        ? `\n    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>`
        : "";
      return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;
}

/** Sitemap of all published, indexable blog posts */
export async function generatePostsSitemap(siteUrl: string): Promise<string> {
  const origin = siteUrl.replace(/\/+$/, "");
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  let posts: PostRow[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/posts?status=eq.published&select=slug,updated_at,noindex&order=updated_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      if (res.ok) {
        posts = await res.json();
      } else {
        console.error("[Sitemap] Posts fetch returned", res.status);
      }
    } catch (err) {
      console.error("[Sitemap] Error fetching posts:", err);
    }
  }

  const urlEntries = posts
    .filter((p) => !p.noindex)
    .map((p) => {
      const slug = p.slug.replace(/^\/+|\/+$/g, "");
      const loc = escapeXml(`${origin}/blog/${slug}/`);
      const lastmod = p.updated_at
        ? `\n    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>`
        : "";
      return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`;
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;
}

/**
 * @deprecated Use generateSitemapIndex / generatePagesSitemap / generatePostsSitemap directly.
 * Kept for backwards compatibility with any callers.
 */
export async function generateSitemap(siteUrl: string): Promise<string> {
  return generateSitemapIndex(siteUrl);
}
