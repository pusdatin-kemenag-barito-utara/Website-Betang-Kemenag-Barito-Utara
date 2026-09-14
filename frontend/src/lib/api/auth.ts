import { request } from "./client";

/**
 * Login: autentikasi kredensial admin dan Cloudflare Turnstile token.
 */
export async function loginAction(_prevState: { error: string | null } | null, formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = ((formData.get("password") as string) || "").trim();
  const turnstileToken = ((formData.get("cf-turnstile-response") as string) || "").trim();
  const rememberMe = (formData.get("rememberMe") as string) === "true";

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  try {
    const res = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, turnstileToken, rememberMe }),
    });
    if (!res.success) {
      return { error: res.error || "Email atau password yang Anda masukkan salah." };
    }
    return { error: null as string | null, user: res.data?.user };
  } catch {
    return { error: "Terjadi kesalahan jaringan saat memproses login." };
  }
}

let pendingCurrentUser: Promise<any> | null = null;
let cachedCurrentUser: { data: any; expiresAt: number } | null = null;

/**
 * Informasi user yang sedang login (nama, role, email) dengan deduplikasi dan in-memory cache 15s.
 */
export async function getCurrentUser(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedCurrentUser && cachedCurrentUser.expiresAt > now) {
    return cachedCurrentUser.data;
  }
  if (!forceRefresh && pendingCurrentUser) {
    return pendingCurrentUser;
  }

  pendingCurrentUser = request("/auth/me")
    .then((res) => {
      if (res.success) {
        cachedCurrentUser = { data: res, expiresAt: Date.now() + 15000 };
      }
      pendingCurrentUser = null;
      return res;
    })
    .catch((err) => {
      pendingCurrentUser = null;
      throw err;
    });

  return pendingCurrentUser;
}

export async function logoutAction() {
  cachedCurrentUser = null;
  pendingCurrentUser = null;
  try {
    try {
      localStorage.removeItem("is_logged_in");
      sessionStorage.clear();
    } catch {}
    await request("/auth/logout", { method: "POST" });
  } catch (err) {
    console.warn("Logout request failed:", err);
  } finally {
    try {
      localStorage.removeItem("is_logged_in");
      localStorage.removeItem("login_user_name");
      localStorage.removeItem("login_success_flash");
      sessionStorage.clear();
    } catch {}
    // Menggunakan replace agar riwayat halaman saat ini dihapus dari browser history
    window.location.replace("/login");
  }
}
