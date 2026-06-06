"use client";

import React, { Suspense } from "react";

import ConfigView from "@/sections/config/view/config-view";
import { Skeleton } from "@/components/ui/skeleton";

const ConfigViewPage = () => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ConfigView />
    </Suspense>
  );
};

export default ConfigViewPage;
