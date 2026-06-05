"use client";

import React, { useState, useEffect } from "react";
import { Search, Calendar, Trash2, Plus, EllipsisVertical } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleTable, usePagination } from "@/components/table/simple-table";
import { fDate } from "@/utils/format-time";
import { getBannedKeywords, deleteBannedKeyword } from "@/lib/banned-api";
import AddKeywordModal from "../components/add-keyword-dialog";
import { useFilters } from "@/hooks/use-filters";
import DeleteDialog from "@/components/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 10;

export default function BannedKeywordsSection() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilter, handleSort } = useFilters({
    initialFilters: {
      q: "",
      sortBy: "keyword",
      sortOrder: "asc",
    },
    resetPage: () => setPage(1),
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const data = await getBannedKeywords({
        search: filters.q || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
        perPage: pageSize,
      });
      setKeywords(data.keywords || []);
      setTotal(data.total ?? 0);
    } catch (error) {
      toast.error(error.message || "Failed to load banned keywords");
    } finally {
      setLoading(false);
    }
  };

  // Refetch when page, pageSize, or filters change
  useEffect(() => {
    fetchKeywords();
  }, [page, pageSize, filters]);

  const handleConfirmDelete = async () => {
    if (!selectedItem?.id) return;
    setDeleteLoading(true);
    try {
      await deleteBannedKeyword(selectedItem.id);
      toast.success(`"${selectedItem.keyword}" deleted successfully.`);
      setOpenDelete(false);
      fetchKeywords();
    } catch (error) {
      toast.error(error.message || "Failed to delete keyword");
    } finally {
      setDeleteLoading(false);
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
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(row);
                setOpenDelete(true);
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
          Banned Keywords
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter keywords..."
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Keyword
          </Button>
        </div>
      </div>

      <SimpleTable
        columns={columns}
        data={keywords}
        isLoading={loading}
        sortConfig={sortConfig}
        onSort={handleSort}
        paginationProps={paginationProps}
      />

      <AddKeywordModal
        open={isAddOpen}
        setOpen={setIsAddOpen}
        refetch={fetchKeywords}
      />

      <DeleteDialog
        open={openDelete}
        setOpen={setOpenDelete}
        title="Delete Banned Keyword"
        description={`Are you sure you want to delete "${selectedItem?.keyword || ""}" from the banned list?`}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
