import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(target);
    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.statusText}`, { status: upstream.status });
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "application/pdf");
    headers.set("Content-Disposition", "inline");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response(`Gagal mengambil dokumen PDF: ${err}`, { status: 502 });
  }
};
