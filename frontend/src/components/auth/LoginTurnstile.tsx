import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Loader2, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function isLocalOrPrivateNetwork(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
    h.endsWith(".local")
  );
}

interface LoginTurnstileProps {
  mounted: boolean;
  onTokenChange: (token: string | null) => void;
  siteKey?: string;
  label?: string;
}

export interface LoginTurnstileRef {
  reset: () => void;
}

export const LoginTurnstile = forwardRef<LoginTurnstileRef, LoginTurnstileProps>(
  ({ mounted, onTokenChange, siteKey: propSiteKey, label }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [manualVerified, setManualVerified] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const onTokenChangeRef = useRef(onTokenChange);
    onTokenChangeRef.current = onTokenChange;

    const handleToken = useCallback((token: string | null) => {
      onTokenChangeRef.current(token);
      if (token) {
        setHasError(false);
        setLoading(false);
      }
    }, []);

    const resetWidget = useCallback(() => {
      setHasError(false);
      setManualVerified(false);
      setLoading(true);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // Abaikan jika reset gagal
        }
      }
      onTokenChangeRef.current(null);
      setRetryCount((prev) => prev + 1);
    }, []);

    useImperativeHandle(ref, () => ({
      reset: resetWidget,
    }), [resetWidget]);

    // Injeksi script Cloudflare Turnstile
    useEffect(() => {
      if (!mounted) return;

      if (typeof window !== "undefined" && window.turnstile) {
        setScriptLoaded(true);
        setLoading(false);
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com"]',
      );

      if (existingScript) {
        const checkTurnstile = setInterval(() => {
          if (window.turnstile) {
            clearInterval(checkTurnstile);
            setScriptLoaded(true);
            setLoading(false);
          }
        }, 50);
        return () => clearInterval(checkTurnstile);
      }

      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const checkTurnstile = setInterval(() => {
          if (window.turnstile) {
            clearInterval(checkTurnstile);
            setScriptLoaded(true);
            setLoading(false);
          }
        }, 50);
      };
      script.onerror = () => {
        console.warn("[Turnstile] Script Cloudflare gagal dimuat (mungkin diblokir adblocker / koneksi offline).");
        setLoading(false);
        setHasError(true);
      };
      document.body.appendChild(script);

      // Timeout proteksi: jika dalam 7 detik tidak selesai memuat, tampilkan opsi retry/bypass
      const timeoutTimer = setTimeout(() => {
        if (!window.turnstile) {
          setLoading(false);
          setHasError(true);
        }
      }, 7000);

      return () => clearTimeout(timeoutTimer);
    }, [mounted]);

    // Render Widget Turnstile
    useEffect(() => {
      if (!scriptLoaded || !containerRef.current) return;

      const isLocal = isLocalOrPrivateNetwork();
      const isIP = typeof window !== "undefined" && (/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname));

      // Cloudflare Turnstile tidak mengizinkan IP address pada production sitekey (akan selalu "Failed").
      // Gunakan official Cloudflare testing key "1x00000000000000000000AA" khusus IP lokal / dev test.
      let effectiveSiteKey =
        propSiteKey ||
        (typeof window !== "undefined" && window.__PUBLIC_ENV__?.PUBLIC_TURNSTILE_SITE_KEY) ||
        (typeof window !== "undefined" && window.__PUBLIC_ENV__?.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ||
        import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
        import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
        "";

      if (isLocal && isIP) {
        // Dummy test key resmi Cloudflare (selalu valid di IP lokal / testing mana saja)
        effectiveSiteKey = "1x00000000000000000000AA";
      }

      if (!effectiveSiteKey) {
        console.warn("[Turnstile] PUBLIC_TURNSTILE_SITE_KEY tidak disetel.");
        setLoading(false);
        return;
      }

      if (typeof window === "undefined" || !window.turnstile) {
        return;
      }

      // Bersihkan widget lama bila sedang retry
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: effectiveSiteKey,
          theme: "light",
          size: "flexible",
          callback: (token: string) => {
            setLoading(false);
            setHasError(false);
            handleToken(token);
          },
          "expired-callback": () => {
            handleToken(null);
          },
          "error-callback": () => {
            console.warn("[Turnstile] Error-callback dipanggil oleh Cloudflare widget.");
            handleToken(null);
            setLoading(false);
            setHasError(true);
          },
        });
        setLoading(false);
      } catch (err) {
        console.error("Turnstile render failed:", err);
        setLoading(false);
        setHasError(true);
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (e) {
            console.error("Turnstile cleanup failed", e);
          }
          widgetIdRef.current = null;
        }
      };
    }, [scriptLoaded, propSiteKey, handleToken, retryCount]);

    const isLocal = isLocalOrPrivateNetwork();

    return (
      <div className="flex flex-col items-center gap-1.5 w-full">
        {label && (
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            {label}
          </span>
        )}

        {/* Indikator Loading */}
        {loading && (
          <div className="flex items-center justify-center h-[65px] w-full rounded-2xl border border-slate-200 bg-slate-50 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        )}

        {/* Sukses Bypass Manual (Mode Pengujian HP / Dev) */}
        {manualVerified && (
          <div className="flex items-center justify-center gap-2 h-[55px] w-full rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Terverifikasi (Mode Pengujian Lokal HP)</span>
          </div>
        )}

        {/* Penanganan Error: Saat Turnstile Menampilkan "Failed" atau Diblokir */}
        {hasError && !manualVerified && (
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-center gap-2 w-full animate-in fade-in">
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Verifikasi Keamanan Terkendala</span>
            </div>

            {isLocal ? (
              <>
                <p className="text-[11px] text-amber-700 leading-snug">
                  Cloudflare membatasi verifikasi di alamat IP lokal (192.168.x.x). Klik tombol di bawah untuk meloloskan verifikasi pengujian HP:
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setManualVerified(true);
                      setHasError(false);
                      handleToken("dev-turnstile-bypass");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Loloskan Verifikasi Dev
                  </button>
                  <button
                    type="button"
                    onClick={resetWidget}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/50 text-amber-800 border border-amber-300 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Coba Lagi
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] text-amber-700 leading-snug">
                  Gagal memuat widget verifikasi (koneksi terputus atau diblokir DNS/ad-blocker).
                </p>
                <button
                  type="button"
                  onClick={resetWidget}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba Ulang Verifikasi
                </button>
              </>
            )}
          </div>
        )}

        {/* Container Asli Widget Turnstile */}
        <div
          ref={containerRef}
          className={`w-full min-h-[65px] flex items-center justify-center [&>div]:!w-full [&_iframe]:!w-full [&_iframe]:!max-w-none [&_iframe]:rounded-2xl ${
            loading || manualVerified || hasError ? "hidden" : ""
          }`}
        />
      </div>
    );
  },
);

LoginTurnstile.displayName = "LoginTurnstile";
