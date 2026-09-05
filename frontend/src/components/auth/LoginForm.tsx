// Form login: autentikasi kredensial pengguna, Turnstile, remember me,
// serta notifikasi alert & toaster saat berhasil masuk ke sistem.
import { KeyRound, Mail, AlertCircle, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { LoginTurnstile } from "./LoginTurnstile";
import { loginAction } from "@/lib/api";
import { trackEvent, setAnalyticsUser } from "@/lib/analytics";
import { toast } from "sonner";

interface LoginFormProps {
  siteKey?: string;
}

export function LoginForm({ siteKey }: LoginFormProps) {
  const activeSiteKey =
    siteKey ||
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
    import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const [mounted, setMounted] = useState(false);

  // Muat email yang disimpan jika sebelumnya memilih Ingat Saya
  useEffect(() => {
    setMounted(true);
    try {
      const savedEmail = localStorage.getItem("betang_remember_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Abaikan jika localStorage diblokir
    }
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Token Turnstile disuntikkan bila tersedia.
    if (turnstileToken) {
      formData.set("cf-turnstile-response", turnstileToken);
    }

    setError(null);
    setIsPending(true);

    trackEvent("login_attempt", {
      button_name: "Masuk ke Sistem",
      remember_me: rememberMe,
    });

    try {
      const result = await loginAction(null, formData);
      if (result.error) {
        setError(result.error);
        trackEvent("login_failed", {
          error_message: result.error,
        });
        toast.error(result.error || "Gagal masuk");
        // Reset Turnstile agar token tidak dipakai ulang.
        formData.set("cf-turnstile-response", "");
        setTurnstileToken("");
        setIsPending(false);
      } else {
        setIsSuccess(true);
        const displayName = result.user?.name || email.split("@")[0] || "Admin";

        trackEvent("login", {
          method: "password",
          role: result.user?.role || "admin",
        });
        if (result.user) {
          setAnalyticsUser(result.user.id, result.user.role, result.user.email);
        }

        // Tampilkan toaster pemberitahuan berhasil login ringkas
        toast.success(`Login Berhasil! Selamat datang, ${displayName}.`, {
          duration: 2500,
        });

        // Simpan / hapus email di localStorage sesuai pilihan Ingat Saya
        try {
          localStorage.setItem("is_logged_in", "true");
          if (rememberMe) {
            localStorage.setItem("betang_remember_email", email.trim());
          } else {
            localStorage.removeItem("betang_remember_email");
          }
          sessionStorage.setItem("login_success_flash", "true");
          sessionStorage.setItem("login_user_name", displayName);
        } catch {
          // Abaikan
        }

        // Alihkan halaman ke dashboard
        setTimeout(() => {
          window.location.href = "/";
        }, 450);
      }
    } catch {
      const errMsg = "Terjadi kesalahan jaringan saat memproses login.";
      setError(errMsg);
      toast.error(errMsg);
      trackEvent("login_failed", { error_message: errMsg });
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Alert Error Login */}
      {error && !isSuccess && (
        <div className="flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label
          className="ml-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase"
          htmlFor="email"
        >
          Email Admin
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Mail className="h-5 w-5" />
          </div>
          <input
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending || isSuccess}
            className="flex h-14 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 pl-11 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-60"
            placeholder="admin@kemenag.go.id"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="ml-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase"
          htmlFor="password"
        >
          Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <input
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending || isSuccess}
            className="flex h-14 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 pl-11 pr-11 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-60"
            placeholder="••••••••••••"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending || isSuccess}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Ingat Saya Checkbox */}
      <div className="flex items-center justify-between px-1">
        <label htmlFor="rememberMe" className="flex items-center gap-2.5 cursor-pointer select-none">
          <div className="relative">
            <input
              id="rememberMe"
              type="checkbox"
              name="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isPending || isSuccess}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
          </div>
          <span className="text-xs font-semibold text-slate-600">Ingat Saya</span>
        </label>
      </div>

      {/* Cloudflare Turnstile */}
      <div className="flex justify-center min-h-[65px] items-center w-full">
        <LoginTurnstile
          mounted={mounted}
          siteKey={activeSiteKey}
          onTokenChange={(token) => setTurnstileToken(token || "")}
        />
      </div>

      <button
        className={`group relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl text-sm font-bold tracking-wider text-white uppercase shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none ${
          isSuccess
            ? "bg-emerald-700 shadow-emerald-700/30 ring-2 ring-emerald-400"
            : "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30 focus:ring-emerald-500"
        }`}
        type="submit"
        disabled={isPending || isSuccess}
      >
        <span className="relative flex items-center gap-2">
          {isSuccess ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-200 animate-pulse" />
              <span>Berhasil! Mengalihkan...</span>
            </>
          ) : isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Masuk Ke Dashboard</span>
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </span>
      </button>
    </form>
  );
}