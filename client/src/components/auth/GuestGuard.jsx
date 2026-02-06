"use client";

import { useEffect } from "react";
// CUSTOM DEFINED HOOK
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function GuestGuard({ children }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      return router.replace("/dashboard");
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
