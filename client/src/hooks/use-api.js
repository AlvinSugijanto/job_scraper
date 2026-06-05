"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

export function useApi() {
  const router = useRouter();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const controllerRef = useRef(null);

  const call = async (url, method = "GET", body = null) => {
    // Cancel previous in-flight request if any
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const response = await axios({
        url: `${url}`,
        method,
        data: body || undefined,
        signal: controller.signal,
      });

      setData(response.data);
      return response.data;
    } catch (err) {
      // Don't handle aborted requests as errors
      if (axios.isCancel(err)) {
        return;
      }

      if (err.response?.status === 401) {
        logout();
        router.push("/login?expired=true");
        return;
      }

      if (err.response?.status === 500) {
        toast.error(
          "Something went wrong on our server. Please try again later.",
        );
      }

      setError(err.response?.data || err.message);
      throw err;
    } finally {
      // Only update loading if this controller is still the active one
      if (controllerRef.current === controller) {
        setLoading(false);
        controllerRef.current = null;
      }
    }
  };

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
      setLoading(false);
    }
  }, []);

  return { call, abort, data, loading, error };
}
