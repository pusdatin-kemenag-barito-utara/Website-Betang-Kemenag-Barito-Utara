"use client";

import { KeyRound, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { loginAction } from "./actions";
import Image from "next/image";

const initialState = {
  error: null as string | null,
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F8FAFC] p-4 sm:p-8">
      {/* Premium Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[20%] top-[-10%] h-[70vh] w-[70vw] rounded-full bg-emerald-100/50 blur-[120px]" />
        <div className="absolute -right-[20%] bottom-[-10%] h-[70vh] w-[70vw] rounded-full bg-emerald-50/50 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Header Section */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-100">
            <Image
              src="/kemenag.svg"
              alt="Logo Kemenag"
              width={64}
              height={64}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] min-[400px]:text-[11px] sm:text-xs font-bold tracking-widest sm:tracking-[0.2em] text-emerald-600 uppercase text-center leading-tight">
              Kementerian Agama Kabupaten Barito Utara
            </span>
          </div>
          <h1 className="mt-2 sm:mt-3 text-2xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center justify-center">
            SI BET
            <Image src="/logo.png" alt="A" width={32} height={32} className="mx-[2px] -mt-[4px] object-contain sm:w-9 sm:h-9" />
            NG
          </h1>
          <div className="mt-1 sm:mt-3 space-y-1.5 px-0 sm:px-4">
            <p className="text-[11px] min-[400px]:text-xs sm:text-sm font-medium text-slate-700 leading-tight flex flex-col gap-0.5 sm:gap-1">
              <span><span className="font-bold text-slate-900">S</span>istem <span className="font-bold text-slate-900">I</span>nformasi</span>
              <span><span className="font-bold text-slate-900">B</span>asis <span className="font-bold text-slate-900">E</span>lektronik <span className="font-bold text-slate-900">T</span>ata <span className="font-bold text-slate-900">A</span>rsip dan <span className="font-bold text-slate-900">N</span>askah <span className="font-bold text-slate-900">G</span>abungan.</span>
            </p>
          </div>
          <p className="mt-6 text-xs font-medium tracking-widest text-slate-500 uppercase hidden">
            Kementerian Agama Kabupaten Barito Utara
          </p>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-slate-100 sm:p-10">
          <form action={formAction} className="space-y-6">
            {state.error && (
              <div className="flex animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-100">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="font-medium">{state.error}</p>
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
                  className="flex h-14 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 pl-11 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="admin@kemenag.go.id"
                  type="email"
                  autoComplete="email"
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
                  className="flex h-14 w-full rounded-2xl border-0 bg-slate-50 px-4 py-2 pl-11 pr-11 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  placeholder="••••••••••••"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-emerald-600 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  rememberMe ? "bg-emerald-600" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={rememberMe}
              >
                <span className="sr-only">Ingat Saya</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    rememberMe ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span
                className="text-[11px] font-bold tracking-wider text-slate-600 uppercase cursor-pointer select-none"
                onClick={() => setRememberMe(!rememberMe)}
              >
                Ingat Saya
              </span>
            </div>

            <input type="hidden" name="rememberMe" value={rememberMe.toString()} />

            <div className="flex w-full items-center justify-center py-2">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                options={{
                  theme: "light",
                }}
              />
            </div>

            <button
              className="group relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-emerald-600 px-8 text-sm font-bold tracking-wider text-white uppercase shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-70"
              type="submit"
              disabled={isPending}
            >
              <span className="relative flex items-center gap-2">
                {isPending && (
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isPending ? "Memproses..." : "Masuk Ke Dashboard"}
                {!isPending && (
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
                )}
              </span>
            </button>
          </form>
        </div>
      </div>

      <div className="relative z-10 mt-12 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
          © {new Date().getFullYear()} SI BETANG Kemenag Barito Utara
        </p>
      </div>
    </div>
  );
}
