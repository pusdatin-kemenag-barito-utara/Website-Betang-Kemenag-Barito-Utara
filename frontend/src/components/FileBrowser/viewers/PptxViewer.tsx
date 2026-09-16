import { useState, useEffect, useRef, useCallback } from "react";
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  Layers,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import JSZip from "jszip";

interface SlideParagraph {
  text: string;
  isBullet?: boolean;
  level?: number;
}

interface SlideImage {
  id: string;
  url: string;
  name: string;
}

interface SlideItem {
  number: number;
  title: string;
  paragraphs: SlideParagraph[];
  images: SlideImage[];
}

interface PptxViewerProps {
  fileUrl: string;
  fileName?: string;
  fileId?: string;
  onDownload?: () => void;
}

export function PptxViewer({ fileUrl, fileName }: PptxViewerProps) {
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // Parse file PPTX langsung di client menggunakan JSZip + DOMParser
  const parsePptx = useCallback(async () => {
    setLoading(true);

    // Bersihkan URL objek sebelumnya
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    objectUrlsRef.current = [];

    try {
      const res = await fetch(fileUrl, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Gagal mengunduh berkas presentasi (${res.status} ${res.statusText})`);
      }
      const buffer = await res.arrayBuffer();

      const zip = await JSZip.loadAsync(buffer);

      // 1. Ekstrak gambar dari folder ppt/media
      const imageMap = new Map<string, string>();
      const mediaFolder = zip.folder("ppt/media");
      if (mediaFolder) {
        const mediaPromises: Promise<void>[] = [];
        mediaFolder.forEach((relPath, entry) => {
          if (!entry.dir) {
            mediaPromises.push(
              entry.async("blob").then((blob) => {
                const blobUrl = URL.createObjectURL(blob);
                objectUrlsRef.current.push(blobUrl);
                imageMap.set(relPath, blobUrl);
                imageMap.set(`media/${relPath}`, blobUrl);
                imageMap.set(`../media/${relPath}`, blobUrl);
              })
            );
          }
        });
        await Promise.all(mediaPromises);
      }

      // 2. Temukan dan urutkan berkas slide (slide1.xml, slide2.xml, ...)
      const slideEntries: { num: number; file: JSZip.JSZipObject }[] = [];
      zip.forEach((path, entry) => {
        const match = path.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
        if (match && !entry.dir) {
          slideEntries.push({ num: parseInt(match[1], 10), file: entry });
        }
      });
      slideEntries.sort((a, b) => a.num - b.num);

      if (slideEntries.length === 0) {
        setLoading(false);
        return;
      }

      // 3. Parsing XML per slide
      const parser = new DOMParser();
      const parsedList: SlideItem[] = [];

      for (let i = 0; i < slideEntries.length; i++) {
        const entry = slideEntries[i];
        const xmlText = await entry.file.async("text");
        const doc = parser.parseFromString(xmlText, "application/xml");

        // Relasi berkas untuk gambar pada slide ini
        const relFile = zip.file(`ppt/slides/_rels/slide${entry.num}.xml.rels`);
        const relMap = new Map<string, string>();
        if (relFile) {
          const relXml = await relFile.async("text");
          const relDoc = parser.parseFromString(relXml, "application/xml");
          const relNodes = relDoc.getElementsByTagName("Relationship");
          for (let r = 0; r < relNodes.length; r++) {
            const id = relNodes[r].getAttribute("Id");
            const target = relNodes[r].getAttribute("Target");
            if (id && target) {
              relMap.set(id, target);
            }
          }
        }

        // Cari gambar yang dipakai di slide ini
        const slideImages: SlideImage[] = [];
        const blipNodes = doc.getElementsByTagName("a:blip");
        for (let b = 0; b < blipNodes.length; b++) {
          const embedId = blipNodes[b].getAttribute("r:embed");
          if (embedId && relMap.has(embedId)) {
            const rawTarget = relMap.get(embedId)!;
            const cleanTarget = rawTarget.replace(/^\.\.\/media\//, "").replace(/^media\//, "");
            const imgUrl = imageMap.get(cleanTarget) || imageMap.get(rawTarget);
            if (imgUrl && !slideImages.some((img) => img.url === imgUrl)) {
              slideImages.push({ id: embedId, url: imgUrl, name: cleanTarget });
            }
          }
        }

        // Cari judul dan paragraf teks
        let slideTitle = "";
        const paragraphs: SlideParagraph[] = [];

        const spNodes = doc.getElementsByTagName("p:sp");
        for (let s = 0; s < spNodes.length; s++) {
          const sp = spNodes[s];
          const phNodes = sp.getElementsByTagName("p:ph");
          let isTitle = false;
          if (phNodes.length > 0) {
            const phType = phNodes[0].getAttribute("type");
            if (phType === "title" || phType === "ctrTitle" || phType === "subTitle") {
              isTitle = true;
            }
          }

          const pNodes = sp.getElementsByTagName("a:p");
          for (let p = 0; p < pNodes.length; p++) {
            const pNode = pNodes[p];
            let pText = "";
            const tNodes = pNode.getElementsByTagName("a:t");
            for (let t = 0; t < tNodes.length; t++) {
              pText += tNodes[t].textContent || "";
            }
            pText = pText.trim();
            if (!pText) continue;

            if (isTitle && !slideTitle) {
              slideTitle = pText;
            } else {
              const pPr = pNode.getElementsByTagName("a:pPr")[0];
              const lvl = pPr ? parseInt(pPr.getAttribute("lvl") || "0", 10) : 0;
              paragraphs.push({
                text: pText,
                isBullet: lvl > 0 || paragraphs.length > 0,
                level: lvl,
              });
            }
          }
        }

        if (!slideTitle && paragraphs.length > 0) {
          slideTitle = paragraphs[0].text;
          paragraphs.shift();
        }

        parsedList.push({
          number: i + 1,
          title: slideTitle || `Slide ${i + 1}`,
          paragraphs,
          images: slideImages,
        });
      }

      setSlides(parsedList);
      setCurrentSlideIndex(0);
      setLoading(false);
    } catch (err) {
      console.warn("Client PPTX parsing failed:", err);
      setLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    parsePptx();
    return () => {
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      objectUrlsRef.current = [];
    };
  }, [parsePptx]);

  // Keyboard navigation untuk slide (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (slides.length === 0) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentSlideIndex(slides.length - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const currentSlide = slides[currentSlideIndex] || null;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-text"
    >
      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-30">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin mb-3" />
            <p className="text-xs font-semibold text-orange-200">Mempersiapkan pratinjau slide presentasi...</p>
          </div>
        )}

        {slides.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/60">
            <Presentation className="w-12 h-12 text-orange-400 mb-3 opacity-80" />
            <h4 className="text-base font-bold text-white mb-1">Pratinjau Slide Presentasi</h4>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Gunakan tombol Buka di PowerPoint atau Unduh di bilah atas untuk melihat isi berkas presentasi lengkap.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-row overflow-hidden w-full h-full">
            {/* Left: Thumbnail Sidebar */}
            {showThumbnails && (
              <aside className="w-48 sm:w-56 shrink-0 bg-slate-900/90 border-r border-slate-800 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Daftar Slide</span>
                  <span className="text-[10px] text-orange-400 font-bold">{slides.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {slides.map((s, idx) => (
                    <button
                      key={s.number}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        idx === currentSlideIndex
                          ? "bg-orange-950/70 border-orange-500/80 shadow-md ring-1 ring-orange-500/40"
                          : "bg-slate-800/50 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={idx === currentSlideIndex ? "text-orange-300 font-bold" : "text-slate-500 font-medium"}>
                          #{s.number}
                        </span>
                        {s.images.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400">
                            <ImageIcon className="w-2.5 h-2.5 text-amber-400" />
                            {s.images.length}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-200 truncate leading-snug">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {s.paragraphs[0]?.text || "(Slide visual)"}
                      </p>
                    </button>
                  ))}
                </div>
              </aside>
            )}

            {/* Right: Center Slide Stage (16:9 Aspect Ratio) */}
            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              {/* Slide Canvas Viewport */}
              <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                {currentSlide && (
                  <div className="w-full max-w-4xl aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/90 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden ring-1 ring-orange-500/10">
                    {/* Slide Top Banner */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4 shrink-0">
                      <div className="flex-1 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-950 text-orange-400 border border-orange-800/60 text-[10px] font-bold uppercase tracking-wider mb-2">
                          <Sparkles className="w-3 h-3" />
                          <span>Slide {currentSlide.number}</span>
                        </div>
                        <h2 className="text-base sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-tight">
                          {currentSlide.title}
                        </h2>
                      </div>
                      <span className="text-xs font-medium text-slate-600 shrink-0">
                        {currentSlide.number} / {slides.length}
                      </span>
                    </div>

                    {/* Slide Content Body */}
                    <div className="flex-1 my-4 sm:my-6 overflow-y-auto pr-2 space-y-3">
                      {currentSlide.paragraphs.length === 0 && currentSlide.images.length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                          (Slide presentasi visual)
                        </div>
                      )}

                      {/* Paragraph Text Items */}
                      {currentSlide.paragraphs.map((p, pIdx) => {
                        const level = p.level ?? 0;
                        const isHeading =
                          level === 0 &&
                          (p.isBullet ||
                            p.text.length < 50 ||
                            /^(bab|pasal|bagian|tujuan|agenda|poin|langkah)/i.test(p.text));

                        return (
                          <div
                            key={pIdx}
                            className={`flex items-start gap-2.5 transition-all ${
                              level > 0 ? "ml-4 sm:ml-6 text-slate-300" : "text-slate-100"
                            }`}
                          >
                            <span
                              className={`select-none shrink-0 mt-1.5 ${
                                level === 0 ? "text-orange-400" : "text-amber-500"
                              }`}
                            >
                              &bull;
                            </span>
                            <p
                              className={`leading-relaxed select-text ${
                                isHeading
                                  ? "font-bold text-white text-xs sm:text-sm lg:text-base tracking-tight"
                                  : "font-normal text-xs sm:text-sm text-slate-200"
                              }`}
                            >
                              {p.text}
                            </p>
                          </div>
                        );
                      })}

                      {/* Embedded Slide Images */}
                      {currentSlide.images.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 mb-3">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Gambar dari Slide ({currentSlide.images.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {currentSlide.images.map((img, imgIdx) => (
                              <div
                                key={img.id || imgIdx}
                                className="group relative rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-md"
                              >
                                <img
                                  src={img.url}
                                  alt={img.name || `Slide ${currentSlide.number} visual ${imgIdx + 1}`}
                                  className="w-full h-32 sm:h-36 object-contain bg-black/40 p-2"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                  <a
                                    href={img.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold shadow-md transition-colors"
                                  >
                                    Buka Penuh
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Slide Footer Branding */}
                    <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-[10px] text-slate-500 shrink-0 select-none">
                      <span>SI BETANG &bull; E-Arsip Kemenag Barito Utara</span>
                      {fileName && <span>{fileName}</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation Bar */}
              <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs select-none">
                {/* Left: Thumbnail & Tips */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      showThumbnails
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                    title="Tampilkan / Sembunyikan panel daftar slide"
                  >
                    <Layers className="w-3.5 h-3.5 inline mr-1" />
                    <span className="hidden sm:inline">Thumbnail</span>
                  </button>
                  <span className="hidden lg:inline text-[11px] text-slate-500 font-medium">
                    Gunakan tombol panah ⬅ ➡ keyboard untuk pindah slide
                  </span>
                </div>

                {/* Center: Slide Stepper */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentSlideIndex <= 0}
                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Slide Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-orange-400">
                    {currentSlideIndex + 1} / {slides.length}
                  </div>

                  <button
                    type="button"
                    disabled={currentSlideIndex >= slides.length - 1}
                    onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Slide Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Right: Fullscreen */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PptxViewer;
