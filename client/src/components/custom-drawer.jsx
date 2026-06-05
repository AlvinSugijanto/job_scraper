"use client";
import React, { useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Button } from "./ui/button";

const CustomDrawer = ({
  open,
  setOpen,
  title,
  direction = "right",
  // width = "lg",
  children,
}) => {
  return (
    <Drawer direction={direction} open={open} onOpenChange={setOpen}>
      <DrawerContent className="!w-[420px] !max-w-full h-full">
        <DrawerHeader className="flex justify-center border-b">
          <DrawerTitle className="font-medium text-lg ml-2">
            {title}
          </DrawerTitle>
          <Button
            onClick={() => setOpen(false)}
            variant={"ghost"}
            className="absolute right-6 top-3  p-2 rounded-md hover:bg-muted transition-colors"
          >
            <X size={16} />
          </Button>
        </DrawerHeader>

        {children}
      </DrawerContent>
    </Drawer>
  );
};

export default CustomDrawer;
