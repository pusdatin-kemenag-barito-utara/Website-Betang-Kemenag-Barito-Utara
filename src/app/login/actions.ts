'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function loginAction(prevState: { error: string | null } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const turnstileToken = formData.get('cf-turnstile-response') as string
  const rememberMe = formData.get('rememberMe') === 'true'

  // Validasi input dasar
  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' }
  }

  // 1. Validasi Turnstile
  if (!turnstileToken) {
    return { error: 'Validasi keamanan gagal. Silakan centang kotak "I am human".' }
  }

  const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY

  try {
    const turnstileResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${SECRET_KEY}&response=${turnstileToken}`,
      }
    )

    const turnstileResult = await turnstileResponse.json()

    if (!turnstileResult.success) {
      return { error: 'Sistem mendeteksi aktivitas mencurigakan. Silakan muat ulang halaman.' }
    }
  } catch {
    return { error: 'Terjadi kesalahan jaringan saat memvalidasi keamanan.' }
  }

  // 2. Autentikasi dengan Supabase
  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !authData.user) {
    return { error: 'Email atau password yang Anda masukkan salah.' }
  }

  // 3. Verifikasi ketersediaan pengguna di database pusdatin
  const { data: pusdatinUser, error: pusdatinError } = await supabase
    .rpc('get_pusdatin_user', { email_address: email })

  if (pusdatinError || !pusdatinUser) {
    await supabase.auth.signOut({ scope: 'local' })
    return { error: 'Akun Anda tidak terdaftar di sistem terpusat.' }
  }

  if (pusdatinUser.status !== 'active') {
    await supabase.auth.signOut({ scope: 'local' })
    return { error: 'Akun Anda sedang dinonaktifkan oleh Administrator.' }
  }

  // Verifikasi akses spesifik untuk E-Arsip
  const hasArsipAccess = pusdatinUser.app_permissions?.some(
    (p: { app_id: string; role: string }) => p.app_id === 'e-arsip-kemenag' && p.role !== 'none'
  );

  if (!hasArsipAccess) {
    await supabase.auth.signOut({ scope: 'local' })
    return { error: 'Anda tidak memiliki hak akses untuk aplikasi E-Arsip.' }
  }

  const cookieStore = await cookies()
  if (!rememberMe) {
    cookieStore.set('session_only', 'true', { path: '/' })
  } else {
    cookieStore.delete('session_only')
  }

  // Jika sukses, redirect ke dashboard
  redirect('/')
}
