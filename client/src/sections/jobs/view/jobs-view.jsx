"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchJobsDialog } from "@/components/jobs/search-jobs-dialog";
import { getStoredJobs } from "@/lib/jobs-api";
import JobsTable from "./jobs-table";
import { exportToCSV } from "@/utils/export-csv";

const PAGE_SIZE = 10;
const STORAGE_KEY = "jobs_view_state";

// Get saved state from localStorage
const getSavedState = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Save state to localStorage
const saveState = (state) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

export default function JobsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedState = getSavedState();

  // Priority: URL params > localStorage > defaults
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(
    searchParams.get("q") || savedState?.search || "",
  );
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: searchParams.get("sortBy") || savedState?.sortBy || "created_at",
    direction: searchParams.get("sortOrder") || savedState?.sortOrder || "desc",
  });

  // Pagination
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || savedState?.page || "0", 10),
  );
  const [total, setTotal] = useState(0);

  // Update URL params and localStorage
  const updateSearchParams = useCallback(
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

      // Also save to localStorage
      const currentState = getSavedState() || {};
      saveState({
        ...currentState,
        sortBy: updates.sortBy ?? currentState.sortBy,
        sortOrder: updates.sortOrder ?? currentState.sortOrder,
        page: updates.page ?? currentState.page,
        search: updates.q !== undefined ? updates.q : currentState.search,
      });
    },
    [router, searchParams],
  );

  const fetchJobs = async (resetPage = false) => {
    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    setLoading(true);
    try {
      const data = await getStoredJobs({
        search: search || undefined,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        skip: currentPage * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (error) {
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  // Refetch when page or sort changes
  useEffect(() => {
    fetchJobs();
  }, [page, sortConfig]);

  // Clear selection when jobs change
  useEffect(() => {
    setSelectedIds(new Set());
    setAllJobs([]);
  }, [jobs]);

  const handleSort = (key) => {
    const newDirection =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction: newDirection });
    setPage(0);
    updateSearchParams({ sortBy: key, sortOrder: newDirection, page: 0 });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    updateSearchParams({ page: newPage });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateSearchParams({ q: search || null, page: 0 });
    fetchJobs(true);
  };

  // Selection handlers
  const handleSelectPage = () => {
    setSelectedIds(new Set(jobs.map((job) => job.id)));
  };

  const handleSelectAll = async () => {
    try {
      const data = await getStoredJobs({
        search: search || undefined,
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

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startItem = page * PAGE_SIZE + 1;
  const endItem = Math.min((page + 1) * PAGE_SIZE, total);

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
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <Input
                  placeholder="Search title, company, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72"
                />
                <Button type="submit" variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
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
                {search
                  ? "Try a different search term"
                  : 'Click "Search Jobs" to scrape new jobs from LinkedIn'}
              </p>
            </div>
          ) : (
            <>
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
              />

              {/* Pagination */}
              <div className="flex items-center justify-between px-2 py-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startItem}-{endItem} of {total} jobs
                  {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
