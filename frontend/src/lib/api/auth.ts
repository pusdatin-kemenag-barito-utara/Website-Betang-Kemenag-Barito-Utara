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

/**
 * Informasi user yang sedang login (nama, role, email).
 */
export async function getCurrentUser() {
  return request("/auth/me");
}

/**
 * Keluar dari sesi dan redirect ke halaman login.
 */
export async function logoutAction() {
  try {
    await request("/auth/logout", { method: "POST" });
    window.location.href = "/login";
  } catch {
    window.location.href = "/login";
  }
}
