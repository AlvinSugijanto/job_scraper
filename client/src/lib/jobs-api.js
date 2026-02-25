export async function searchJobs(params) {
  const response = await fetch("/api/jobs/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Failed to search jobs");
  }

  return response.json();
}

export async function getStoredJobs({
  search,
  jobType,
  jobContract,
  location,
  sortBy,
  sortOrder,
  skip = 0,
  limit = 25,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (jobType) params.append("job_type", jobType);
  if (jobContract) params.append("job_contract", jobContract);
  if (location) params.append("location", location);
  if (sortBy) params.append("sort_by", sortBy);
  if (sortOrder) params.append("sort_order", sortOrder);
  params.append("skip", skip.toString());
  params.append("limit", limit.toString());

  const response = await fetch(`/api/jobs/stored?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch stored jobs");
  }

  return response.json();
}

export async function getJob(id) {
  const response = await fetch(`/api/jobs/stored/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch job");
  }

  return response.json();
}
