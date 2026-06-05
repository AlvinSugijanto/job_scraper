import { useState, useRef, useCallback } from "react";

/**
 * useInfiniteScroll — minimal reusable hook.
 *
 * Manages page, loading, hasMore, and the IntersectionObserver.
 * Data state lives OUTSIDE in the consumer.
 *
 * Usage:
 *   const { page, loading, hasMore, lastElementRef, setLoading, setHasMore, reset } =
 *     useInfiniteScroll();
 *
 *   // Consumer fetches data and appends to its own state.
 */
export function useInfiniteScroll({ initialPage = 1 } = {}) {
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const observerRef = useRef(null);

  const loadNextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setHasMore(true);
    setLoading(false);
  }, [initialPage]);

  const lastElementRef = useCallback(
    (node) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || loading || !hasMore) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            loadNextPage();
          }
        },
        { rootMargin: "100px", threshold: 0 },
      );

      observerRef.current.observe(node);
    },
    [loading, hasMore, loadNextPage],
  );

  return {
    page,
    loading,
    hasMore,
    lastElementRef,
    setLoading,
    setHasMore,
    setPage,
    reset,
  };
}
