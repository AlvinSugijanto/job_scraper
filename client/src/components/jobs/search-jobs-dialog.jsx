"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScrapingProgress, ScrapingProgress } from "./scraping-progress";
import { JOB_CONTRACT, JOB_TYPE, POSTED_WITHIN_TYPES } from "@/data/enums";

export function SearchJobsDialog({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const scraping = useScrapingProgress();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      keywords: "",
      location: "",
      job_contract: "",
      job_type: "",
      easy_apply: false,
      results_wanted: 25,
      hours_old: "",
    },
  });

  // Reset form and scraping state when dialog closes
  useEffect(() => {
    if (!open) {
      if (scraping.status === "completed") {
        onSuccess?.();
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Search className="mr-2 h-4 w-4" />
          Search Jobs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Search LinkedIn Jobs</DialogTitle>
          <DialogDescription>
            Search for new jobs from LinkedIn. Results will be saved to
            database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords *</Label>
            <Input
              id="keywords"
              placeholder="e.g. Python Developer"
              disabled={scraping.isActive}
              {...register("keywords", { required: "Keywords is required" })}
            />
            {errors.keywords && (
              <p className="text-sm text-red-500">{errors.keywords.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Jakarta, Indonesia"
              disabled={scraping.isActive}
              {...register("location")}
            />
          </div>

          <div className="space-y-2 w-full">
            <Label>Job Contract</Label>
            <Select
              onValueChange={(value) => setValue("job_contract", value)}
              defaultValue=""
              disabled={scraping.isActive}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Job Contract" />
              </SelectTrigger>
              <SelectContent>
                {JOB_CONTRACT.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-full">
            <Label>Job Type</Label>
            <Select
              onValueChange={(value) => setValue("job_type", value)}
              defaultValue=""
              disabled={scraping.isActive}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Job Type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPE.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="results_wanted">Results Wanted</Label>
              <Input
                id="results_wanted"
                type="number"
                min="1"
                max="100"
                disabled={scraping.isActive}
                {...register("results_wanted")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_old">Posted Within</Label>
              <Select
                onValueChange={(value) => setValue("hours_old", value)}
                defaultValue=""
                disabled={scraping.isActive}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select posted within" />
                </SelectTrigger>
                <SelectContent>
                  {POSTED_WITHIN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* <div className="flex items-center space-x-2 mt-6">
            <Checkbox
              id="easy_apply"
              disabled={scraping.isActive}
              onCheckedChange={(checked) => setValue("easy_apply", checked)}
            />
            <Label htmlFor="easy_apply" className="cursor-pointer">
              Easy Apply
            </Label>
          </div> */}

          {/* Progress Display */}
          <ScrapingProgress
            status={scraping.status}
            message={scraping.message}
            progress={scraping.progress}
            countdown={scraping.countdown}
            result={scraping.result}
          />

          <div className="flex justify-end gap-2">
            {scraping.isActive ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
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
                >
                  {scraping.status === "completed" ? "Close" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={scraping.status === "completed"}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
