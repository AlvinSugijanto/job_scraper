"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Clock, Check, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

const PORTAL_META = {
  LinkedIn: { color: "bg-blue-600", text: "text-blue-600", label: "LinkedIn" },
  Jobstreet: {
    color: "bg-purple-600",
    text: "text-purple-600",
    label: "Jobstreet",
  },
  Kalibrr: {
    color: "bg-orange-500",
    text: "text-orange-500",
    label: "Kalibrr",
  },
};

/**
 * Hook for WebSocket scraping with real-time progress
 */
export function useScrapingProgress() {
  const [status, setStatus] = useState("idle"); // idle, connecting, scraping, rate_limit, completed, error
  const [message, setMessage] = useState("");
  const [activePortal, setActivePortal] = useState(""); // which portal is currently being scraped
  const [portalProgress, setPortalProgress] = useState({}); // { LinkedIn: { page, jobs }, Jobstreet: { page, jobs }, ... }
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
    setActivePortal("");
    setPortalProgress({});
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

          case "fetching_page": {
            const portal = data.portal || "";
            setStatus("scraping");
            setActivePortal(portal);
            setMessage(
              portal
                ? `Fetching page ${data.page} from ${portal}...`
                : `Fetching page ${data.page}...`,
            );
            setProgress((p) => ({
              ...p,
              page: data.page,
              jobs: data.jobs_found,
            }));
            if (portal) {
              setPortalProgress((prev) => ({
                ...prev,
                [portal]: { page: data.page, jobs: data.jobs_found },
              }));
            }
            break;
          }

          case "rate_limit":
            setStatus("rate_limit");
            setMessage(data.message);
            if (data.portal) setActivePortal(data.portal);
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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "cancel" }));
      setStatus("scraping");
      setMessage("Canceling and saving results...");
    } else {
      if (wsRef.current) wsRef.current.close();
      reset();
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
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
    activePortal,
    portalProgress,
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
  activePortal,
  portalProgress,
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
    if (status === "rate_limit") return 100;
    if (progress.total > 0) return (progress.current / progress.total) * 100;
    return 0;
  };

  const portalEntries = Object.entries(portalProgress);

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
      {/* Main status row */}
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium">{message}</span>
        {activePortal && (status === "scraping" || status === "rate_limit") && (
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${PORTAL_META[activePortal]?.color ?? "bg-gray-500"}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
            {activePortal}
          </span>
        )}
      </div>

      {/* Rate limit bar */}
      {status === "rate_limit" && countdown > 0 && (
        <div className="flex items-center gap-2">
          <Progress value={100} className="flex-1 [&>div]:bg-yellow-500" />
          <span className="text-sm font-mono text-yellow-600 dark:text-yellow-400">
            {countdown}s
          </span>
        </div>
      )}

      {/* Per‑portal progress pills */}
      {portalEntries.length > 0 && status !== "completed" && (
        <div className="flex flex-wrap gap-2">
          {portalEntries.map(([portal, data]) => {
            const meta = PORTAL_META[portal] ?? {
              color: "bg-gray-500",
              text: "text-gray-600",
            };
            const isActive = portal === activePortal && status === "scraping";
            return (
              <div
                key={portal}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all ${
                  isActive
                    ? "border-current shadow-sm " + meta.text
                    : "border-border text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? meta.color : "bg-muted-foreground/50"} ${isActive ? "animate-pulse" : ""}`}
                />
                <span className="font-medium">{portal}</span>
                <span className="opacity-70">
                  pg {data.page} · {data.jobs} jobs
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Scraping page‑level progress bar */}
      {status === "scraping" && (
        <div className="space-y-1">
          <Progress value={getProgressValue()} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Page {progress.page}</span>
            <span>{progress.jobs} jobs found</span>
          </div>
        </div>
      )}

      {/* Completed summary */}
      {status === "completed" && result && (
        <p className="text-sm text-muted-foreground">
          Found <strong>{result.total}</strong> jobs ({result.new} new)
        </p>
      )}
    </div>
  );
}
