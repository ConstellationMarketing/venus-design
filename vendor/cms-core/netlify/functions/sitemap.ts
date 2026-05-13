import type { Handler, HandlerEvent } from "@netlify/functions";

// Sitemap index — lists the sub-sitemaps so crawlers can discover all URLs.
// Sub-sitemaps are served by sitemap-pages.ts and sitemap-posts.ts functions.
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const siteUrl = (
    process.env.URL ||
    `https://${event.headers.host || "localhost"}`
  ).replace(/\/+$/, "");

  const today = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-posts.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
    body: xml,
  };
};
