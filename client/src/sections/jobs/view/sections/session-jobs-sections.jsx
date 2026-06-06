import { useBoolean } from "@/hooks/use-boolean";
import { useApi } from "@/hooks/use-api";
import { useFilters } from "@/hooks/use-filters";
import { SimpleTable, usePagination } from "@/components/table/simple-table";
import { useTableSelection } from "@/hooks/use-table-selection";
import React, { useEffect, useState } from "react";
import { Calendar, Download, ExternalLink, MapPin, Search } from "lucide-react";
import { JobsFilters } from "../components/jobs-filters";
import { SearchJobsDialog } from "@/components/jobs/search-jobs-dialog";
import { JOB_CONTRACT, JOB_PORTALS, JOB_TYPE } from "@/data/enums";
import { Button } from "@/components/ui/button";
import { fDate, fDateTime } from "@/utils/format-time";
import { Badge } from "@/components/ui/badge";
import SearchInput from "@/components/search-input";
import SessionDetailView from "../session-detail-view";
import AllJobsSections from "./all-jobs-sections";

const PAGE_SIZE = 10;

const SessionJobsSections = () => {
  const searchModal = useBoolean(false);
  const { data: jobs, call, loading } = useApi();
  const [session, setSession] = useState(null);

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: jobs?.total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilter, handleSort, getQueryParams } = useFilters({
    initialFilters: {
      q: "",
      sortBy: "created_at",
      sortOrder: "desc",
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
    currentPageData: jobs?.data || [],
    apiUrl: "/api/v1/jobs",
    filters,
    itemLabel: "list-session-jobs",
    getQueryParams,
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchJobs = async () => {
    const params = getQueryParams({ page, perPage: pageSize });
    call(`/api/v1/sessions?${params}`);
  };
  // Row click → open job detail in new tab
  const handleRowClick = (row) => {
    setSession(row);
  };

  // ── Column definitions ──
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <Badge variant={"default"}>{row.status}</Badge>,
    },
    {
      key: "total_jobs",
      label: "Total Jobs",
      sortable: true,
    },
    {
      key: "start_run_time",
      label: "Started At",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm" title={fDateTime(row.start_run_time)}>
            {fDate(row.start_run_time) || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "end_run_time",
      label: "Ended At",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm" title={fDateTime(row.end_run_time)}>
            {fDate(row.end_run_time) || "-"}
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

  if (session) {
    return <AllJobsSections session={session} setSession={setSession} />;
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <h3 className="font-semibold  self-end ml-1">Session Jobs</h3>

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
        </div>
      </div>
      {/* <div className="my-4"></div> */}
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
};

export default SessionJobsSections;
