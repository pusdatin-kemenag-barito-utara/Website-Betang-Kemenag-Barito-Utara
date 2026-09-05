import { request } from "./client";

export interface AppSettings {
  disable_right_click: boolean;
  disable_print_shortcut: boolean;
  enable_watermark: boolean;
  max_upload_size_mb: number;
  default_share_expiry_hours: number;
  default_pdf_viewer_mode: "iframe" | "canvas";
}

export async function getAppSettings() {
  try {
    const res = await request("/settings");
    if (!res.success) throw new Error(res.error || "Gagal mengambil pengaturan");
    return {
      success: true,
      data: res.data as AppSettings,
      disableRightClick: res.data?.disable_right_click ?? true,
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return {
      success: false,
      error: "Gagal mengambil pengaturan",
      disableRightClick: true,
      data: {
        disable_right_click: true,
        disable_print_shortcut: false,
        enable_watermark: false,
        max_upload_size_mb: 100,
        default_share_expiry_hours: 24,
        default_pdf_viewer_mode: "iframe",
      } as AppSettings,
    };
  }
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
  try {
    const res = await request("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
    if (!res.success) {
      if (res.unauthorized) {
        window.location.href = "/login";
      }
      throw new Error(res.error || "Gagal menyimpan pengaturan");
    }
    return { success: true, data: res.data as AppSettings };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan",
    };
  }
}

export async function updateDisableRightClick(disableRightClick: boolean) {
  return updateAppSettings({ disable_right_click: disableRightClick });
}
