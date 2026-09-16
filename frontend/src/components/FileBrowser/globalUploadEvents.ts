export interface OpenUploadEventDetail {
  folderId: string;
  userBidangId?: string;
  isFolderMode?: boolean;
  initialFiles?: File[];
}

export const OPEN_UPLOAD_EVENT = "betang:open-upload";

/**
 * Memicu pembukaan modal upload berkas atau folder secara global.
 * Komponen GlobalUploadIsland yang terpasang persisten di level layout akan menangkap event ini.
 */
export function openGlobalUpload(detail: OpenUploadEventDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<OpenUploadEventDetail>(OPEN_UPLOAD_EVENT, { detail }),
    );
  }
}
