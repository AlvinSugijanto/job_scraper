"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { fDate, fDateTime } from "@/utils/format-time";

const SORTABLE_COLUMNS = [
  { key: "title", label: "Title" },
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
  { key: "date_posted", label: "Posted" },
  { key: "created_at", label: "Created" },
];

export default function JobsTable({
  jobs,
  total,
  selectedIds,
  sortConfig,
  onSort,
  onSelectPage,
  onSelectAll,
  onClearSelection,
  onSelectOne,
}) {
  const router = useRouter();

  const isAllSelected =
    jobs.length > 0 &&
    (selectedIds.size === jobs.length || selectedIds.size === total);

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

  const handleRowClick = (jobId) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-muted/50 rounded-sm">
                    <Checkbox
                      checked={isAllSelected}
                      className="pointer-events-none"
                      aria-hidden
                    />
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={onSelectPage}>
                    Select This Page ({jobs.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSelectAll}>
                    Select All Rows ({total})
                  </DropdownMenuItem>
                  {selectedIds.size > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onClearSelection}>
                        Clear Selection
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableHead>
            {SORTABLE_COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => onSort(col.key)}
              >
                <div className="flex items-center">
                  {col.label}
                  {getSortIcon(col.key)}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.id}
              className="cursor-pointer hover:bg-muted/50"
              data-selected={selectedIds.has(job.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(job.id)}
                  onCheckedChange={(checked) => onSelectOne(job.id, checked)}
                  aria-label={`Select ${job.title}`}
                  className="ml-3"
                />
              </TableCell>
              <TableCell
                className="font-medium"
                onClick={() => handleRowClick(job.id)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="capitalize w-[60px]">
                    {job.job_type}
                  </Badge>
                  <span className="line-clamp-1">{job.title}</span>
                </div>
              </TableCell>
              <TableCell onClick={() => handleRowClick(job.id)}>
                <div className="flex items-center gap-2">
                  <span className="line-clamp-1">{job.company}</span>
                </div>
              </TableCell>
              <TableCell onClick={() => handleRowClick(job.id)}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="line-clamp-1">{job.location}</span>
                </div>
              </TableCell>
              <TableCell onClick={() => handleRowClick(job.id)}>
                {job.salary ? (
                  <Badge variant="secondary">{job.salary}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell onClick={() => handleRowClick(job.id)}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {fDate(job.date_posted) || "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell onClick={() => handleRowClick(job.id)}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" title={fDateTime(job.created_at)}>
                    {fDate(job.created_at) || "-"}
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
