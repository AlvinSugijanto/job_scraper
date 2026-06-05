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
import { exportToCSV } from "@/utils/export-csv";
import SearchInput from "@/components/search-input";
const PAGE_SIZE = 10;

export default function BannedCompaniesSection() {
  const loadingDelete = useBoolean(false);

  const [allCompanies, setAllCompanies] = useState([]);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const { data: companies, call, loading } = useApi();

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: companies?.total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilter, handleSort } = useFilters({
    initialFilters: {
      q: "",
      sortBy: "name",
      sortOrder: "asc",
    },
    resetPage: () => setPage(1),
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchCompanies = async () => {
    const params = new URLSearchParams();
    if (filters.q) params.append("search", filters.q);
    if (filters.sortBy) params.append("sort_by", filters.sortBy);
    if (filters.sortOrder) params.append("sort_order", filters.sortOrder);
    params.append("page", page.toString());
    params.append("perPage", pageSize.toString());

    call(`/api/v1/banned-companies?${params}`);
  };

  const handleSelectOne = (jobId, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(jobId);
    } else {
      newSelected.delete(jobId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectPage = () => {
    setSelectedRows(new Set(companies?.data?.map((item) => item.id)));
  };

  const handleSelectAll = async () => {
    const params = new URLSearchParams();
    if (filters.q) params.append("search", filters.q);
    if (filters.sortBy) params.append("sort_by", filters.sortBy);
    if (filters.sortOrder) params.append("sort_order", filters.sortOrder);
    params.append("perPage", "1000");

    try {
      const { data } = await call(`/api/v1/banned-companies?${params}`);
      setSelectedRows(new Set((data || []).map((item) => item.id)));
      setAllCompanies(data || []);
      toast.success(`Selected all ${data?.length ?? 0} companies`);
    } catch (error) {
      toast.error("Failed to select all companies");
    }
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
    setAllCompanies([]);
  };

  const handleExport = () => {
    const sourceJobs =
      allCompanies?.length > 0 ? allCompanies : companies?.data || [];
    const jobsToExport = sourceJobs.filter((job) => selectedRows.has(job.id));

    if (jobsToExport.length === 0) {
      toast.error("Please select at least one banned company to export");
      return;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(jobsToExport, `banned_companies_${timestamp}.csv`);
    setSelectedRows(new Set());
    setAllCompanies([]);
    toast.success(`Exported ${jobsToExport.length} banned companies to CSV`);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem?.id) return;
    loadingDelete.onTrue();
    try {
      await call(`/api/v1/banned-companies/${selectedItem.id}`, "DELETE");
      toast.success(`"${selectedItem.name}" deleted successfully.`);
      setOpenDeleteModal(false);
      fetchCompanies();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Failed to delete company",
      );
    } finally {
      loadingDelete.onFalse();
    }
  };

  // Refetch when page, pageSize, or filters change
  useEffect(() => {
    fetchCompanies();
  }, [page, pageSize, filters]);

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
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(row);
                setOpenDeleteModal(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-tight">
          Banned Companies
        </h3>
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
            placeholder="Filter companies..."
          />

          <Button onClick={() => setOpenCreateModal(true)} size="sm">
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

      <AddCompanyModal
        open={openCreateModal}
        setOpen={setOpenCreateModal}
        refetch={fetchCompanies}
      />

      <DeleteDialog
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        title="Delete Banned Company"
        description={`Are you sure you want to delete "${selectedItem?.name || ""}" from the banned list?`}
        onConfirm={handleConfirmDelete}
        loading={loadingDelete.value}
      />
    </div>
  );
}
