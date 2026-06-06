"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Trash2,
  Plus,
  EllipsisVertical,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleTable, usePagination } from "@/components/table/simple-table";
import { fDate } from "@/utils/format-time";
import { useApi } from "@/hooks/use-api";
import AddKeywordModal from "../components/add-keyword-dialog";
import { useFilters } from "@/hooks/use-filters";
import DeleteDialog from "@/components/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBoolean } from "@/hooks/use-boolean";
import SearchInput from "@/components/search-input";
import { useTableSelection } from "@/hooks/use-table-selection";

const PAGE_SIZE = 10;

export default function BannedKeywordsSection() {
  const createModal = useBoolean(false);
  const deleteModal = useBoolean(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const { data: keywords, call, loading } = useApi();
  const { call: callDelete, loading: loadingDelete } = useApi();

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: keywords?.total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilter, handleSort, getQueryParams } = useFilters({
    initialFilters: {
      q: "",
      sortBy: "keyword",
      sortOrder: "asc",
    },
    paramMapping: {
      q: "search",
      sortBy: "sort_by",
      sortOrder: "sort_order",
    },
    resetPage: () => setPage(1),
  });
  const {
    selectedRows,
    handleSelectOne,
    handleSelectPage,
    handleSelectAll,
    handleClearSelection,
    handleExport,
  } = useTableSelection({
    currentPageData: keywords?.data || [],
    apiUrl: "/api/v1/banned-keywords",
    filters,
    itemLabel: "keywords",
    getQueryParams,
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchKeywords = async () => {
    const params = getQueryParams({ page, perPage: pageSize });
    call(`/api/v1/banned-keywords?${params}`);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem?.id) return;
    try {
      await callDelete(`/api/v1/banned-keywords/${selectedItem.id}`, "DELETE");
      toast.success(`"${selectedItem.keyword}" deleted successfully.`);
      deleteModal.onFalse();
      fetchKeywords();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Failed to delete keyword",
      );
    }
  };

  const columns = [
    {
      key: "keyword",
      label: "Keyword / Phrase",
      className: "font-medium text-foreground px-4",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className="px-2.5 py-1 text-sm font-medium">
          {row.keyword}
        </Badge>
      ),
    },
    {
      key: "created_at",
      label: "Added Date",
      className: "w-[180px] text-muted-foreground text-sm",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
          {fDate(row.created_at) || "N/A"}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Action",
      className: "w-[100px] text-right",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(row);
                createModal.onTrue();
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(row);
                deleteModal.onTrue();
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Refetch when page, pageSize, or filters change
  useEffect(() => {
    fetchKeywords();
  }, [page, pageSize, filters]);

  // Clear selection when jobs change
  useEffect(() => {
    handleClearSelection();
  }, [keywords?.data]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <h3 className="font-semibold  self-end ml-1">Banned Companies</h3>
        <div className="flex items-center gap-4">
          {selectedRows.size > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export ({selectedRows.size})
            </Button>
          )}

          <SearchInput
            value={filters.q}
            onChange={(value) => setFilter("q", value)}
            placeholder="Search items..."
          />
          <Button onClick={createModal.onTrue} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Keyword
          </Button>
        </div>
      </div>

      <SimpleTable
        columns={columns}
        data={keywords?.data || []}
        isLoading={loading}
        sortConfig={sortConfig}
        onSort={handleSort}
        paginationProps={paginationProps}
        selectable
        selectedIds={selectedRows}
        onSelectOne={handleSelectOne}
        onSelectPage={handleSelectPage}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {createModal.value && (
        <AddKeywordModal
          open={createModal.value}
          setOpen={createModal.setValue}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          refetch={fetchKeywords}
        />
      )}

      <DeleteDialog
        open={deleteModal.value}
        setOpen={deleteModal.setValue}
        title="Delete Banned Keyword"
        description={`Are you sure you want to delete "${selectedItem?.keyword || ""}" from the banned list?`}
        onConfirm={handleConfirmDelete}
        loading={loadingDelete}
      />
    </div>
  );
}
