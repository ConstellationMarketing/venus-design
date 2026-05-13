import type { Handler, HandlerEvent } from "@netlify/functions";

interface PageRow {
  url_path: string;
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

// Serves /sitemap-pages.xml — all published, indexable CMS pages.
// CMS database is the single source of truth; no hardcoded routes.
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const siteUrl = (
    process.env.URL ||
    `https://${event.headers.host || "localhost"}`
  ).replace(/\/+$/, "");

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase not configured");
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/pages?status=eq.published&select=url_path,updated_at,noindex&order=url_path.asc`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase API returned ${response.status}`);
    }

    const pages: PageRow[] = await response.json();

    const urlEntries = pages
      .filter((p) => !p.noindex && !p.url_path.startsWith("/admin"))
      .map((p) => {
        const pagePath = p.url_path === '/' ? '/' : p.url_path.replace(/\/?$/, '/');
        const loc = escapeXml(`${siteUrl}${pagePath}`);
        const lastmod = p.updated_at
          ? `\n    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>`
          : "";
        return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`;
      });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
      body: xml,
    };
  } catch (err) {
    console.error("[sitemap-pages] Error:", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
