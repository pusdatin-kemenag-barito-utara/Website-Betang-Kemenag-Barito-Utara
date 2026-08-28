import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface PdfPageItemProps {
  doc: any;
  pageNumber: number;
  scale: number;
  rotation: number;
}

export function PdfPageItem({ doc, pageNumber, scale, rotation }: PdfPageItemProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      if (!doc || !canvasRef.current) return;
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // abaikan jika sudah selesai
          }
        }

        const page = await doc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const viewport = page.getViewport({ scale, rotation });
        const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        };

        const task = page.render(renderContext as any);
        renderTaskRef.current = task;
        await task.promise;
        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Kesalahan render halaman ${pageNumber}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // abaikan
        }
      }
    };
  }, [doc, pageNumber, scale, rotation]);

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      className="pdf-page-container relative flex flex-col items-center my-3 sm:my-4 transition-all max-w-full"
    >
      <div className="relative shadow-2xl rounded-none overflow-hidden bg-white ring-1 ring-black/10 max-w-full">
        <canvas ref={canvasRef} className="block max-w-none" />
        {!isRendered && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 min-h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}
      </div>
      <div className="mt-2 px-2.5 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] font-semibold text-slate-400 shadow-sm">
        Halaman {pageNumber}
      </div>
    </div>
  );
}
