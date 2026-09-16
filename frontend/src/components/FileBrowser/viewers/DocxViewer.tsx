import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, ExternalLink, Download } from "lucide-react";
import { openInDesktopOffice } from "@/lib/officeUri";

interface DocxViewerProps {
  fileUrl: string;
  fileName: string;
  fileId?: string;
  onDownload?: () => void;
}

interface ExtractedDocContent {
  paragraphs: string[];
  wordCount: number;
  charCount: number;
}

/**
 * Ekstraktor teks cerdas untuk berkas biner Word 97-2003 (.doc / OLE Compound Document).
 * Mendukung pembacaan teks 16-bit UTF-16LE serta 8-bit ANSI/ASCII langsung di browser tanpa dependensi eksternal.
 */
function extractTextFromDocBinary(buffer: ArrayBuffer): ExtractedDocContent {
  const bytes = new Uint8Array(buffer);

  // 1. Ekstraksi karakter UTF-16LE
  const utf16Chunks: string[] = [];
  let currentChunk: string[] = [];

  for (let i = 0; i < bytes.length - 1; i += 2) {
    const low = bytes[i];
    const high = bytes[i + 1];

    if (high === 0) {
      if (low === 13 || low === 10) {
        currentChunk.push("\n");
      } else if (low === 9 || (low >= 32 && low <= 126) || (low >= 160 && low <= 255)) {
        currentChunk.push(String.fromCharCode(low));
      } else {
        if (currentChunk.length > 0) {
          utf16Chunks.push(currentChunk.join(""));
          currentChunk = [];
        }
      }
    } else if (high >= 0x01 && high <= 0x04) {
      currentChunk.push(String.fromCharCode((high << 8) | low));
    } else {
      if (currentChunk.length > 0) {
        utf16Chunks.push(currentChunk.join(""));
        currentChunk = [];
      }
    }
  }
  if (currentChunk.length > 0) {
    utf16Chunks.push(currentChunk.join(""));
  }

  // 2. Ekstraksi karakter 8-bit ANSI/ASCII
  const ansiChunks: string[] = [];
  let currentAnsi: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 13 || b === 10) {
      currentAnsi.push("\n");
    } else if (b === 9 || (b >= 32 && b <= 126) || (b >= 160 && b <= 255)) {
      currentAnsi.push(String.fromCharCode(b));
    } else {
      if (currentAnsi.length > 0) {
        ansiChunks.push(currentAnsi.join(""));
        currentAnsi = [];
      }
    }
  }
  if (currentAnsi.length > 0) {
    ansiChunks.push(currentAnsi.join(""));
  }

  const utf16Valid = utf16Chunks.filter((s) => s.trim().length >= 2).join("\n");
  const ansiValid = ansiChunks.filter((s) => s.trim().length >= 2).join("\n");

  const rawText = utf16Valid.length >= ansiValid.length ? utf16Valid : ansiValid;
  const rawLines = rawText.split(/\r?\n/);
  const paragraphs: string[] = [];

  for (let line of rawLines) {
    line = line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

    if (
      line.length < 2 ||
      /^(Root Entry|WordDocument|1Table|0Table|Data|SummaryInformation|DocumentSummaryInformation|CompObj)/i.test(
        line
      ) ||
      /^(Normal\.dot|Heading \d|Default Paragraph Font|Times New Roman|Arial|Calibri|Courier)/i.test(
        line
      )
    ) {
      continue;
    }

    const letterCount = (line.match(/[a-zA-Z0-9]/g) || []).length;
    if (letterCount < 2) continue;

    if (paragraphs.length === 0 || paragraphs[paragraphs.length - 1] !== line) {
      paragraphs.push(line);
    }
  }

  const fullText = paragraphs.join(" ");
  const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = fullText.length;

  return {
    paragraphs,
    wordCount,
    charCount,
  };
}

export function DocxViewer({ fileUrl, fileName, fileId, onDownload }: DocxViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deteksi ekstensi file
  const lowerName = fileName.toLowerCase();
  const isLegacyDoc =
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".dot") ||
    (!lowerName.endsWith(".docx") && !lowerName.endsWith(".dotx"));

  // Mode pratinjau: 'native' (Lembar Kerja in-browser) atau 'text' (untuk .doc biner)
  const [viewMode, setViewMode] = useState<"native" | "text">(
    isLegacyDoc ? "text" : "native"
  );
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocContent | null>(null);

  const docxContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setExtractedDoc(null);

    async function loadDocument() {
      try {
        const res = await fetch(fileUrl, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Gagal mengunduh dokumen (${res.status} ${res.statusText})`);
        }
        const buffer = await res.arrayBuffer();
        if (!active) return;

        const bytes = new Uint8Array(buffer);
        const isPkZip =
          bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
        const isOleDoc =
          bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;

        // JIKA BERKAS ADALAH FORMAT LEGACY .DOC (Word 97-2003 biner) ATAU BUKAN .DOCX:
        if (!isPkZip || isLegacyDoc || isOleDoc) {
          const extracted = extractTextFromDocBinary(buffer);
          if (active) {
            setExtractedDoc(extracted);
            setViewMode("text");
            setLoading(false);
          }
          return;
        }

        // JIKA BERKAS ADALAH MODERN .DOCX (OOXML PKZip format):
        // 1. Ekstrak gambar media & sanitize XML agar floating pictures (wp:anchor) tidak hilang / 0px
        const { default: JSZip } = await import("jszip");
        const zip = await JSZip.loadAsync(buffer);

        // Ekstrak semua gambar dari word/media/
        const mediaImages: { path: string; base64: string; ext: string }[] = [];
        const imagePromises: Promise<void>[] = [];

        zip.forEach((path, entry) => {
          if (
            path.startsWith("word/media/") &&
            !entry.dir &&
            /\.(png|jpe?g|gif|webp|bmp)$/i.test(path)
          ) {
            imagePromises.push(
              entry.async("base64").then((b64) => {
                const ext = path.split(".").pop()?.toLowerCase() || "png";
                const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
                mediaImages.push({
                  path,
                  base64: `data:${mime};base64,${b64}`,
                  ext,
                });
              })
            );
          }
        });

        await Promise.all(imagePromises);

        // 2. Sanitize word/document.xml:
        // Ubah <wp:anchor ...> yang membungkus gambar menjadi <wp:inline ...>
        // Hapus <wp:wrapNone/> dan negative posOffset yang menyembunyikan gambar ke luar halaman
        let modifiedBuffer = buffer;
        if (zip.files["word/document.xml"]) {
          let docXml = await zip.files["word/document.xml"].async("text");

          const fixedXml = docXml
            .replace(/<wp:anchor([^>]*)>([\s\S]*?)<\/wp:anchor>/g, (match, attrs, content) => {
              if (content.includes("pic:pic")) {
                const cleanContent = content
                  .replace(/<wp:positionH[\s\S]*?<\/wp:positionH>/g, "")
                  .replace(/<wp:positionV[\s\S]*?<\/wp:positionV>/g, "")
                  .replace(/<wp:wrapNone\/>/g, "")
                  .replace(/<wp:wrapTopAndBottom\/>/g, "");
                return `<wp:inline${attrs}>${cleanContent}</wp:inline>`;
              }
              return match;
            })
            // Hapus angka offset yang bocor menjadi teks angka acak di Word
            .replace(/-5715-64135-34925-92220100/g, "")
            .replace(/-\d{4,8}-\d{4,8}-\d{4,8}-\d{4,8}00/g, "");

          zip.file("word/document.xml", fixedXml);
          modifiedBuffer = await zip.generateAsync({ type: "arraybuffer" });
        }

        // 3. Render dokumen dengan docx-preview menggunakan opsi optimal
        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = "";
        }

        const { renderAsync } = await import("docx-preview");
        if (!active || !docxContainerRef.current) return;

        await renderAsync(modifiedBuffer, docxContainerRef.current, undefined, {
          className: "docx-render",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true, // Mengaktifkan kalkulasi tab stops agar titik dua (:) dan tab rapi
          useBase64URL: true, // Mengubah seluruh gambar ke Base64 agar tidak rusak / hilang
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderAltChunks: true,
          debug: false,
        });

        if (!active) return;

        // 4. Post-Processing DOM Kop Surat & Gambar
        if (docxContainerRef.current) {
          const container = docxContainerRef.current;

          // A. Bersihkan teks bocoran offset biner yang tersisa
          const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            if (node.nodeValue && /-\d{4,8}-\d{4,8}/.test(node.nodeValue)) {
              node.nodeValue = node.nodeValue.replace(/-\d{4,8}-\d{4,8}[-\d]*/g, "").trim();
            }
          }

          // B. Rapikan gambar yang sudah dirender (pastikan ukuran proporsional & tidak duplikat)
          const existingImgs = container.querySelectorAll("img");
          existingImgs.forEach((img) => {
            img.style.maxHeight = "95px";
            img.style.maxWidth = "95px";
            img.style.objectFit = "contain";
            img.style.display = "inline-block";
          });

          // C. Deteksi Kop Surat Kementerian Agama & tambahkan garis ganda pembatas resmi
          const paragraphs = Array.from(container.querySelectorAll("p"));
          let kopEndIndex = -1;

          for (let i = 0; i < Math.min(10, paragraphs.length); i++) {
            const pText = paragraphs[i].textContent?.trim() || "";
            if (/telepon|website|faksimil|email|kemenag\.go\.id/i.test(pText)) {
              kopEndIndex = i;
              break;
            }
          }

          if (kopEndIndex !== -1 && paragraphs[kopEndIndex]) {
            const divider = document.createElement("div");
            divider.style.borderBottom = "3px double #0f172a";
            divider.style.margin = "10px 0 20px 0";
            divider.style.width = "100%";
            paragraphs[kopEndIndex].parentNode?.insertBefore(divider, paragraphs[kopEndIndex].nextSibling);
          }

          // Jika sama sekali belum ada gambar yang ter-render di dokumen tetapi ada gambar media
          if (existingImgs.length === 0 && mediaImages.length > 0) {
            const firstSection = container.querySelector(".docx-render, section");
            if (firstSection) {
              const logoDiv = document.createElement("div");
              logoDiv.className = "docx-injected-logo flex items-center justify-center mb-4 gap-4 select-none";
              const logoImg = document.createElement("img");
              logoImg.src = mediaImages[0].base64;
              logoImg.alt = "Logo Dokumen";
              logoImg.style.maxHeight = "90px";
              logoImg.style.maxWidth = "90px";
              logoImg.style.objectFit = "contain";
              logoImg.style.display = "inline-block";
              logoDiv.appendChild(logoImg);
              firstSection.insertBefore(logoDiv, firstSection.firstChild);
            }
          }
        }

        setViewMode("native");
      } catch (err: any) {
        if (!active) return;
        console.warn("docx-preview fallback handler:", err);

        try {
          const resFallback = await fetch(fileUrl, { cache: "no-store" });
          const bufferFallback = await resFallback.arrayBuffer();
          const extracted = extractTextFromDocBinary(bufferFallback);
          if (extracted.paragraphs.length > 0) {
            setExtractedDoc(extracted);
            setViewMode("text");
            setError(null);
            return;
          }
        } catch {}

        setError(err.message || "Gagal memproses dokumen Word.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDocument();

    return () => {
      active = false;
    };
  }, [fileUrl, isLegacyDoc]);

  const handleOpenWord = () => {
    openInDesktopOffice(
      fileUrl,
      fileName,
      isLegacyDoc
        ? "application/msword"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileId
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-200/90 dark:bg-slate-900/90 text-slate-900 overflow-auto select-text relative">
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs text-white gap-3 p-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs font-semibold text-slate-200">
            Mempersiapkan pratinjau dokumen Word...
          </span>
          <span className="text-[11px] text-slate-400">
            Menyusun kop surat, logo resmi, dan tata letak lembar kerja
          </span>
        </div>
      )}

      {/* MODE 1: LEMBAR KERJA ASLI IN-BROWSER DENGAN KOP SURAT LENGKAP */}
      {viewMode === "native" && (
        <div className="p-4 sm:p-8 flex justify-center w-full min-h-full">
          <div
            ref={docxContainerRef}
            className={`docx-preview-root transition-transform origin-top ${
              loading ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>
      )}

      {/* MODE 2: PRATINJAU TEKS DOKUMEN DALAM LEMBAR KERJA A4 (UNTUK .DOC BINER) */}
      {viewMode === "text" && extractedDoc && (
        <div className="p-4 sm:p-8 flex flex-col items-center w-full min-h-full">
          <div className="w-full max-w-[800px] min-h-[1050px] bg-white text-slate-800 shadow-2xl p-8 sm:p-14 rounded-xs border border-slate-300 flex flex-col justify-between">
            <div>
              <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                    {fileName.replace(/\.[^/.]+$/, "")}
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Dokumen Microsoft Word ({isLegacyDoc ? "Word 97-2003 .doc" : ".docx"})
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <p>{extractedDoc.wordCount} Kata</p>
                  <p>{extractedDoc.paragraphs.length} Paragraf</p>
                </div>
              </div>

              <div className="space-y-3.5 text-sm leading-relaxed text-slate-800 select-text">
                {extractedDoc.paragraphs.map((para, idx) => {
                  const isHeading =
                    para.length < 80 &&
                    (para === para.toUpperCase() ||
                      /^(bab|pasal|surat|lampiran|keputusan|tentang|menimbang|mengingat|memperhatikan|menetapkan)/i.test(
                        para
                      ));

                  return (
                    <p
                      key={idx}
                      className={
                        isHeading
                          ? "font-bold text-slate-950 pt-2 tracking-wide font-sans text-center uppercase"
                          : "text-justify indent-6"
                      }
                    >
                      {para}
                    </p>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-sans">
              Dokumen resmi E-Arsip SI BETANG Kemenag Barito Utara • Halaman 1
            </div>
          </div>
        </div>
      )}

      {/* Kotak Pesan Jika Terjadi Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 text-white rounded-2xl shadow-sm m-4 border border-slate-700 max-w-md my-auto mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Gagal Menampilkan Dokumen</h3>
          <p className="mt-2 text-xs text-slate-400">{error}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleOpenWord}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka di Microsoft Word Desktop</span>
            </button>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scoped CSS styling untuk docx-preview agar persis lembar kerja Word */}
      <style>{`
        .docx-preview-root {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .docx-wrapper > section.docx-render,
        .docx-wrapper > section {
          background: #ffffff !important;
          color: #1e293b !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          margin-bottom: 24px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 2px !important;
          box-sizing: border-box !important;
          font-family: Arial, "Times New Roman", "Segoe UI", sans-serif !important;
        }

        .docx-render img, .docx-wrapper img {
          max-width: 100% !important;
          height: auto !important;
          display: inline-block !important;
        }

        .docx-render table {
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0;
        }

        .docx-render td, .docx-render th {
          border: 1px solid #94a3b8;
          padding: 6px 10px;
        }

        .docx-render p {
          margin-top: 0;
          margin-bottom: 0.4em;
          line-height: 1.4;
        }

        .docx-render span {
          display: inline;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .docx-preview-root, .docx-preview-root * {
            visibility: visible;
          }
          .docx-preview-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default DocxViewer;
