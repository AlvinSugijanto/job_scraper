"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useApi } from "@/hooks/use-api";
import { JobDescription } from "@/components/jobs/job-description";
import { fDate, fDateTime } from "@/utils/format-time";

export default function JobDetailView({ id }) {
  const router = useRouter();
  const { data, call, loading } = useApi();

  useEffect(() => {
    call(`/api/v1/jobs/${id}`)
  }, []);

  const job = useMemo(()=>{
    return data?.job || null
  },[data]) 

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          {/* <Link href="/dashboard/jobs"> */}
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
          {/* </Link> */}
        </Button>
      </div>

      {/* Job Detail Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {job.company_url ? (
                  <a
                    href={job.company_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {job.company}
                  </a>
                ) : (
                  job.company
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a href={job.job_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in LinkedIn
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            {job.date_posted && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{fDate(job.date_posted)}</span>
              </div>
            )}
            {job.job_type && (
              <Badge variant="default" className="capitalize">
                {job.job_type}
              </Badge>
            )}
            {job.salary && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{job.salary}</Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          {job.description ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Job Description
              </h3>
              <JobDescription description={job.description} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">
                Unfortunately, we cannot get the description for this job.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
