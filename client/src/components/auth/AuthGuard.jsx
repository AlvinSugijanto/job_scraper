"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// CUSTOM DEFINED HOOK
import { useAuth } from "@/context/auth-context";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth/login");
    else setIsLoggedIn(true);
  }, [isAuthenticated, router]);

  if (isLoggedIn) return <>{children}</>;
  return null;
}
