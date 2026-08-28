// Endpoint health check komprehensif untuk Coolify, Docker, dan Uptime Kuma.
import type { APIRoute } from "astro";

const API_ORIGIN = (
  import.meta.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_INTERNAL_URL ||
  "http://127.0.0.1:8080"
).replace(/\/+$/, "");

export const GET: APIRoute = async () => {
  const startedAt = Date.now();
  let backendHealth: any = { status: "unknown" };
  let backendLatencyMs = 0;

  try {
    const t0 = Date.now();
    const res = await fetch(`${API_ORIGIN}/api/v1/health`, {
      signal: AbortSignal.timeout(2500),
    });
    backendLatencyMs = Date.now() - t0;
    if (res.ok) {
      const data: any = await res.json();
      backendHealth = data?.data || { status: "healthy" };
    } else {
      backendHealth = { status: "degraded", http_status: res.status };
    }
  } catch (err: any) {
    backendHealth = { status: "unreachable", error: err?.message || String(err) };
  }

  const isHealthy = backendHealth.status === "healthy" || backendHealth.status === "up";

  return new Response(
    JSON.stringify({
      success: isHealthy,
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - startedAt,
      frontend: {
        runtime: "Astro v7 SSR (Node.js)",
        uptime_sec: Math.floor(process.uptime()),
        memory_mb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      },
      backend: {
        ...backendHealth,
        ping_latency_ms: backendLatencyMs,
      },
    }),
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
};