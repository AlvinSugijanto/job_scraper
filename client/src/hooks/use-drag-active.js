"use client";

import { useState, useEffect } from "react";

/**
 * Tracks whether any file is currently being dragged anywhere in the browser window.
 * Uses a ref-based counter to avoid stale closures with rapid dragenter/dragleave events.
 */
export function useDragActive() {
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    let counter = 0;

    const isFileDrag = (e) =>
      e.dataTransfer?.types &&
      Array.from(e.dataTransfer.types).includes("Files");

    const onDragEnter = (e) => {
      if (!isFileDrag(e)) return;
      counter++;
      if (counter === 1) setIsDragActive(true);
    };

    const onDragLeave = (e) => {
      if (!isFileDrag(e)) return;
      counter = Math.max(0, counter - 1);
      if (counter === 0) setIsDragActive(false);
    };

    const reset = () => {
      counter = 0;
      setIsDragActive(false);
    };

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", reset);
    document.addEventListener("dragend", reset);

    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", reset);
      document.removeEventListener("dragend", reset);
    };
  }, []);

  return isDragActive;
}
