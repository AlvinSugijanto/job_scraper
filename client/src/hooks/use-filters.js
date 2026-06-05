"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useFilters({ initialFilters = {}, resetPage } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params, fallback to defaults
  const [filters, setFiltersState] = useState(() => {
    const state = {};
    for (const [key, defaultValue] of Object.entries(initialFilters)) {
      state[key] = searchParams.get(key) || defaultValue;
    }
    return state;
  });

  const syncToUrl = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value.toString());
        }
      });
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setFilter = useCallback(
    (key, value) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
      resetPage?.();
      syncToUrl({ [key]: value, page: 0 });
    },
    [resetPage, syncToUrl],
  );

  const setFilters = useCallback(
    (updates) => {
      setFiltersState((prev) => ({ ...prev, ...updates }));
      resetPage?.();
      syncToUrl({ ...updates, page: 0 });
    },
    [resetPage, syncToUrl],
  );

  const handleSort = useCallback(
    (key) => {
      const newDirection =
        filters.sortBy === key && filters.sortOrder === "asc" ? "desc" : "asc";
      const updates = { sortBy: key, sortOrder: newDirection };
      setFiltersState((prev) => ({ ...prev, ...updates }));
      resetPage?.();
      syncToUrl({ ...updates, page: 0 });
    },
    [filters.sortBy, filters.sortOrder, resetPage, syncToUrl],
  );

  return {
    filters,
    setFilter,
    setFilters,
    handleSort,
  };
}
