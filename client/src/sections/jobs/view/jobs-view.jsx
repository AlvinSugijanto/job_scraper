"use client";

import { useState, useEffect } from "react";
import {
  Briefcase,
  Download,
  MapPin,
  Calendar,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchJobsDialog } from "@/components/jobs/search-jobs-dialog";
import { useApi } from "@/hooks/use-api";
import { SimpleTable, usePagination } from "@/components/table/simple-table";
import { JobsFilters } from "./jobs-filters";
import { exportJobsToCSV, exportToCSV } from "@/utils/export-csv";
import { useFilters } from "@/hooks/use-filters";
import { useTableSelection } from "@/hooks/use-table-selection";
import { useBoolean } from "@/hooks/use-boolean";
import { Badge } from "@/components/ui/badge";
import { fDate, fDateTime } from "@/utils/format-time";
import { JOB_CONTRACT, JOB_PORTALS, JOB_TYPE } from "@/data/enums";

const PAGE_SIZE = 10;

export default function JobsView() {
  const searchModal = useBoolean(false);
  const { data: jobs, call, loading } = useApi();

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: jobs?.total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilters, handleSort, getQueryParams } = useFilters({
    initialFilters: {
      q: "",
      job_type: "all",
      job_contract: "all",
      location: "",
      job_portal: "all",
      sortBy: "created_at",
      sortOrder: "desc",
    },
    paramMapping: {
      q: "search",
      sortBy: "sort_by",
      sortOrder: "sort_order",
      job_portal: "source",
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
    currentPageData: jobs?.data || [],
    apiUrl: "/api/v1/jobs",
    filters,
    itemLabel: "jobs",
    getQueryParams,
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchJobs = async () => {
    const params = getQueryParams({ page, perPage: pageSize });
    call(`/api/v1/jobs?${params}`);
  };
  // Row click → open job detail in new tab
  const handleRowClick = (row) => {
    window.open(`/dashboard/jobs/${row.id}`, "_blank");
  };

  // ── Column definitions ──
  const columns = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="capitalize w-[60px]">
            {JOB_TYPE.find((t) => t.value === row.job_type)?.label ?? "-"}
          </Badge>
          <span className="line-clamp-1 font-medium">{row.title}</span>
        </div>
      ),
    },
    {
      key: "job_contract",
      label: "Contract",
      sortable: true,
      render: (row) => (
        <span className="capitalize">
          {JOB_CONTRACT.find((c) => c.value === row.job_contract)?.label ?? "-"}
        </span>
      ),
    },
    {
      key: "company",
      label: "Company",
      sortable: true,
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="line-clamp-1">{row.location}</span>
        </div>
      ),
    },
    {
      key: "salary",
      label: "Salary",
      sortable: true,
      render: (row) =>
        row.salary ? (
          <Badge variant="default">{row.salary}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "source",
      label: "Source",
      sortable: true,
      render: (row) =>
        JOB_PORTALS.find((c) => c.value === row.source)?.label ?? "-",
    },
    {
      key: "date_posted",
      label: "Posted",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm">{fDate(row.date_posted) || "-"}</span>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Searched At",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm" title={fDateTime(row.created_at)}>
            {fDate(row.created_at) || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-[80px]",
      render: (row) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(row.job_url, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Refetch when page, pageSize, or filters change
  useEffect(() => {
    fetchJobs();
  }, [page, pageSize, filters]);

  // Clear selection when jobs change
  useEffect(() => {
    handleClearSelection();
  }, [jobs?.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Manage your scraped LinkedIn jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export ({selectedRows.size})
            </Button>
          )}
          <Button onClick={searchModal.onTrue}>
            <Search className="mr-2 h-4 w-4" />
            Search Jobs
          </Button>
        </div>
      </div>

      {/* Jobs Table Card */}
      <div className="flex justify-end">
        <JobsFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      <SimpleTable
        columns={columns}
        data={jobs?.data || []}
        isLoading={loading}
        onClick={handleRowClick}
        selectable
        selectedIds={selectedRows}
        onSelectPage={handleSelectPage}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onSelectOne={handleSelectOne}
        sortConfig={sortConfig}
        onSort={handleSort}
        paginationProps={paginationProps}
      />

      <SearchJobsDialog
        open={searchModal.value}
        setOpen={searchModal.setValue}
        refetch={fetchJobs}
      />
    </div>
  );
}
