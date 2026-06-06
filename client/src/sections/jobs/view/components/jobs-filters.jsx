"use client";

import React, { useState, useEffect } from "react";
import { Filter, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { JOB_CONTRACT, JOB_PORTALS, JOB_TYPE } from "@/data/enums";

export function JobsFilters({ filters, onFiltersChange }) {
  // Local state for filters within the popover
  const [localSearch, setLocalSearch] = useState(filters.q);
  const [localLocation, setLocalLocation] = useState(filters.location);
  const [localJobType, setLocalJobType] = useState(filters.job_type);
  const [localJobContract, setLocalJobContract] = useState(
    filters.job_contract,
  );
  const [localJobPortal, setLocalJobPortal] = useState(filters.job_portal);
  const [open, setOpen] = useState(false);

  // Sync local state when external props change (e.g., from URL or reset)
  useEffect(() => {
    setLocalSearch(filters.q);
    setLocalLocation(filters.location);
    setLocalJobType(filters.job_type);
    setLocalJobContract(filters.job_contract);
    setLocalJobPortal(filters.job_portal);
  }, [filters, open]);

  const activeFiltersCount = [
    localSearch !== "",
    localJobType !== "all" && localJobType !== "",
    localJobContract !== "all" && localJobContract !== "",
    localLocation !== "",
    localJobPortal !== "all" && localJobPortal !== "",
  ].filter(Boolean).length;

  const handleApply = () => {
    onFiltersChange({
      q: localSearch,
      location: localLocation,
      job_type: localJobType,
      job_contract: localJobContract,
      job_portal: localJobPortal,
    });
    setOpen(false);
  };

  const handleReset = () => {
    setLocalSearch("");
    setLocalLocation("");
    setLocalJobType("all");
    setLocalJobContract("all");
    setLocalJobPortal("all");
    onFiltersChange({
      q: "",
      location: "",
      job_type: "all",
      job_contract: "all",
      job_portal: "all",
    });
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium leading-none">Job Filters</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 px-2 text-muted-foreground"
              >
                Reset
              </Button>
            </div>

            <Separator />

            <div className="grid gap-4 w-full">
              <div className="space-y-2">
                <Label htmlFor="search-filter">Keywords</Label>
                <Input
                  id="search-filter"
                  placeholder="e.g. Developer, Google"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-filter">Location</Label>
                <Input
                  id="location-filter"
                  placeholder="e.g. Jakarta, Indonesia"
                  value={localLocation}
                  onChange={(e) => setLocalLocation(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-portal-filter">Job Portal</Label>
                <Select
                  value={localJobPortal}
                  onValueChange={setLocalJobPortal}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select Job Portal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {JOB_PORTALS.map((portal) => (
                      <SelectItem key={portal.value} value={portal.value}>
                        {portal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full">
                <Label>Job Type</Label>
                <Select value={localJobType} onValueChange={setLocalJobType}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {JOB_TYPE.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full">
                <Label>Contract Type</Label>
                <Select
                  value={localJobContract}
                  onValueChange={setLocalJobContract}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select Contract Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contracts</SelectItem>
                    {JOB_CONTRACT.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-8" onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
