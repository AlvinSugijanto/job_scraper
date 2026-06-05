"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/utils/cn";

const CustomModal = ({ open, setOpen, title, className, children }) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className={cn("p-0 overflow-hidden ", className)} // tambah default di sini
      >
        <DialogHeader className="flex flex-row items-center border-b p-4 relative space-y-0">
          <DialogTitle className="font-medium text-lg">{title}</DialogTitle>
          <Button
            onClick={() => setOpen(false)}
            variant="ghost"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 h-auto rounded-md hover:bg-muted transition-colors"
          >
            <X size={16} />
          </Button>
        </DialogHeader>

        <div className=" overflow-y-auto max-h-[80vh]">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomModal;
