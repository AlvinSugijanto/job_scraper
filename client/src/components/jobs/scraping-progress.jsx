"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Clock, Check, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

/**
 * Hook for WebSocket scraping with real-time progress
 */
export function useScrapingProgress() {
  const [status, setStatus] = useState("idle"); // idle, connecting, scraping, rate_limit, completed, error
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState({
    page: 0,
    jobs: 0,
    current: 0,
    total: 0,
  });
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState(null);
  const wsRef = useRef(null);
  const countdownRef = useRef(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setProgress({ page: 0, jobs: 0, current: 0, total: 0 });
    setCountdown(0);
    setResult(null);
  }, []);

  const startScraping = useCallback(
    (searchParams) => {
      reset();
      setStatus("connecting");

      // Generate unique client ID
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ws = new WebSocket(`${WS_URL}/ws/scrape/${clientId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("scraping");
        setMessage("Connecting to server...");
        // Send search params
        ws.send(JSON.stringify(searchParams));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "started":
            setMessage(data.message);
            break;

          case "fetching_page":
            setStatus("scraping");
            setMessage(`Fetching page ${data.page}...`);
            setProgress((p) => ({
              ...p,
              page: data.page,
              jobs: data.jobs_found,
            }));
            break;

          case "rate_limit":
            setStatus("rate_limit");
            setMessage(data.message);
            setCountdown(data.wait_seconds);

            // Start countdown
            if (countdownRef.current) clearInterval(countdownRef.current);
            countdownRef.current = setInterval(() => {
              setCountdown((c) => {
                if (c <= 1) {
                  clearInterval(countdownRef.current);
                  setStatus("scraping");
                  return 0;
                }
                return c - 1;
              });
            }, 1000);
            break;

          case "parsing":
            setMessage(`Parsing jobs ${data.current}/${data.total}...`);
            setProgress((p) => ({
              ...p,
              current: data.current,
              total: data.total,
            }));
            break;

          case "completed":
            setStatus("completed");
            setMessage(data.message);
            setResult({ total: data.total_jobs, new: data.new_jobs });
            ws.close();
            break;

          case "error":
            setStatus("error");
            setMessage(data.message);
            ws.close();
            break;
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setMessage("Connection error");
      };

      ws.onclose = () => {
        if (status !== "completed" && status !== "error") {
          // Unexpected close
        }
      };
    },
    [reset],
  );

  const cancel = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    reset();
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return {
    status,
    message,
    progress,
    countdown,
    result,
    startScraping,
    cancel,
    reset,
    isActive: status !== "idle" && status !== "completed" && status !== "error",
  };
}

/**
 * Visual progress component for scraping
 */
export function ScrapingProgress({
  status,
  message,
  progress,
  countdown,
  result,
}) {
  if (status === "idle") return null;

  const getIcon = () => {
    switch (status) {
      case "connecting":
      case "scraping":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "rate_limit":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getProgressValue = () => {
    if (status === "rate_limit") {
      return 100; // Show full bar during rate limit
    }
    if (progress.total > 0) {
      return (progress.current / progress.total) * 100;
    }
    return 0;
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium">{message}</span>
      </div>

      {status === "rate_limit" && countdown > 0 && (
        <div className="flex items-center gap-2">
          <Progress value={100} className="flex-1 [&>div]:bg-yellow-500" />
          <span className="text-sm font-mono text-yellow-600 dark:text-yellow-400">
            {countdown}s
          </span>
        </div>
      )}

      {status === "scraping" && (
        <div className="space-y-1">
          <Progress value={getProgressValue()} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Page {progress.page}</span>
            <span>{progress.jobs} jobs found</span>
          </div>
        </div>
      )}

      {status === "completed" && result && (
        <p className="text-sm text-muted-foreground">
          Found <strong>{result.total}</strong> jobs ({result.new} new)
        </p>
      )}
    </div>
  );
}
