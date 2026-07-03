import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'kemenag_arsip',
      },
      cookieOptions: {
        name: 'earsip-auth',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          const isSessionOnly = request.cookies.get('session_only')?.value === 'true'
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            if (isSessionOnly) {
              delete options.maxAge
              delete options.expires
            }
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Membaca user saat ini
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Jika tidak ada user dan mencoba mengakses selain halaman login, lempar ke halaman login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Jika sudah login tapi mencoba mengakses halaman login, arahkan kembali ke halaman utama (dashboard)
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
