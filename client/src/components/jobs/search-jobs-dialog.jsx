"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { SelectItem } from "@/components/ui/select";
import CustomModal from "@/components/custom-modal";
import FormProvider, { RHFInput, RHFSelect } from "@/components/hook-form";
import { useScrapingProgress, ScrapingProgress } from "./scraping-progress";
import {
  JOB_CONTRACT,
  JOB_TYPE,
  POSTED_WITHIN_TYPES,
  JOB_PORTALS,
} from "@/data/enums";

const formSchema = z.object({
  keywords: z.string().min(1, "Keywords is required"),
  location: z.string().optional(),
  job_contract: z.string().optional(),
  job_type: z.string().optional(),
  easy_apply: z.boolean().optional(),
  results_wanted: z.coerce.number().min(1).max(100).default(25),
  hours_old: z.string().optional(),
  job_portals: z.array(z.string()),
});

export function SearchJobsDialog({ open, setOpen, refetch }) {
  const scraping = useScrapingProgress();

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keywords: "",
      location: "",
      job_contract: "",
      job_type: "",
      easy_apply: false,
      results_wanted: 25,
      hours_old: "",
      job_portals: JOB_PORTALS.map((p) => p.value),
    },
  });

  const { handleSubmit, setValue, reset } = methods;

  // Reset form and scraping state when dialog closes
  useEffect(() => {
    if (!open) {
      if (scraping.status === "completed") {
        refetch?.();
      }
      scraping.reset();
      reset();
    }
  }, [open]);

  // Auto-close dialog after scraping is completed
  useEffect(() => {
    if (scraping.status === "completed") {
      const timer = setTimeout(() => setOpen(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [scraping.status]);

  const onSubmit = (data) => {
    try {
      const params = {
        keywords: data.keywords,
        location: data.location || undefined,
        job_contract: data.job_contract || undefined,
        job_type: data.job_type || undefined,
        easy_apply: data.easy_apply,
        results_wanted: parseInt(data.results_wanted) || 25,
        hours_old: data.hours_old ? parseInt(data.hours_old) : undefined,
        job_portals: data.job_portals,
      };
      scraping.startScraping(params);
    } catch (error) {
      console.error("Error searching jobs:", error);
      toast.error("Failed to search jobs");
    }
  };

  const handleClose = (isOpen) => {
    if (scraping.isActive) {
      // Don't close if scraping is active
      return;
    }
    setOpen(isOpen);
  };

  const handleCancel = () => {
    scraping.cancel();
    toast.info("Search cancelled");
  };

  return (
    <CustomModal
      open={open}
      setOpen={handleClose}
      title="Search LinkedIn Jobs"
      className="max-w-5xl"
    >
      <FormProvider
        methods={methods}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col flex-1 overflow-hidden"
      >
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-sm text-muted-foreground mb-2">
            Search for new jobs from LinkedIn. Results will be saved to
            database.
          </p>

          <RHFInput
            name="keywords"
            label="Keywords *"
            placeholder="e.g. Python Developer"
            disabled={scraping.isActive}
          />

          <RHFInput
            name="location"
            label="Location"
            placeholder="e.g. Jakarta, Indonesia"
            disabled={scraping.isActive}
          />

          <div className="space-y-2">
            <Label>Job Portals</Label>
            <MultiSelect
              options={JOB_PORTALS}
              defaultValue={JOB_PORTALS.map((p) => p.value)}
              onValueChange={(values) => {
                if (values.length > 0) setValue("job_portals", values);
              }}
              placeholder="Select job portals..."
              disabled={scraping.isActive}
            />
          </div>

          <RHFSelect
            name="job_contract"
            label="Job Contract"
            placeholder="Select Job Contract"
            disabled={scraping.isActive}
            className="w-full"
          >
            {JOB_CONTRACT.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </RHFSelect>

          <RHFSelect
            name="job_type"
            label="Job Type"
            placeholder="Select Job Type"
            disabled={scraping.isActive}
            className="w-full"
          >
            {JOB_TYPE.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </RHFSelect>

          <div className="grid grid-cols-2 gap-4">
            <RHFInput
              name="results_wanted"
              label="Results Wanted"
              type="number"
              min="1"
              max="100"
              disabled={scraping.isActive}
            />

            <RHFSelect
              name="hours_old"
              label="Posted Within"
              placeholder="Select posted within"
              disabled={scraping.isActive}
              className="w-full"
            >
              {POSTED_WITHIN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </RHFSelect>
          </div>

          {/* Progress Display */}
          <ScrapingProgress
            status={scraping.status}
            message={scraping.message}
            progress={scraping.progress}
            activePortal={scraping.activePortal}
            portalProgress={scraping.portalProgress}
            countdown={scraping.countdown}
            result={scraping.result}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2 bg-muted/10">
          {scraping.isActive ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              size="sm"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                size="sm"
              >
                {scraping.status === "completed" ? "Close" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={scraping.status === "completed"}
                size="sm"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </>
          )}
        </div>
      </FormProvider>
    </CustomModal>
  );
}
