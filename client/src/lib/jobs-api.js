const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function searchJobs(params) {
  const response = await fetch(`${API_URL}/jobs/search`, {
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
  sortBy,
  sortOrder,
  skip = 0,
  limit = 25,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (sortBy) params.append("sort_by", sortBy);
  if (sortOrder) params.append("sort_order", sortOrder);
  params.append("skip", skip.toString());
  params.append("limit", limit.toString());

  const response = await fetch(`${API_URL}/jobs/stored?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch stored jobs");
  }

  return response.json();
}

export async function getJob(id) {
  const response = await fetch(`${API_URL}/jobs/stored/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch job");
  }

  return response.json();
}

export async function deleteJob(id) {
  const response = await fetch(`${API_URL}/jobs/stored/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete job");
  }

  return response.json();
}

export async function deleteAllJobs() {
  const response = await fetch(`${API_URL}/jobs/stored`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete all jobs");
  }

  return response.json();
}
