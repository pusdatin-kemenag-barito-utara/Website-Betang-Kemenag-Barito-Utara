import { useState } from "react"
import { ImageOff } from "lucide-react"

interface ImageViewerProps {
  fileUrl: string
  fileName: string
}

export function ImageViewer({ fileUrl, fileName }: ImageViewerProps) {
  const [imgLoadFailed, setImgLoadFailed] = useState(false)

  if (imgLoadFailed) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
          <ImageOff className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Gambar Tidak Dapat Dimuat</h3>
        <p className="mt-2 text-xs text-slate-400 max-w-md">
          Format gambar tidak didukung atau berkas belum dapat diakses dari server.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6 overflow-auto">
      <img
        src={fileUrl}
        alt={fileName}
        className="max-h-full max-w-full object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
        onError={() => setImgLoadFailed(true)}
      />
    </div>
  )
}
