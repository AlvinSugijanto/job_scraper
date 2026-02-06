"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * ConfirmDialog Component
 * @param {boolean} open - state untuk menampilkan dialog
 * @param {function} onOpenChange - fungsi untuk toggle open state
 * @param {function} onConfirm - callback saat user klik Confirm
 * @param {function} onClose - callback saat user klik Cancel
 * @param {string} title - judul dialog
 * @param {string} description - deskripsi dialog
 * @param {string} confirmText - teks tombol konfirmasi
 * @param {string} cancelText - teks tombol cancel
 * @param {string} variant - "danger" | "default"
 * @param {boolean} loading - state untuk menampilkan loading pada tombol konfirmasi
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose?.()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {variant === "danger" && (
              <AlertTriangle className="text-destructive w-5 h-5" />
            )}
            <DialogTitle className="text-sm font-bold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose?.();
            }}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : "default"}
            size="sm"
            onClick={() => {
              onConfirm?.();
            }}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
