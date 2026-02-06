"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ✅ Ensure we render only after hydration
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Avoid rendering mismatched theme buttons before hydration
    return (
      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 opacity-0">
        <button className="p-2 rounded-md transition-all">
          <Sun className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md transition-all">
          <Monitor className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-md transition-all">
          <Moon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-md transition-all ${
          theme === "light"
            ? "bg-white dark:bg-gray-700 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
        title="Light Mode"
      >
        <Sun className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-md transition-all ${
          theme === "system"
            ? "bg-white dark:bg-gray-700 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
        title="System"
      >
        <Monitor className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-md transition-all ${
          theme === "dark"
            ? "bg-white dark:bg-gray-700 shadow-sm"
            : "hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
}
