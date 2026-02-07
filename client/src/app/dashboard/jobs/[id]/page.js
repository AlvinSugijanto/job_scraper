"use client";

import React, { use } from "react";
import JobDetailView from "@/sections/jobs/detail/jobs-detail-view";

const JobDetailViewPage = ({ params }) => {
  const { id } = use(params);

  return <JobDetailView id={id} />;
};

export default JobDetailViewPage;
