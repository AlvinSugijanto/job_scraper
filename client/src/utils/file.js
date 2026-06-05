import axios from "axios";
import { FileText, X } from "lucide-react";
import { useEffect, useState } from "react";

export function getFileTypeLabel(type) {
  if (!type) return "File";
  if (type.startsWith("image/"))
    return type.replace("image/", "").toUpperCase();
  if (type === "application/pdf") return "PDF";
  if (type.includes("word")) return "DOCX";
  if (type.includes("sheet") || type.includes("excel")) return "XLSX";
  if (type.includes("presentation") || type.includes("powerpoint"))
    return "PPTX";
  if (type.startsWith("text/")) return type.replace("text/", "").toUpperCase();
  return type.split("/").pop().toUpperCase();
}

export function getFileExtension(filename) {
  if (!filename) return "";
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts.pop().toUpperCase();
  }
  return "";
}

export const getFileSize = (kb) => {
  if (!kb) return "-";

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  if (kb < 1024 * 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
};

export const getFileSizeFromBytes = (bytes) => {
  if (!bytes) return "-";

  if (bytes < 1024) {
    return `${bytes.toFixed(1)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export function FileChip({ file, onRemove }) {
  const isImage = file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url); // cleanup on unmount
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1 text-xs max-w-[200px]">
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={file.name}
          className="size-5 rounded object-cover shrink-0"
        />
      ) : (
        <FileText className="size-3.5 text-accent-gold shrink-0" />
      )}
      <span className="truncate text-foreground">{file.name}</span>
      <span className="shrink-0 bg-accent-gold/20 text-accent-gold rounded px-1 font-medium">
        {getFileTypeLabel(file.type)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

export const downloadFile = (url, filename) => {
  const link = document.createElement("a");
  link.href = `/api/v1/${url}`;

  link.download = filename ?? "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadFilez = async (url, filename) => {
  try {
    const response = await axios.get(`/api/v1/${url}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data]);
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename ?? "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error("Download failed:", err);
    throw err;
  }
};

/**
 * Trigger a browser download from a raw CSV string.
 * @param {string} csvString  - The raw CSV content
 * @param {string} filename   - The file name to save as (e.g. "results.csv")
 */
export const downloadCsvString = (csvString, filename = "export.csv") => {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
