import { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface CanvasProps {
  scale: number;
  documentUrl?: string;
  onDocumentLoad?: (numPages: number, outline: any[]) => void;
}

export default function Canvas({ scale, documentUrl, onDocumentLoad }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!documentUrl) return;

    const renderPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url: documentUrl });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        // Fetch document metadata
        const numPages = pdf.numPages;
        let outline = await pdf.getOutline();
        if (!outline) outline = []; // fallback if null

        if (onDocumentLoad) {
          onDocumentLoad(numPages, outline);
        }

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        } as any;
        
        await page.render(renderContext).promise;
      } catch (error) {
        console.warn("Could not render document:", error);
      }
    };

    renderPdf();
  }, [scale, documentUrl]);

  return (
    <div className="w-full h-full bg-adwaita-bg overflow-auto flex justify-center items-start p-8">
      <div className="relative bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-in-out">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
