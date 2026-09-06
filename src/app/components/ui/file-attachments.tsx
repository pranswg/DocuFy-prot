import React, { useRef, useState } from "react";
import {
  FileText,
  Download,
  FileImage,
  FileSpreadsheet,
  Presentation,
  File,
  Eye,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { formatPHDate, formatPHTime } from "../../utils/pht";

interface AttachedFile {
  name: string;
  size: string;
  type: string;
  url?: string;
  uploadedAt?: string;
}

interface FileAttachmentsProps {
  files: AttachedFile[];
  orderId: string;
  showDownload?: boolean; // defaults to false — hides download on customer-facing views
  showView?: boolean; // show a "View" button that opens the file in a new tab (native viewer)
  showPrint?: boolean; // show a "Print" button that opens the Ctrl+P dialog directly
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getFileCategory(
  file: AttachedFile,
):
  | "pdf"
  | "image"
  | "spreadsheet"
  | "presentation"
  | "document"
  | "text"
  | "other" {
  const ext = getFileExtension(file.name);
  const type = file.type.toLowerCase();
  if (ext === "pdf" || type.includes("pdf")) return "pdf";
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
      ext,
    ) ||
    type.includes("image")
  )
    return "image";
  if (
    ["xls", "xlsx", "csv"].includes(ext) ||
    type.includes("spreadsheet") ||
    type.includes("excel")
  )
    return "spreadsheet";
  if (
    ["ppt", "pptx"].includes(ext) ||
    type.includes("presentation") ||
    type.includes("powerpoint")
  )
    return "presentation";
  if (
    ["doc", "docx"].includes(ext) ||
    type.includes("word") ||
    type.includes("document")
  )
    return "document";
  if (["txt", "md"].includes(ext) || type.includes("text"))
    return "text";
  return "other";
}

function FileIcon({
  file,
  size = "sm",
}: {
  file: AttachedFile;
  size?: "sm" | "lg";
}) {
  const cat = getFileCategory(file);
  const cls = size === "lg" ? "w-12 h-12" : "w-5 h-5";
  switch (cat) {
    case "pdf":
      return <FileText className={`${cls} text-red-500`} />;
    case "image":
      return <FileImage className={`${cls} text-blue-500`} />;
    case "spreadsheet":
      return (
        <FileSpreadsheet className={`${cls} text-blue-600`} />
      );
    case "presentation":
      return (
        <Presentation className={`${cls} text-blue-500`} />
      );
    case "document":
      return <FileText className={`${cls} text-[#1D73EC]`} />;
    case "text":
      return <FileText className={`${cls} text-gray-500`} />;
    default:
      return <File className={`${cls} text-gray-400`} />;
  }
}

function FileBadgeColor(file: AttachedFile): string {
  switch (getFileCategory(file)) {
    case "pdf":
      return "bg-red-50 text-red-700 border-red-200";
    case "image":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "spreadsheet":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "presentation":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "document":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function formatUploadDate(iso?: string): string {
  if (!iso) return "Unknown";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return `${formatPHDate(date, "short")} ${formatPHTime(date, { hour12: true })}`;
  } catch {
    return iso;
  }
}

// ─── Main FileAttachments Component ────────────────────────────────────────
export function FileAttachments({
  files,
  orderId,
  showDownload = false,
  showView = false,
  showPrint = false,
}: FileAttachmentsProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  if (!files || files.length === 0) return null;

  const handleDownload = (file: AttachedFile) => {
    const content = `[Docufy PSMS — Palawan State University]\nFile: ${file.name}\nOrder ID: ${orderId}\nSize: ${file.size}\nType: ${file.type}\nUploaded: ${formatUploadDate(file.uploadedAt)}\n\nThis is a placeholder download for the submitted document.\nActual file content would be served from the server.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success(`Downloading ${file.name}…`);
  };

  // Open the document in a new tab using the browser's native PDF viewer (no download).
  const handleView = (file: AttachedFile) => {
    if (!file.url) {
      toast.info("No document available to view in this session.");
      return;
    }
    const win = window.open(file.url, "_blank", "noopener,noreferrer");
    if (!win) {
      const a = document.createElement("a");
      a.href = file.url;
      a.target = "_blank";
      a.rel = "noopener,noreferrer";
      a.click();
    }
  };

  // Open the Ctrl+P print dialog directly on the document without showing anything in the app.
  const handlePrint = (file: AttachedFile) => {
    if (!file.url) {
      toast.info("No document available to print in this session.");
      return;
    }
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
        } catch {
          toast.error("Your browser blocked printing this document.");
        }
      };
      iframe.src = file.url;
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden iframe that loads the document in the background so we can trigger print without a visible tab. */}
      <iframe
        ref={iframeRef}
        title="print-frame"
        className="hidden"
        aria-hidden="true"
      />
      {files.map((file, index) => {
        const badgeCls = FileBadgeColor(file);
        const ext = getFileExtension(file.name).toUpperCase();

        return (
          <div
            key={index}
            className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-[#1D73EC] hover:shadow-sm transition-all"
          >
            {/* File icon */}
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <FileIcon file={file} size="sm" />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {file.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeCls}`}
                >
                  {ext || file.type}
                </span>
                <span className="text-xs text-gray-400">
                  {file.size}
                </span>
                {file.uploadedAt && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {formatUploadDate(file.uploadedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* View icon button — opens the document in a new tab */}
              {showView && (
                <button
                  onClick={() => handleView(file)}
                  title={`View ${file.name}`}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#1D73EC] hover:border-[#1D73EC] hover:bg-[#F2F7FF] transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Print icon button — opens the Ctrl+P dialog directly */}
              {showPrint && (
                <button
                  onClick={() => handlePrint(file)}
                  title={`Print ${file.name}`}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#1D73EC] hover:border-[#1D73EC] hover:bg-[#F2F7FF] transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Download icon button — only shown when showDownload is true */}
              {showDownload && (
                <button
                  onClick={() => handleDownload(file)}
                  title={`Download ${file.name}`}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#1D73EC] hover:border-[#1D73EC] hover:bg-[#F2F7FF] transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
