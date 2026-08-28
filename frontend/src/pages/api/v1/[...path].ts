// Reverse proxy /api/v1/* ke Backend Go Fiber.
// Memungkinkan frontend dan backend berjalan same-origin tanpa kendala CORS/Cookie.
import type { APIRoute } from "astro";

export const prerender = false;

function getCandidateOrigins(): string[] {
  const custom =
    import.meta.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    import.meta.env.BACKEND_URL ||
    process.env.BACKEND_URL;
  const urls: string[] = [];
  if (custom) urls.push(custom.replace(/\/+$/, ""));
  urls.push("http://backend:8080");
  urls.push("http://127.0.0.1:8080");
  urls.push("http://localhost:8080");
  return Array.from(new Set(urls));
}

let activeProxyOrigin = "";

export const ALL: APIRoute = async ({ request, params }) => {
  const url = new URL(request.url);
  const subpath = params.path || "";
  const reqHeaders = new Headers(request.headers);
  reqHeaders.delete("host");

  const isBodyless = ["GET", "HEAD"].includes(request.method);
  const body = isBodyless ? undefined : await request.arrayBuffer();

  const candidateOrigins = activeProxyOrigin
    ? [activeProxyOrigin, ...getCandidateOrigins().filter((u) => u !== activeProxyOrigin)]
    : getCandidateOrigins();

  let lastError: any = null;
  for (const origin of candidateOrigins) {
    const targetUrl = `${origin}/api/v1/${subpath}${url.search}`;
    try {
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: reqHeaders,
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });

      activeProxyOrigin = origin;
      const resHeaders = new Headers(upstream.headers);
      resHeaders.delete("transfer-encoding");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: resHeaders,
      });
    } catch (err) {
      lastError = err;
    }
  }
  console.error(`[API PROXY ERROR] Gagal meneruskan ${request.method} ${url.pathname} ke backend:`, lastError);
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
};
