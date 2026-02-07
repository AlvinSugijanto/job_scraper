"use client";

import React, { Suspense } from "react";
import JobsView from "@/sections/jobs/view/jobs-view";
import { Skeleton } from "@/components/ui/skeleton";

const JobViewPage = () => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <JobsView />
    </Suspense>
  );
};

export default JobViewPage;
