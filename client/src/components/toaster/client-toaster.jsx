"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export default function ThemeToaster() {
  const { theme, systemTheme } = useTheme();

  // fallback untuk "system"
  const activeTheme = theme === "system" ? systemTheme : theme;

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: "!text-xs",
      }}
      theme={activeTheme || "light"} // default fallback
    />
  );
}
