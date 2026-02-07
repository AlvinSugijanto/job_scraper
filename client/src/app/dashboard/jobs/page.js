"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Trash2,
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchJobsDialog } from "@/components/jobs/search-jobs-dialog";
import { getStoredJobs, deleteJob } from "@/lib/jobs-api";

const SORTABLE_COLUMNS = [
  { key: "title", label: "Title" },
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
  { key: "date_posted", label: "Posted" },
];

const PAGE_SIZE = 25;

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchJobs = async (resetPage = false) => {
    if (resetPage) setPage(0);
    setLoading(true);
    try {
      const currentPage = resetPage ? 0 : page;
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

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setPage(0); // Reset to first page when sorting
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(true);
  };

  const handleDelete = async (e, jobId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this job?")) return;

    setDeleting(jobId);
    try {
      await deleteJob(jobId);
      toast.success("Job deleted");
      fetchJobs();
    } catch (error) {
      toast.error("Failed to delete job");
    } finally {
      setDeleting(null);
    }
  };

  const handleRowClick = (jobId) => {
    router.push(`/dashboard/jobs/${jobId}`);
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
        <SearchJobsDialog onSuccess={() => fetchJobs(true)} />
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Saved Jobs</CardTitle>
              <CardDescription>
                Click on a job to view details. Click headers to sort.
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {SORTABLE_COLUMNS.map((col) => (
                        <TableHead
                          key={col.key}
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort(col.key)}
                        >
                          <div className="flex items-center">
                            {col.label}
                            {getSortIcon(col.key)}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(job.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="line-clamp-1">{job.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="line-clamp-1">{job.company}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="line-clamp-1">{job.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.salary ? (
                            <Badge variant="secondary">{job.salary}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {job.date_posted || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(job.job_url, "_blank");
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => handleDelete(e, job.id)}
                              disabled={deleting === job.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-2 py-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startItem}-{endItem} of {total} jobs
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                    onClick={() => setPage((p) => p + 1)}
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
