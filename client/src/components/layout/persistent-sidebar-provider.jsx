"use client";

import { useEffect, useState } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";

/**
 * This wrapper persists sidebar state (collapsed/expanded)
 * to localStorage and restores it on next reload.
 */
export function PersistentSidebarProvider({ children }) {
  const [initialState, setInitialState] = useState("collapsed"); // ✅ default collapsed
  const [ready, setReady] = useState(false);

  // restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-state");
    if (saved) setInitialState(saved);
    setReady(true);
  }, []);

  if (!ready) return null; // prevent hydration mismatch

  return (
    // <SidebarProvider defaultOpen={initialState === "expanded"}>
    <SidebarProvider defaultOpen={false}>
      <SidebarStateSync />
      {children}
    </SidebarProvider>
  );
}

/**
 * Keeps localStorage in sync with sidebar state changes.
 */
function SidebarStateSync() {
  const { state } = useSidebar();

  useEffect(() => {
    localStorage.setItem("sidebar-state", state);
  }, [state]);

  return null;
}
