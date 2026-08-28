// Endpoint proxy download (paritas /api/proxy-download Next.js lama).
// Meneruskan GET ke URL presigned R2 agar browser tidak terkendala CORS.
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(target, { redirect: "follow" });
    const disposition = upstream.headers.get("content-disposition") || "";
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
        ...(disposition ? { "Content-Disposition": disposition } : {}),
      },
    });
  } catch {
    return new Response("Gagal meneruskan download dari penyimpanan", { status: 502 });
  }
};