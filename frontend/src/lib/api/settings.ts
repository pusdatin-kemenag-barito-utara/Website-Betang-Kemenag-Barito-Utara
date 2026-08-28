import { request } from "./client";

export async function getAppSettings() {
  try {
    const res = await request("/settings");
    if (!res.success) throw new Error(res.error || "Gagal mengambil pengaturan");
    return { success: true, disableRightClick: res.data?.disable_right_click ?? true };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return { success: false, error: "Gagal mengambil pengaturan", disableRightClick: true };
  }
}

export async function updateDisableRightClick(disableRightClick: boolean) {
  try {
    const res = await request("/settings", {
      method: "PUT",
      body: JSON.stringify({ disableRightClick }),
    });
    if (!res.success) {
      if (res.unauthorized) {
        window.location.href = "/login";
      }
      throw new Error(res.error || "Gagal menyimpan pengaturan");
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan" };
  }
}
