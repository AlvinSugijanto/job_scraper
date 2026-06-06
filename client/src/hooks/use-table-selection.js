import { useState, useCallback } from "react";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export-csv";
import { fDate } from "@/utils/format-time";
import { useApi } from "./use-api";

export function useTableSelection({
  currentPageData = [],
  apiUrl,
  filters = {},
  itemLabel = "items",
  getQueryParams,
}) {
  const { call } = useApi();
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [allSelectedItems, setAllSelectedItems] = useState([]);

  const handleSelectOne = useCallback((id, checked) => {
    setSelectedRows((prev) => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }, []);

  const handleSelectPage = useCallback(() => {
    setSelectedRows(new Set(currentPageData.map((item) => item.id)));
  }, [currentPageData]);

  const handleSelectAll = useCallback(async () => {
    const params = getQueryParams({ perPage: 10000 });

    try {
      const res = await call(`${apiUrl}?${params.toString()}`);
      console.log(res);
      const items = res?.data || [];
      setSelectedRows(new Set(items.map((item) => item.id)));
      setAllSelectedItems(items);
      toast.success(`Selected all ${items.length} ${itemLabel}`);
    } catch (error) {
      toast.error(`Failed to select all ${itemLabel}`);
    }
  }, [filters, call, apiUrl, itemLabel, getQueryParams]);

  const handleClearSelection = useCallback(() => {
    setSelectedRows(new Set());
    setAllSelectedItems([]);
  }, []);

  const handleExport = useCallback(
    ({ filename = itemLabel }) => {
      const sourceJobs =
        allSelectedItems.length > 0 ? allSelectedItems : currentPageData;
      const jobsToExport = sourceJobs.filter((job) => selectedRows.has(job.id));

      if (jobsToExport.length === 0) {
        toast.error(`Please select at least one item to export`);
        return;
      }

      const timestamp = fDate(new Date());
      exportToCSV(jobsToExport, `${filename}_${timestamp}.csv`);
      handleClearSelection();
      toast.success(`Exported ${jobsToExport.length} items to CSV`);
    },
    [
      allSelectedItems,
      currentPageData,
      selectedRows,
      handleClearSelection,
      itemLabel,
    ],
  );

  return {
    selectedRows,
    allSelectedItems,
    handleSelectOne,
    handleSelectPage,
    handleSelectAll,
    handleClearSelection,
    handleExport,
    setSelectedRows,
    setAllSelectedItems,
  };
}
