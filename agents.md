# Frontend Page Development Rules & Architectural Patterns

When creating or modifying frontend CRUD table views in this project, you MUST strictly follow this architecture, folder structure, and custom hook orchestrations.

---

## Folder & Component Structure

The client application separates page views, sections, and dialog components:
```
client/src/
├── hooks/              # Custom React Hooks
│   ├── use-api.js              # Server requests and HTTP state
│   ├── use-filters.js          # Sorting and filtering inputs
│   ├── use-boolean.js          # Easy state manipulation for booleans (open/close/loading)
│   └── use-table-selection.js  # Table row selection helper
├── components/         # Shared UI Components
│   ├── table/simple-table.jsx  # Reusable tabular component
│   └── delete-dialog.jsx       # Standardized warning delete dialog
└── sections/           # Feature-Specific View & Controller Components
    └── [feature-name]/
        ├── view/
        │   ├── components/     # Modals, dialogs, sub-components
        │   │   └── add-[name]-dialog.jsx
        │   ├── sections/       # Tab contents, inner list screens
        │   │   └── [name]-sections.jsx
        │   └── [name]-view.jsx # Main route/tab wrapper layout
```

---

## Core Hooks & Orchestration

To keep components clean and reusable, never duplicate filtering, sorting, pagination, selection, or modal-trigger logic. Use these hooks:

### 1. `useApi()`
Handles API requests.
- Returns `{ data, call, loading }` for read requests, or destructured custom names for writes (e.g. `{ call: callDelete, loading: loadingDelete }`).
- Methods default to `GET`. Pass uppercase `"POST"`, `"PUT"`, or `"DELETE"` as the second argument when writing data.

### 2. `useFilters()`
Manages search queries, sorting directions, and triggers resetting pages to 1 when search filters change. Also returns a parameterized serializing helper.
- Call signature: `useFilters({ initialFilters: { q: "", sortBy: "name", sortOrder: "asc" }, paramMapping: { q: "search" }, resetPage })`
- Returns `{ filters, setFilter, setFilters, handleSort, getQueryParams }` where `getQueryParams(additionalParams)` yields a `URLSearchParams` object with mapped keys.

### 3. `usePagination()`
Manages pagination states.
- Call signature: `usePagination({ totalItems, initialPageSize: 10 })`
- Returns `{ page, pageSize, setPage, paginationProps }`.

### 4. `useBoolean()`
Manages simple boolean toggles like dialog opens or local loading indicators.
- Returns `{ value, onTrue, onFalse, onToggle, setValue }`.

### 5. `useTableSelection()`
Handles multi-select table states, selecting items on the current page, fetching and selecting all matching filter data (e.g., up to 1000 items), and clearing selections.
- Call signature:
  ```javascript
  const {
    selectedRows,
    handleSelectOne,
    handleSelectPage,
    handleSelectAll,
    handleClearSelection,
    handleExport, // Export function, signature: handleExport({ filename: string })
  } = useTableSelection({
    currentPageData: data?.data || [],
    apiUrl: "/api/v1/endpoints",
    filters,
    apiCall: call,
    itemLabel: "items",
    getQueryParams, // optional custom parameter builder from useFilters hook
  });
  ```

---

## 3. Implementation Blueprint (Example Page)

Below is the exact pattern to follow for a standardized CRUD Table.

### A. The Section Component (Parent View)
**Example (`client/src/sections/config/view/sections/example-sections.jsx`):**
```javascript
"use client";

import React, { useState, useEffect } from "react";
import { Plus, Calendar, EllipsisVertical, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SimpleTable, usePagination } from "@/components/table/simple-table";
import { fDate } from "@/utils/format-time";
import { useApi } from "@/hooks/use-api";
import { useFilters } from "@/hooks/use-filters";
import { useBoolean } from "@/hooks/use-boolean";
import { useTableSelection } from "@/hooks/use-table-selection";
import SearchInput from "@/components/search-input";
import DeleteDialog from "@/components/delete-dialog";
import AddExampleModal from "../components/add-example-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 10;

export default function ExampleSection() {
  const createModal = useBoolean(false);
  const deleteModal = useBoolean(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: examples, call, loading } = useApi();
  const { call: callDelete, loading: loadingDelete } = useApi();

  const { page, pageSize, setPage, paginationProps } = usePagination({
    totalItems: examples?.total,
    initialPageSize: PAGE_SIZE,
  });

  const { filters, setFilter, handleSort, getQueryParams } = useFilters({
    initialFilters: { q: "", sortBy: "name", sortOrder: "asc" },
    paramMapping: { q: "search", sortBy: "sort_by", sortOrder: "sort_order" },
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
    currentPageData: examples?.data || [],
    apiUrl: "/api/v1/examples",
    filters,
    apiCall: call,
    itemLabel: "examples",
    getQueryParams,
  });

  const sortConfig = { key: filters.sortBy, direction: filters.sortOrder };

  const fetchExamples = async () => {
    const params = getQueryParams({ page, perPage: pageSize });
    call(`/api/v1/examples?${params}`);
  };

  useEffect(() => {
    fetchExamples();
  }, [page, pageSize, filters]);

  const handleConfirmDelete = async () => {
    if (!selectedItem?.id) return;
    try {
      await callDelete(`/api/v1/examples/${selectedItem.id}`, "DELETE");
      toast.success(`"${selectedItem.name}" deleted successfully.`);
      deleteModal.onFalse();
      fetchExamples();
    } catch (error) {
      toast.error(error.message || "Failed to delete item");
    }
  };

  const columns = [
    { key: "name", label: "Name", className: "font-medium px-4", sortable: true },
    {
      key: "created_at",
      label: "Created at",
      className: "w-[180px]",
      sortable: true,
      render: (row) => fDate(row.created_at) || "N/A",
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
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(row);
                createModal.onTrue();
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(row);
                deleteModal.onTrue();
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
        <h3 className="text-lg font-semibold">Examples</h3>
        <div className="flex items-center gap-4">
          {selectedRows.size > 0 && (
            <Button
              variant="outline"
              onClick={() => handleExport({ filename: "examples" })}
            >
              <Download className="mr-2 h-4 w-4" />
              Export ({selectedRows.size})
            </Button>
          )}
          <SearchInput
            value={filters.q}
            onChange={(value) => setFilter("q", value)}
            placeholder="Search examples..."
          />
          <Button
            onClick={() => {
              setSelectedItem(null);
              createModal.onTrue();
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Example
          </Button>
        </div>
      </div>

      <SimpleTable
        columns={columns}
        data={examples?.data || []}
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

      {createModal.value && (
        <AddExampleModal
          open={createModal.value}
          setOpen={(value) => {
            createModal.setValue(value);
            if (!value) setSelectedItem(null);
          }}
          selectedItem={selectedItem}
          refetch={fetchExamples}
        />
      )}

      <DeleteDialog
        open={deleteModal.value}
        setOpen={deleteModal.setValue}
        title="Delete Item"
        description={`Are you sure you want to delete "${selectedItem?.name || ""}"?`}
        onConfirm={handleConfirmDelete}
        loading={loadingDelete}
      />
    </div>
  );
}
```

### B. The Add/Edit Dialog Component (Child View)
**Example (`client/src/sections/config/view/components/add-example-dialog.jsx`):**
* Avoid resetting or setting the parent's `selectedItem` state during component mount or unmount cleanup (`useEffect`'s return function), since this triggers state clearing under React's StrictMode cycle.
* Instead, let the parent's closing event handle resetting the item state, as shown in `{createModal.value && ...}` component rendering.

```javascript
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import CustomModal from "@/components/custom-modal";
import FormProvider, { RHFInput } from "@/components/hook-form";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export default function AddExampleModal({ open, setOpen, selectedItem, refetch }) {
  const { call } = useApi();

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const { handleSubmit, reset, formState: { isSubmitting } } = methods;

  useEffect(() => {
    if (selectedItem) {
      reset({ name: selectedItem.name });
    } else {
      reset({ name: "" });
    }
  }, [selectedItem, reset]);

  const onSubmit = async (values) => {
    try {
      const isEdit = !!selectedItem;
      const url = isEdit ? `/api/v1/examples/${selectedItem.id}` : `/api/v1/examples/`;
      const method = isEdit ? "PUT" : "POST";

      await call(url, method, values);
      toast.success(isEdit ? "Updated successfully!" : "Created successfully!");
      setOpen(false);
      reset();
      refetch();
    } catch (error) {
      toast.error(error.message || "An error occurred");
    }
  };

  return (
    <CustomModal
      title={selectedItem ? "Edit Item" : "Create Item"}
      open={open}
      setOpen={setOpen}
      className="max-w-3xl"
    >
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
        <div className="flex-1 px-6 space-y-6">
          <RHFInput name="name" placeholder="Enter Name" />
        </div>
        <div className="px-6 py-6 flex justify-end">
          <Button type="submit" loading={isSubmitting} size="sm">
            Submit
          </Button>
        </div>
      </FormProvider>
    </CustomModal>
  );
}
```
