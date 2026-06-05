"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Reusable delete confirmation dialog.
 *
 * Props:
 * - open          {boolean}           — controlled open state
 * - setOpen       {(v: boolean)=>void} — setter for open state
 * - title         {string}            — dialog title (default: "Delete Confirmation")
 * - description   {string}            — body text shown to user
 * - onConfirm     {()=>Promise|void}  — async/sync handler called on confirm
 * - loading       {boolean}           — shows loading state on confirm button
 * - confirmText   {string}            — confirm button label (default: "Delete")
 * - cancelText    {string}            — cancel button label (default: "Cancel")
 */
const DeleteDialog = ({
  open,
  setOpen,
  title = "Delete Confirmation",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  onConfirm,
  loading = false,
  confirmText = "Delete",
  cancelText = "Cancel",
}) => {
  const handleConfirm = async () => {
    await onConfirm?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}

          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            loading={loading}
            loadingText="Deleting..."
          >
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteDialog;
