// Reverse proxy /api/v1/* ke Backend Go Fiber.
// Memungkinkan frontend dan backend berjalan same-origin tanpa kendala CORS/Cookie.
import type { APIRoute } from "astro";

export const prerender = false;

const BACKEND_URL = (
  import.meta.env.BACKEND_INTERNAL_URL ||
  import.meta.env.PUBLIC_API_URL ||
  "http://127.0.0.1:8080"
).replace(/\/+$/, "");

export const ALL: APIRoute = async ({ request, params }) => {
  const url = new URL(request.url);
  const subpath = params.path || "";
  const targetUrl = `${BACKEND_URL}/api/v1/${subpath}${url.search}`;

  const reqHeaders = new Headers(request.headers);
  reqHeaders.delete("host");

  try {
    const isBodyless = ["GET", "HEAD"].includes(request.method);
    const body = isBodyless ? undefined : await request.arrayBuffer();

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: reqHeaders,
      body,
      redirect: "manual",
    });

    const resHeaders = new Headers(upstream.headers);
    // Hapus header transfer-encoding jika ada agar tidak bentrok
    resHeaders.delete("transfer-encoding");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (error) {
    console.error(`[API PROXY ERROR] Gagal meneruskan ${request.method} ${url.pathname} ke ${targetUrl}:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Gagal terhubung ke server backend API. Pastikan server backend sedang berjalan.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
