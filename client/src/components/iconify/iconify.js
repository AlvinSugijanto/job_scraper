"use client";

import { forwardRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------

const Iconify = forwardRef(
  ({ icon, width = 20, height, className, style, ...other }, ref) => {
    return (
      <Icon
        ref={ref}
        icon={icon}
        className={cn("inline-block align-middle", className)}
        width={width}
        height={height || width}
        style={style}
        {...other}
      />
    );
  }
);

Iconify.displayName = "Iconify";

export default Iconify;
