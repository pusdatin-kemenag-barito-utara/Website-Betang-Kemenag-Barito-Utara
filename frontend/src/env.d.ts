/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  __PUBLIC_ENV__?: {
    PUBLIC_TURNSTILE_SITE_KEY?: string;
    NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
    PUBLIC_PUSDATIN_URL?: string;
    PUBLIC_API_URL?: string;
    PUBLIC_GA_MEASUREMENT_ID?: string;
    PUBLIC_GTM_ID?: string;
    [key: string]: string | undefined;
  };
}