"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function usePagination({ pageSize = 10 } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "0", 10),
  );
  const [total, setTotal] = useState(0);

  const updatePageParam = useCallback(
    (newPage) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handlePageChange = useCallback(
    (newPage) => {
      setPage(newPage);
      updatePageParam(newPage);
    },
    [updatePageParam],
  );

  const resetPage = useCallback(() => {
    setPage(0);
    updatePageParam(0);
  }, [updatePageParam]);

  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(total / pageSize);
    const startItem = page * pageSize + 1;
    const endItem = Math.min((page + 1) * pageSize, total);
    const hasPrevious = page > 0;
    const hasNext = page < totalPages - 1;

    return { totalPages, startItem, endItem, hasPrevious, hasNext };
  }, [page, total, pageSize]);

  return {
    page,
    total,
    setTotal,
    pageSize,
    handlePageChange,
    resetPage,
    ...paginationInfo,
  };
}
