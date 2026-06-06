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
import { SimpleTable, usePagination } from "@/components/table/simple-table";
import { fDate } from "@/utils/format-time";
import { useApi } from "@/hooks/use-api";
import AddCompanyModal from "../components/add-company-dialog";
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

export default function BannedCompaniesSection() {
  const createModal = useBoolean(false);
  const deleteModal = useBoolean(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const { data: companies, call, loading } = useApi();
  const { call: callDelete, loading: loadingDelete } = useApi();

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: companies?.total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilter, handleSort, getQueryParams } = useFilters({
    initialFilters: {
      q: "",
      sortBy: "name",
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
    currentPageData: companies?.data || [],
    apiUrl: "/api/v1/banned-companies",
    filters,
    itemLabel: "companies",
    getQueryParams,
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchCompanies = async () => {
    const params = getQueryParams({ page, perPage: pageSize });
    call(`/api/v1/banned-companies?${params}`);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem?.id) return;
    try {
      await callDelete(`/api/v1/banned-companies/${selectedItem.id}`, "DELETE");
      toast.success(`"${selectedItem.name}" deleted successfully.`);
      deleteModal.onFalse();
      fetchCompanies();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Failed to delete company",
      );
    }
  };

  const columns = [
    {
      key: "name",
      label: "Company Name",
      className: "font-medium text-foreground px-4",
      sortable: true,
    },
    {
      key: "created_at",
      label: "Created at",
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
                createModal.onTrue();
                setSelectedItem(row);
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
    fetchCompanies();
  }, [page, pageSize, filters]);

  // Clear selection when jobs change
  useEffect(() => {
    handleClearSelection();
  }, [companies?.data]);

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
            <Plus className="h-4 w-4 mr-1.5" /> Add Company
          </Button>
        </div>
      </div>

      <SimpleTable
        columns={columns}
        data={companies?.data || []}
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
        <AddCompanyModal
          open={createModal.value}
          setOpen={createModal.setValue}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          refetch={fetchCompanies}
        />
      )}

      <DeleteDialog
        open={deleteModal.value}
        setOpen={deleteModal.setValue}
        title="Delete Banned Company"
        description={`Are you sure you want to delete "${selectedItem?.name || ""}" from the banned list?`}
        onConfirm={handleConfirmDelete}
        loading={loadingDelete}
      />
    </div>
  );
}
