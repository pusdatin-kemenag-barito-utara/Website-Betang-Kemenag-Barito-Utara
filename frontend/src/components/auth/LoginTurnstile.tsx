import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
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
    const onTokenChangeRef = useRef(onTokenChange);
    onTokenChangeRef.current = onTokenChange;

    const handleToken = useCallback((token: string | null) => {
      onTokenChangeRef.current(token);
    }, []);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          onTokenChangeRef.current(null);
        }
      },
    }), []);

    useEffect(() => {
      if (!mounted) return;

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
        }, 100);
        return () => clearInterval(checkTurnstile);
      }

      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true);
        setLoading(false);
      };
      script.onerror = () => {
        console.error("Turnstile script failed to load");
        setLoading(false);
      };
      document.body.appendChild(script);

      return () => {};
    }, [mounted]);

    useEffect(() => {
      if (!scriptLoaded || !containerRef.current || widgetIdRef.current) return;

      const siteKey =
        propSiteKey ||
        import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
        import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      if (!siteKey) {
        console.error("PUBLIC_TURNSTILE_SITE_KEY is not set");
        return;
      }

      try {
        widgetIdRef.current = window.turnstile!.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
          size: "flexible",
          callback: (token: string) => handleToken(token),
          "expired-callback": () => handleToken(null),
          "error-callback": () => handleToken(null),
        });
      } catch (err) {
        console.error("Turnstile render failed:", err);
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
    }, [scriptLoaded, propSiteKey, handleToken]);

    return (
      <div className="flex flex-col items-center gap-1.5 w-full">
        {label && (
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            {label}
          </span>
        )}

        {loading && (
          <div className="flex items-center justify-center h-[65px] w-full rounded-2xl border border-slate-200 bg-slate-50 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        )}

        <div
          ref={containerRef}
          className={`w-full min-h-[65px] flex items-center justify-center [&>div]:!w-full [&_iframe]:!w-full [&_iframe]:!max-w-none [&_iframe]:rounded-2xl ${
            loading ? "hidden" : ""
          }`}
        />
      </div>
    );
  },
);

LoginTurnstile.displayName = "LoginTurnstile";
