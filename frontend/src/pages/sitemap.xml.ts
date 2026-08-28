import type { APIRoute } from "astro";

export const prerender = false;

interface SitemapItem {
  url: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  lastmod?: string;
}

export const GET: APIRoute = async ({ url, site }) => {
  const baseUrl = (site?.toString() || url.origin).replace(/\/+$/, "");
  const today = new Date().toISOString().split("T")[0];

  const routes: SitemapItem[] = [
    {
      url: `${baseUrl}/`,
      changefreq: "daily",
      priority: 1.0,
      lastmod: today,
    },
    {
      url: `${baseUrl}/login`,
      changefreq: "monthly",
      priority: 0.8,
      lastmod: today,
    },
    {
      url: `${baseUrl}/folders/root`,
      changefreq: "daily",
      priority: 0.9,
      lastmod: today,
    },
    {
      url: `${baseUrl}/offline`,
      changefreq: "yearly",
      priority: 0.3,
      lastmod: today,
    },
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${routes
  .map(
    (item) => `  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastmod || today}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex, follow",
    },
  });
};
