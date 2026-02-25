"use client";

import { useState, useEffect } from "react";
import { Briefcase, Download } from "lucide-react";
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
import JobsTable from "./jobs-table";
import { JobsFilters } from "./jobs-filters";
import { exportToCSV } from "@/utils/export-csv";
import { useFilters } from "@/hooks/use-filters";
import { usePagination } from "@/hooks/use-pagination";

const PAGE_SIZE = 10;

export default function JobsView() {
  const {
    page,
    total,
    setTotal,
    handlePageChange,
    resetPage,
    totalPages,
    startItem,
    endItem,
    hasPrevious,
    hasNext,
  } = usePagination({ pageSize: PAGE_SIZE });

  const { filters, setFilters, handleSort } = useFilters({
    initialFilters: {
      q: "",
      job_type: "all",
      job_contract: "all",
      location: "",
      sortBy: "created_at",
      sortOrder: "desc",
    },
    resetPage,
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchJobs = async (shouldResetPage = false) => {
    const currentPage = shouldResetPage ? 0 : page;
    if (shouldResetPage) resetPage();
    setLoading(true);
    try {
      const { jobs, total } = await getStoredJobs({
        search: filters.q || undefined,
        jobType: filters.job_type === "all" ? undefined : filters.job_type,
        jobContract:
          filters.job_contract === "all" ? undefined : filters.job_contract,
        location: filters.location || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        skip: currentPage * PAGE_SIZE,
        limit: PAGE_SIZE,
      });

      setJobs(jobs);
      setTotal(total);
    } catch (error) {
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  // Refetch when page or filters change
  useEffect(() => {
    fetchJobs();
  }, [page, filters]);

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
        limit: 10000,
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
          <SearchJobsDialog onSuccess={() => fetchJobs(true)} />
        </div>
      </div>

      {/* Jobs Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Saved Jobs</CardTitle>
              <CardDescription>
                Select jobs to export. Click headers to sort.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <JobsFilters filters={filters} onFiltersChange={setFilters} />
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
            <JobsTable
              jobs={jobs}
              total={total}
              selectedIds={selectedIds}
              sortConfig={sortConfig}
              onSort={handleSort}
              onSelectPage={handleSelectPage}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onSelectOne={handleSelectOne}
              page={page}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
