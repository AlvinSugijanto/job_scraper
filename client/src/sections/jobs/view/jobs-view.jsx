"use client";

import { useState, useEffect } from "react";
import {
  Briefcase,
  Download,
  MapPin,
  Calendar,
  ExternalLink,
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
import { getStoredJobs } from "@/lib/jobs-api";
import { SimpleTable, usePagination } from "@/components/table/simple-table";
import { JobsFilters } from "./jobs-filters";
import { exportToCSV } from "@/utils/export-csv";
import { useFilters } from "@/hooks/use-filters";
import { Badge } from "@/components/ui/badge";
import { fDate, fDateTime } from "@/utils/format-time";
import { JOB_CONTRACT, JOB_PORTALS, JOB_TYPE } from "@/data/enums";

const PAGE_SIZE = 10;

export default function JobsView() {
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [total, setTotal] = useState(0);

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilters, handleSort } = useFilters({
    initialFilters: {
      q: "",
      job_type: "all",
      job_contract: "all",
      location: "",
      job_portal: "all",
      sortBy: "created_at",
      sortOrder: "desc",
    },
    resetPage: () => setPage(1),
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { jobs, total } = await getStoredJobs({
        search: filters.q || undefined,
        jobType: filters.job_type === "all" ? undefined : filters.job_type,
        jobContract:
          filters.job_contract === "all" ? undefined : filters.job_contract,
        jobPortal:
          filters.job_portal === "all" ? undefined : filters.job_portal,
        location: filters.location || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
        perPage: pageSize,
      });

      setJobs(jobs);
      setTotal(total);
    } catch (error) {
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  // Refetch when page, pageSize, or filters change
  useEffect(() => {
    fetchJobs();
  }, [page, pageSize, filters]);

  // Clear selection when jobs change
  useEffect(() => {
    setSelectedIds(new Set());
    setAllJobs([]);
  }, [jobs]);

  // Selection handlers
  const handleSelectPage = () => {
    setSelectedIds(new Set(jobs.map((job) => job.id)));
  };

  const handleSelectAll = async () => {
    try {
      const data = await getStoredJobs({
        search: filters.q || undefined,
        jobType: filters.job_type === "all" ? undefined : filters.job_type,
        jobContract:
          filters.job_contract === "all" ? undefined : filters.job_contract,
        jobPortal:
          filters.job_portal === "all" ? undefined : filters.job_portal,
        location: filters.location || undefined,
        perPage: 10000,
      });
      setSelectedIds(new Set(data.jobs.map((job) => job.id)));
      setAllJobs(data.jobs);
      toast.success(`Selected all ${data.jobs.length} jobs`);
    } catch (error) {
      toast.error("Failed to select all jobs");
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setAllJobs([]);
  };

  const handleSelectOne = (jobId, checked) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(jobId);
    } else {
      newSelected.delete(jobId);
    }
    setSelectedIds(newSelected);
  };

  // Export handler
  const handleExport = () => {
    const sourceJobs = allJobs.length > 0 ? allJobs : jobs;
    const jobsToExport = sourceJobs.filter((job) => selectedIds.has(job.id));

    if (jobsToExport.length === 0) {
      toast.error("Please select at least one job to export");
      return;
    }

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(jobsToExport, `jobs_export_${timestamp}.csv`);
    toast.success(`Exported ${jobsToExport.length} jobs to CSV`);
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
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export ({selectedIds.size})
            </Button>
          )}
          <SearchJobsDialog onSuccess={() => fetchJobs()} />
        </div>
      </div>

      {/* Jobs Table Card */}
      <div className="flex justify-end">
        <JobsFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      <SimpleTable
        columns={columns}
        data={jobs}
        isLoading={loading}
        onClick={handleRowClick}
        selectable
        selectedIds={selectedIds}
        onSelectPage={handleSelectPage}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onSelectOne={handleSelectOne}
        sortConfig={sortConfig}
        onSort={handleSort}
        paginationProps={paginationProps}
      />
      {/* <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Saved Jobs</CardTitle>
              <CardDescription>
                Select jobs to export. Click headers to sort.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No jobs found</h3>
              <p className="text-muted-foreground">
                {filters.q
                  ? "Try a different search term"
                  : 'Click "Search Jobs" to scrape new jobs from LinkedIn'}
              </p>
            </div>
          ) : (
           
          )}
        </CardContent>
      </Card> */}
    </div>
  );
}
