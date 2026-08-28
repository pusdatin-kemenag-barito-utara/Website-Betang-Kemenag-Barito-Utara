import type { APIRoute } from "astro";

export const prerender = false;

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

export const GET: APIRoute = async ({ site, url }) => {
  const baseUrl = (site?.toString() || url.origin || "https://arsip.kemenag-baritoutara.com").replace(/\/+$/, "");
  const currentDate = new Date().toISOString().split("T")[0];

  const entries: SitemapEntry[] = [
    {
      loc: `${baseUrl}/`,
      lastmod: currentDate,
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/login`,
      lastmod: currentDate,
      changefreq: "weekly",
      priority: 0.8,
    },
    {
      loc: `${baseUrl}/starred`,
      lastmod: currentDate,
      changefreq: "weekly",
      priority: 0.7,
    },
    {
      loc: `${baseUrl}/offline`,
      lastmod: currentDate,
      changefreq: "monthly",
      priority: 0.5,
    },
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod || currentDate}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemapXml.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
