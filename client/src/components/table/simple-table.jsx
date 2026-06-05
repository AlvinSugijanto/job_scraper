import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// ─── Hook ─────────────────────────────────────────────────
/**
 * usePagination
 *
 * @param {Object}   options
 * @param {number}   options.totalItems      - total jumlah data
 * @param {number}  [options.initialPage=1]  - halaman awal
 * @param {number}  [options.initialPageSize=10] - jumlah baris per halaman awal
 * @param {number[]} [options.pageSizeOptions] - pilihan page size
 *
 * @returns {{ page, pageSize, totalPages, setPage, setPageSize, paginationProps }}
 */
export function usePagination({
  totalItems,
  initialPage = 1,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
}) {
  const [page, setPageRaw] = useState(initialPage);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  // console.log(totalItems)
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const setPage = (p) => setPageRaw(Math.min(Math.max(1, p), totalPages));

  const setPageSize = (size) => {
    setPageSizeRaw(size);
    setPageRaw(1); // reset ke halaman pertama saat ganti ukuran
  };

  return {
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    /** Langsung bisa di-spread ke <Pagination /> */
    paginationProps: {
      page,
      pageSize,
      totalPages,
      totalItems,
      pageSizeOptions,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
    },
  };
}

// ─── Pagination Component ─────────────────────────────────
/**
 * Pagination
 *
 * Props (semua tersedia dari `paginationProps` di usePagination):
 * @param {number}   page
 * @param {number}   pageSize
 * @param {number}   totalPages
 * @param {number}   totalItems
 * @param {number[]} pageSizeOptions
 * @param {Function} onPageChange
 * @param {Function} onPageSizeChange
 */
export function Pagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  pageSizeOptions = [5, 10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 py-2">
      {/* Info + page size */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {from}–{to} of {totalItems}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">Rows:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigasi halaman */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant={"default"}
          size="icon"
          className="h-7 w-7 text-xs"
          aria-label={`Page ${page}`}
          aria-current={"page"}
        >
          {page}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── SimpleTable ──────────────────────────────────────────
/**
 * SimpleTable
 *
 * Mode 1 — Pagination dikelola dari LUAR (server-side / controlled):
 *   Kirim `paginationProps` dari usePagination() dan potong data sendiri.
 *
 * Mode 2 — Pagination otomatis di DALAM (client-side):
 *   Kirim `data` lengkap dan `defaultPageSize`. Komponen akan paginate sendiri.
 *
 * Sorting (controlled dari luar):
 *   Kirim `sortConfig` ({ key, direction }) dan `onSort` (key => void).
 *   Tandai kolom yang bisa di-sort dengan `sortable: true` di column definition.
 *
 * @param {Object}   props
 * @param {Array}    props.columns
 * @param {Array}    props.data
 * @param {Function} [props.onClick]
 * @param {boolean}  [props.isLoading]
 * @param {Object}   [props.paginationProps]  - dari usePagination (controlled)
 * @param {number}   [props.defaultPageSize]  - aktifkan client-side pagination
 * @param {number[]} [props.pageSizeOptions]
 * @param {boolean}  [props.selectable]        - tampilkan kolom checkbox
 * @param {Array}    [props.selectedRows]      - array of selected row objects (controlled)
 * @param {Function} [props.onSelectionChange] - callback (newSelectedRows) => void
 * @param {string}   [props.rowKey]            - key unik tiap row, default "id"
 * @param {Object}   [props.sortConfig]        - { key: string, direction: 'asc'|'desc' }
 * @param {Function} [props.onSort]            - callback (columnKey) => void
 */
export function SimpleTable({
  columns,
  data,
  onClick = () => {},
  isLoading,
  paginationProps, // controlled (server-side)
  defaultPageSize, // aktifkan client-side pagination
  pageSizeOptions = [5, 10, 25, 50, 100],
  columnProps = {}, // extra props diteruskan ke render function sebagai arg ke-3
  selectable = false,
  selectedRows = [],
  onSelectionChange = () => {},
  rowKey = "id",
  sortConfig = null, // { key: "column_key", direction: "asc" | "desc" }
  onSort = null, // (columnKey) => void
  selectedIds = null,
  onSelectPage = null,
  onSelectAll = null,
  onClearSelection = null,
  onSelectOne = null,
}) {
  // ── Client-side pagination (opsional) ──
  const isClientPaginated = defaultPageSize != null && paginationProps == null;

  const clientPagination = usePagination({
    totalItems: isClientPaginated ? data.length : 0,
    initialPageSize: defaultPageSize ?? 10,
    pageSizeOptions,
  });

  const activePaginationProps =
    paginationProps ??
    (isClientPaginated ? clientPagination.paginationProps : null);

  const visibleData = useMemo(() => {
    if (!isClientPaginated) return data;
    const { page, pageSize } = clientPagination;
    return data.slice((page - 1) * pageSize, page * pageSize);
  }, [
    isClientPaginated,
    data,
    clientPagination.page,
    clientPagination.pageSize,
  ]);

  const rows = isClientPaginated ? visibleData : data;

  // ── Checkbox helpers ──
  const selectedKeys = useMemo(
    () => new Set(selectedRows.map((r) => r[rowKey])),
    [selectedRows, rowKey],
  );

  const isRowSelected = (row) => {
    if (selectedIds) {
      return selectedIds.has(row[rowKey]);
    }
    return selectedKeys.has(row[rowKey]);
  };

  const toggleRow = (e, row) => {
    e.stopPropagation();
    const key = row[rowKey];
    const next = isRowSelected(row)
      ? selectedRows.filter((r) => r[rowKey] !== key)
      : [...selectedRows, row];
    onSelectionChange(next);
  };

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => isRowSelected(r));
  const someVisibleSelected =
    rows.some((r) => isRowSelected(r)) && !allVisibleSelected;

  const toggleAll = () => {
    if (allVisibleSelected) {
      // deselect semua visible rows
      const visibleKeys = new Set(rows.map((r) => r[rowKey]));
      onSelectionChange(
        selectedRows.filter((r) => !visibleKeys.has(r[rowKey])),
      );
    } else {
      // tambahkan semua visible rows yang belum dipilih
      const newRows = rows.filter((r) => !isRowSelected(r));
      onSelectionChange([...selectedRows, ...newRows]);
    }
  };

  const totalItems = activePaginationProps?.totalItems ?? rows.length;
  const isAllSelected =
    rows.length > 0 &&
    selectedIds &&
    (selectedIds.size === rows.length || selectedIds.size === totalItems);

  return (
    <div className="flex flex-col gap-0 rounded-md border overflow-hidden">
      <Table>
        <TableHeader className={"bg-background"}>
          <TableRow className="border-border">
            {selectable &&
              (selectedIds ? (
                <TableHead className="w-[70px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-muted/50 rounded-sm">
                        <Checkbox
                          checked={isAllSelected}
                          className="pointer-events-none"
                          aria-hidden
                        />
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={onSelectPage}>
                        Select This Page ({rows.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onSelectAll}>
                        Select All Rows ({totalItems})
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
              ) : (
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={
                      allVisibleSelected ||
                      (someVisibleSelected ? "indeterminate" : false)
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
              ))}
            {columns.map((col) => {
              const isSortable = col.sortable && onSort;
              const isActiveSort = sortConfig && sortConfig.key === col.key;

              const sortIcon = !isSortable ? null : !isActiveSort ? (
                <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
              ) : sortConfig.direction === "asc" ? (
                <ArrowUp className="ml-1 h-3 w-3" />
              ) : (
                <ArrowDown className="ml-1 h-3 w-3" />
              );

              return (
                <TableHead
                  key={String(col.key)}
                  className={`text-muted-foreground ${
                    isSortable
                      ? "cursor-pointer select-none hover:bg-muted/50"
                      : ""
                  } ${col.className ?? ""}`}
                  onClick={isSortable ? () => onSort(col.key) : undefined}
                >
                  <div className="flex items-center">
                    {col.label}
                    {sortIcon}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: activePaginationProps?.pageSize ?? 5 }).map(
              (_, i) => (
                <TableRow key={i} className="border-border">
                  {selectable && (
                    <TableCell>
                      <div className="h-4 w-4 bg-muted animate-pulse rounded mx-auto" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={String(col.key)}>
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ),
            )
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-muted-foreground py-12"
              >
                No data available
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className="border-border hover:cursor-pointer"
                data-state={
                  selectable && isRowSelected(row) ? "selected" : undefined
                }
                onClick={() => onClick(row)}
              >
                {selectable &&
                  (selectedIds ? (
                    <TableCell
                      className="w-[70px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(row[rowKey])}
                        onCheckedChange={(checked) =>
                          onSelectOne(row[rowKey], checked)
                        }
                        aria-label={`Select row ${rowIndex + 1}`}
                        className="ml-3"
                      />
                    </TableCell>
                  ) : (
                    <TableCell
                      className="w-10 text-center"
                      onClick={(e) => toggleRow(e, row)}
                    >
                      <Checkbox
                        checked={isRowSelected(row)}
                        onCheckedChange={(checked) => {
                          const e = { stopPropagation: () => {} };
                          toggleRow(e, row);
                        }}
                        aria-label={`Select row ${rowIndex + 1}`}
                      />
                    </TableCell>
                  ))}
                {columns.map((col) => (
                  <TableCell
                    key={String(col.key)}
                    className={col.className ?? ""}
                  >
                    {col.render ? col.render(row, rowIndex) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination bar */}
      {activePaginationProps && (
        <div className="border-t border-border px-3">
          <Pagination {...activePaginationProps} />
        </div>
      )}
    </div>
  );
}
