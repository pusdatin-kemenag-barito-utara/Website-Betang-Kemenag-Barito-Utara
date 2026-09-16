import { useState, useEffect, useMemo, useRef } from "react"
import {
  FileSpreadsheet,
  Search,
  X,
  Loader2,
  AlertCircle,
  Layers,
  WrapText,
} from "lucide-react"

interface SpreadsheetViewerProps {
  fileUrl: string
  fileName: string
  fileId?: string
}

function getColumnLetter(colIndex: number): string {
  let letter = ""
  let temp = colIndex
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

async function loadXLSX(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).XLSX) {
    return (window as any).XLSX
  }

  // Load bundle mandiri /vendor/xlsx.full.min.js
  if (typeof window !== "undefined") {
    try {
      await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector('script[data-xlsx-bundle="true"]')
        if (existingScript) {
          if ((window as any).XLSX) return resolve()
          existingScript.addEventListener("load", () => resolve())
          existingScript.addEventListener("error", () => reject(new Error("Gagal memuat bundle XLSX")))
          return
        }
        const script = document.createElement("script")
        script.src = "/vendor/xlsx.full.min.js"
        script.setAttribute("data-xlsx-bundle", "true")
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error("Gagal memuat /vendor/xlsx.full.min.js"))
        document.head.appendChild(script)
      })

      if ((window as any).XLSX) {
        return (window as any).XLSX
      }
    } catch (scriptErr) {
      console.warn("Gagal memuat /vendor/xlsx.full.min.js, mencoba dynamic import fallback:", scriptErr)
    }
  }

  // Fallback: dynamic import
  const mod: any = await import("xlsx")
  return (mod && (typeof mod.read === "function" ? mod : mod.default)) || (window as any).XLSX
}

export function SpreadsheetViewer({
  fileUrl,
  fileName: _fileName,
  fileId: _fileId,
}: SpreadsheetViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState<string>("")
  const [workbookInstance, setWorkbookInstance] = useState<any>(null)
  const [xlsxLib, setXlsxLib] = useState<any>(null)

  // Viewer display settings
  const [searchQuery, setSearchQuery] = useState("")
  const [isWrapText, setIsWrapText] = useState(true)
  const [matchCount, setMatchCount] = useState(0)

  const tableContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const XLSX = await loadXLSX()
        if (!XLSX || typeof XLSX.read !== "function") {
          throw new Error("Library pemroses Excel belum siap atau gagal dimuat.")
        }
        if (active) setXlsxLib(XLSX)

        const res = await fetch(fileUrl, { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Gagal mengunduh berkas (${res.status} ${res.statusText})`)
        }
        const buffer = await res.arrayBuffer()
        const workbook = XLSX.read(buffer, {
          type: "array",
          cellDates: true,
          cellNF: true,
          cellText: true,
          dense: false,
        })

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("Berkas spreadsheet tidak memiliki lembar kerja (worksheet).")
        }

        if (!active) return
        setWorkbookInstance(workbook)
        setSheetNames(workbook.SheetNames)
        setActiveSheet(workbook.SheetNames[0])
      } catch (err: any) {
        if (!active) return
        console.error("Gagal membaca berkas Excel:", err)
        setError(err.message || "Gagal memproses dan membaca isi lembar kerja Excel.")
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [fileUrl])

  // Generate authentic HTML spreadsheet with merge support (colspan & rowspan)
  const sheetMeta = useMemo(() => {
    if (!workbookInstance || !activeSheet || !xlsxLib) {
      return { html: "", totalRows: 0, totalCols: 0 }
    }

    const ws = workbookInstance.Sheets[activeSheet]
    if (!ws) {
      return { html: "", totalRows: 0, totalCols: 0 }
    }

    // Gunakan sheet_to_html resmi SheetJS agar merge (colspan/rowspan) dan struktur sel terjaga persis
    const rawHtml = xlsxLib.utils.sheet_to_html(ws, { header: "", footer: "" })
    if (!rawHtml || !ws["!ref"]) {
      return { html: rawHtml || "", totalRows: 0, totalCols: 0 }
    }

    const range = xlsxLib.utils.decode_range(ws["!ref"])
    const totalRows = range.e.r - range.s.r + 1
    const totalCols = range.e.c - range.s.c + 1

    // Buat header kolom A, B, C, D...
    let thead = `<thead class="excel-thead"><tr><th class="excel-corner-th">#</th>`
    for (let c = range.s.c; c <= range.e.c; c++) {
      thead += `<th class="excel-col-th">${getColumnLetter(c)}</th>`
    }
    thead += `</tr></thead>`

    // Sisipkan nomor baris 1, 2, 3... di setiap <tr>
    let rowIdx = range.s.r
    const bodyWithRowNums = rawHtml.replace(/<tr([^>]*)>/gi, (_match: string, attrs: string) => {
      rowIdx++
      return `<tr${attrs}><td class="excel-row-td">${rowIdx}</td>`
    })

    const finalHtml = bodyWithRowNums
      .replace(/<table[^>]*>/i, `<table class="excel-table ${isWrapText ? "wrap-cells" : "nowrap-cells"}">${thead}<tbody>`)
      .replace(/<\/table>/i, `</tbody></table>`)

    return { html: finalHtml, totalRows, totalCols }
  }, [workbookInstance, activeSheet, xlsxLib, isWrapText])

  // Sorot sel yang cocok dengan pencarian (efek stabilo kuning khas Excel Find)
  useEffect(() => {
    if (!tableContainerRef.current) return
    const container = tableContainerRef.current
    const cells = container.querySelectorAll("td:not(.excel-row-td)")
    const q = searchQuery.trim().toLowerCase()

    let count = 0
    cells.forEach((td) => {
      const el = td as HTMLElement
      el.classList.remove("excel-cell-highlight")
      if (q && el.textContent && el.textContent.toLowerCase().includes(q)) {
        el.classList.add("excel-cell-highlight")
        count++
      }
    })
    setMatchCount(count)
  }, [searchQuery, sheetMeta.html])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-white gap-3 py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-xs font-semibold text-slate-300">
          Membaca dan memproses lembar kerja Excel...
        </span>
        <span className="text-[11px] text-slate-500">
          Menyiapkan format sel, baris gabungan (merged cells), dan formula
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-100">Gagal Memuat Lembar Kerja</h3>
        <p className="mt-2 text-xs text-slate-400 max-w-md">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-text">
      {/* Spreadsheet Canvas Container (White Excel Paper style) */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto bg-slate-200/80 dark:bg-slate-900/80 p-2 sm:p-4"
      >
        <div
          className="excel-paper-wrapper bg-white text-slate-900 shadow-lg rounded-md border border-slate-300 inline-block min-w-full"
          dangerouslySetInnerHTML={{ __html: sheetMeta.html }}
        />
      </div>

      {/* Bottom Sheet Tabs & Control Bar (Excel Style) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 shrink-0 select-none">
        {/* Left: Sheet Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[65%]">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-xs pr-2 border-r border-slate-300 dark:border-slate-700 shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lembar:</span>
          </div>
          {sheetNames.map((name) => {
            const isActive = activeSheet === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setActiveSheet(name)
                  setSearchQuery("")
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                <span>{name}</span>
              </button>
            )
          })}
        </div>

        {/* Right: Search & Wrap Text */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari data..."
              className="w-28 sm:w-40 pl-6 pr-6 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold">
              {matchCount}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsWrapText((w) => !w)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              isWrapText
                ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
            }`}
            title={isWrapText ? "Nonaktifkan bungkus teks" : "Aktifkan bungkus teks"}
          >
            <WrapText className="w-3 h-3" />
            <span className="hidden sm:inline">Teks Penuh</span>
          </button>
        </div>
      </div>

      {/* Scoped CSS for Authentic Excel Spreadsheet Look */}
      <style>{`
        .excel-table {
          border-collapse: collapse;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 12px;
          color: #0f172a;
          background-color: #ffffff;
          width: max-content;
          min-width: 100%;
        }

        .excel-thead {
          position: sticky;
          top: 0;
          z-index: 20;
          background-color: #f1f5f9;
        }

        .excel-corner-th {
          position: sticky;
          left: 0;
          top: 0;
          z-index: 30;
          background-color: #e2e8f0;
          border: 1px solid #cbd5e1;
          padding: 4px 6px;
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          text-align: center;
          min-width: 44px;
          user-select: none;
        }

        .excel-col-th {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          text-align: center;
          min-width: 80px;
          user-select: none;
        }

        .excel-row-td {
          position: sticky;
          left: 0;
          z-index: 10;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 4px 8px;
          font-size: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 600;
          color: #64748b;
          text-align: center;
          min-width: 44px;
          user-select: none;
        }

        .excel-table td:not(.excel-row-td) {
          border: 1px solid #cbd5e1;
          padding: 5px 8px;
          font-size: 12px;
          line-height: 1.4;
          color: #0f172a;
          min-height: 24px;
          vertical-align: middle;
          empty-cells: show;
        }

        .excel-table.wrap-cells td:not(.excel-row-td) {
          white-space: pre-wrap;
          word-break: break-word;
          max-width: 500px;
        }

        .excel-table.nowrap-cells td:not(.excel-row-td) {
          white-space: nowrap;
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .excel-table tr:hover td:not(.excel-row-td) {
          background-color: #f0fdf4;
        }

        .excel-cell-highlight {
          background-color: #fef08a !important;
          color: #854d0e !important;
          font-weight: 700 !important;
          box-shadow: inset 0 0 0 2px #eab308 !important;
        }
      `}</style>
    </div>
  )
}
