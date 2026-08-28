// Endpoint proxy upload (paritas /api/proxy-upload Next.js lama).
// Meneruskan PUT ke URL presigned R2 agar browser tidak terkendala CORS.
import type { APIRoute } from "astro";

export const prerender = false;

export const PUT: APIRoute = async ({ request, url }) => {
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  const body = await request.arrayBuffer();
  const contentType = request.headers.get("content-type") || "application/octet-stream";

  try {
    const upstream = await fetch(target, {
      method: "PUT",
      body,
      headers: { "Content-Type": contentType },
    });
    return new Response(upstream.body, { status: upstream.status });
  } catch {
    return new Response("Gagal meneruskan upload ke penyimpanan", { status: 502 });
  }
};