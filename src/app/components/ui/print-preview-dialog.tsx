import React, { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";

GlobalWorkerOptions.workerSrc = pdfWorker;

interface PrintOptions {
  paperType: string;
  paperSize: string;
  printType: string;
  copies: number;
  orientation?: "portrait" | "landscape";
  pages?: string;
  pagesPerSheet?: string;
  twoSided?: string;
  pageRange?: string;
  specificPages?: string;
  margins?: string;
  scale?: string;
  customScale?: number;
}

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  file?: File;
  fileUrl?: string;
  pageCount?: number;
  options: PrintOptions;
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  fileName,
  file,
  fileUrl,
  pageCount = 1,
  options,
}: PrintPreviewDialogProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(50);
  const [resolvedFileUrl, setResolvedFileUrl] = useState(fileUrl);
  const [pdfPageCount, setPdfPageCount] = useState(pageCount);

  useEffect(() => {
    if (fileUrl) {
      setResolvedFileUrl(fileUrl);
      return;
    }
    if (!file) {
      setResolvedFileUrl(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setResolvedFileUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, fileUrl]);

  const getPaperDimensions = () => {
    const paperSize = options.paperSize.toLowerCase();
    const isLong = paperSize === "long" || paperSize === "folio";
    const isA4 = paperSize === "a4";
    const width = isA4 ? 8.27 : 8.5;
    const height = isA4 ? 11.69 : isLong ? 13 : 11;
    return options.orientation?.toLowerCase() === "landscape"
      ? { width: height, height: width }
      : { width, height };
  };

  const dimensions = getPaperDimensions();
  const isColored = options.printType
    .toLowerCase()
    .includes("color");
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
  const isImage = Boolean(resolvedFileUrl && ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension));
  const isPdf = Boolean(resolvedFileUrl && fileExtension === "pdf");
  const isText = Boolean(resolvedFileUrl && ["txt", "md", "csv"].includes(fileExtension));
  const sheetCount = Math.max(1, Number(options.pagesPerSheet) || 1);
  const previewPages = Array.from({ length: sheetCount }, (_, index) => index);
  const displayPageCount = isPdf ? pdfPageCount : pageCount;
  const pageNumbers = (() => {
    const range = options.pageRange?.toLowerCase();
    if (range === "odd") return Array.from({ length: displayPageCount }, (_, index) => index + 1).filter((page) => page % 2 === 1);
    if (range === "even") return Array.from({ length: displayPageCount }, (_, index) => index + 1).filter((page) => page % 2 === 0);
    if (range === "specific" && options.specificPages) {
      const pages = new Set<number>();
      options.specificPages.split(",").forEach((part) => {
        const [start, end] = part.trim().split("-").map(Number);
        if (!Number.isFinite(start)) return;
        const last = Number.isFinite(end) ? end : start;
        for (let page = start; page <= last && page <= displayPageCount; page += 1) {
          if (page > 0) pages.add(page);
        }
      });
      return [...pages].sort((a, b) => a - b);
    }
    return Array.from({ length: displayPageCount }, (_, index) => index + 1);
  })();
  const currentPageIndex = Math.max(0, pageNumbers.indexOf(currentPage));
  const settingsScale = options.scale === "fit"
    ? 0.94
    : options.scale === "paper"
      ? 1
      : options.scale === "custom"
        ? Math.min(2, Math.max(0.25, (options.customScale || 100) / 100))
        : 1;
  const paperWidth = dimensions.width * 96 * zoom / 100;
  const paperHeight = dimensions.height * 96 * zoom / 100;

  useEffect(() => {
    setCurrentPage(1);
    setPdfPageCount(pageCount);
    setZoom(50);
  }, [fileName, pageCount]);

  useEffect(() => {
    if (!pageNumbers.includes(currentPage)) setCurrentPage(pageNumbers[0] || 1);
  }, [options.pageRange, options.specificPages, displayPageCount, currentPage, pageNumbers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-7xl h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-none shadow-2xl">
        <DialogDescription className="sr-only">
          Preview of {fileName} with {pageCount} pages before printing
        </DialogDescription>
        {/* TOP TOOLBAR - Pinned */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0 z-10">
          <div className="flex items-center gap-3">
            <DialogTitle className="sr-only">
              Print Preview
            </DialogTitle>
          </div>

          {/* Pagination Controls in Header for better UX */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-md p-1 border">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setCurrentPage((prev) =>
                    pageNumbers[Math.max(0, currentPageIndex - 1)] || 1,
                  )
                }
                disabled={currentPageIndex <= 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
                <span className="text-xs font-bold px-3 min-w-[80px] text-center">
                Page {currentPage} of {displayPageCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setCurrentPage((prev) =>
                    pageNumbers[Math.min(pageNumbers.length - 1, currentPageIndex + 1)] || 1,
                  )
                }
                disabled={currentPageIndex >= pageNumbers.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1" />

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setZoom((z) => Math.max(50, z - 25))
                }
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold w-12 text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setZoom((z) => Math.min(150, z + 25))
                }
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* MAIN BODY - Split View */}
        <div className="flex-1 flex overflow-hidden bg-slate-100">
         {/* Browser-like workspace: only the actual document surface is white. */}
         <main className="flex-1 overflow-auto bg-[#e8edf3] p-8 custom-scrollbar">
            <div
              className="relative mx-auto mb-12 transition-all duration-200"
              style={{
              width: `${paperWidth}px`,
              height: `${paperHeight}px`,
              }}
            >
              {/* Actual file preview with the selected print treatment applied. */}
              <div className={`h-full w-full ${options.margins === "none" ? "p-0" : options.margins === "minimum" ? "p-[1.5%]" : "p-[4%]"} ${sheetCount > 1 ? "grid gap-2" : ""}`} style={sheetCount > 1 ? { gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(sheetCount))}, minmax(0, 1fr))` } : undefined}>
                {previewPages.map((page) => (
                  <div key={page} className="relative flex min-h-0 items-center justify-center overflow-hidden border border-gray-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]" style={{ filter: isColored ? "none" : "grayscale(1)" }}>
                    {isImage && resolvedFileUrl ? (
                      <img src={resolvedFileUrl} alt={`${fileName}, page ${currentPage}`} className="h-full w-full object-contain" style={{ transform: `scale(${settingsScale})`, transformOrigin: "center" }} />
                    ) : isPdf && resolvedFileUrl ? (
                      <PdfCanvasPreview
                        source={file || resolvedFileUrl}
                        pageNumber={pageNumbers[currentPageIndex + page] || currentPage}
                        zoom={zoom}
                        contentScale={settingsScale}
                        onPageCount={setPdfPageCount}
                      />
                    ) : isText && resolvedFileUrl ? (
                      <iframe title={`${fileName}, page ${currentPage}`} src={resolvedFileUrl} className="h-full w-full border-0 bg-white" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-gray-400">
                        <FileText className="h-10 w-10 text-[#1D73EC]/40" />
                        <p className="text-sm font-semibold text-gray-500">Preview unavailable for this format</p>
                        <p className="text-xs">The file is attached and the selected print settings are shown at right.</p>
                      </div>
                    )}
                    {sheetCount === 1 && <span className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-gray-500 shadow">Page {currentPage}</span>}
                  </div>
                ))}
              </div>

              {/* Badges pinned to paper for visual flair */}
              <div className="absolute -top-3 -right-3 z-20"></div>
            </div>
          </main>

          {/* SETTINGS SIDEBAR - Pinned Right */}
          <aside className="w-80 bg-white border-l overflow-y-auto hidden lg:flex flex-col shrink-0">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Print Configuration
                </h3>
                <div className="space-y-3">
                  <SettingItem
                    label="Paper Size"
                    value={options.paperSize}
                  />
                  <SettingItem
                    label="Print Type"
                    value={options.printType}
                    color={isColored ? "text-blue-600" : ""}
                  />
                  <SettingItem
                    label="Orientation"
                    value={options.orientation || "Portrait"}
                  />
                  <SettingItem
                    label="Copies"
                    value={options.copies.toString()}
                  />
                  {options.pagesPerSheet && (
                    <SettingItem
                      label="Pages/Sheet"
                      value={options.pagesPerSheet}
                    />
                  )}
                  {options.twoSided && (
                    <SettingItem
                      label="Two-Sided"
                      value={options.twoSided}
                    />
                  )}
                  {options.pageRange && options.pageRange !== "All" && (
                    <SettingItem
                      label="Page Range"
                      value={options.pageRange}
                    />
                  )}
                  {options.specificPages && (
                    <SettingItem
                      label="Specific Pages"
                      value={options.specificPages}
                    />
                  )}
                  {options.margins && <SettingItem label="Margins" value={options.margins} />}
                  {options.scale && <SettingItem label="Scale" value={options.scale === "custom" ? `${options.customScale || 100}%` : options.scale} />}
                </div>
              </div>
              <div className="pt-6 border-t">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-gray-900">
                    Final Calculation
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  {pageCount} Pages × {options.copies} Copies
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border text-center">
                  <span className="text-2xl font-black text-gray-900">
                    {pageCount * options.copies}
                  </span>
                  <span className="ml-2 text-xs font-bold text-gray-500 uppercase">
                    Total Sheets
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ACTION FOOTER - Pinned */}
        <footer className="px-6 py-4 bg-white border-t flex items-center justify-end shrink-0">
          <Button
            variant="outline"
            className="font-bold"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function PdfCanvasPreview({
  source,
  pageNumber,
  zoom,
  contentScale,
  onPageCount,
}: {
  source: File | string;
  pageNumber: number;
  zoom: number;
  contentScale: number;
  onPageCount: (count: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | undefined;

    const renderPage = async () => {
      setStatus("loading");
      try {
        const data = source instanceof File
          ? new Uint8Array(await source.arrayBuffer())
          : new Uint8Array(await fetch(source).then((response) => response.arrayBuffer()));

        loadingTask = getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        onPageCount(pdf.numPages);
        const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
        if (cancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: 1.4 * zoom / 100 });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to render PDF preview:", error);
          setStatus("error");
        }
      }
    };

    renderPage();
    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [source, pageNumber, zoom, contentScale, onPageCount]);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-white">
      <canvas
        ref={canvasRef}
        className={status === "ready" ? "opacity-100" : "opacity-0"}
        style={{
          width: canvasRef.current ? `${canvasRef.current.width}px` : undefined,
          height: canvasRef.current ? `${canvasRef.current.height}px` : undefined,
          transform: `scale(${contentScale})`,
          transformOrigin: "center",
        }}
      />
      {status === "loading" && <span className="absolute text-xs font-medium text-gray-400">Loading PDF page...</span>}
      {status === "error" && (
        <div className="absolute px-5 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-red-300" />
          <p className="text-sm font-semibold text-gray-500">Unable to load this PDF</p>
          <p className="mt-1 text-xs text-gray-400">Try uploading the file again.</p>
        </div>
      )}
    </div>
  );
}

// Helper component for cleaner sidebar code
function SettingItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50">
      <span className="text-xs font-semibold text-gray-500">
        {label}
      </span>
      <span
        className={`text-xs font-bold ${color || "text-gray-900"} capitalize`}
      >
        {value}
      </span>
    </div>
  );
}