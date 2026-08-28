/**
 * Google Analytics (GA4) & Google Tag Manager Integration Helper
 * Measurement ID: G-K02LW54C8P | Google Tag ID: GT-NBQNNM4B
 */

export const GA_MEASUREMENT_ID =
  import.meta.env.PUBLIC_GA_MEASUREMENT_ID || "G-K02LW54C8P";
export const GTM_ID =
  import.meta.env.PUBLIC_GTM_ID || "GT-NBQNNM4B";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Mengirim custom event ke Google Analytics & dataLayer GTM secara aman.
 */
export function trackEvent(
  eventName: string,
  eventParams: Record<string, any> = {}
) {
  if (typeof window === "undefined") return;

  try {
    const enrichedParams = {
      timestamp: new Date().toISOString(),
      page_location: window.location.href,
      page_path: window.location.pathname,
      ...eventParams,
    };

    // 1. Kirim via window.gtag (GA4)
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, enrichedParams);
    }

    // 2. Kirim via window.dataLayer (GTM)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...enrichedParams,
    });
  } catch (err) {
    console.debug("[Analytics Error]", err);
  }
}

/**
 * Melacak pageview navigasi.
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  trackEvent("page_view", {
    page_path: pagePath,
    page_title: pageTitle || (typeof document !== "undefined" ? document.title : ""),
  });
}

/**
 * Menetapkan identitas pengguna (Super Admin / User) pada analytics.
 */
export function setAnalyticsUser(userId?: string, userRole?: string, email?: string) {
  if (typeof window === "undefined") return;

  try {
    if (typeof window.gtag === "function" && userId) {
      window.gtag("set", "user_properties", {
        user_role: userRole || "admin",
      });
      window.gtag("config", GA_MEASUREMENT_ID, {
        user_id: userId,
      });
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "set_user_context",
      user_id: userId,
      user_role: userRole,
      user_email: email,
    });
  } catch (err) {
    console.debug("[Analytics User Error]", err);
  }
}

/**
 * Melacak interaksi tombol / aksi pengguna secara spesifik.
 */
export function trackInteraction(
  elementName: string,
  elementType: "button" | "link" | "tab" | "dropdown" | "icon",
  category: string,
  extraParams: Record<string, any> = {}
) {
  trackEvent("user_interaction", {
    element_name: elementName,
    element_type: elementType,
    interaction_category: category,
    ...extraParams,
  });
}

/**
 * Melacak pembukaan dan penutupan modal dialog.
 */
export function trackModal(modalName: string, action: "open" | "close", metadata?: Record<string, any>) {
  trackEvent("modal_interaction", {
    modal_name: modalName,
    modal_action: action,
    ...metadata,
  });
}

/**
 * Melacak pencarian berkas / arsip.
 */
export function trackSearch(searchTerm: string, resultCount?: number, location?: string) {
  trackEvent("search_performed", {
    search_term: searchTerm,
    result_count: resultCount,
    search_location: location || "file_browser",
  });
}

/**
 * Melacak perubahan filter tampilan / status berkas.
 */
export function trackFilterChange(filterName: string, filterValue: string) {
  trackEvent("filter_applied", {
    filter_name: filterName,
    filter_value: filterValue,
  });
}

/**
 * Melacak pengurutan tabel berkas (Sorting).
 */
export function trackSortChange(column: string, direction: "asc" | "desc") {
  trackEvent("sort_applied", {
    sort_column: column,
    sort_direction: direction,
  });
}
