export async function get({
  search,
  sortBy,
  sortOrder,
  page = 1,
  perPage = 10,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (sortBy) params.append("sort_by", sortBy);
  if (sortOrder) params.append("sort_order", sortOrder);
  params.append("page", page.toString());
  params.append("perPage", perPage.toString());

  const response = await fetch(`/api/banned/companies?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch banned companies");
  }
  return response.json();
}

export async function addBannedCompany(name) {
  const response = await fetch("/api/banned/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail || "Failed to add banned company");
  }
  return response.json();
}

export async function deleteBannedCompany(id) {
  const response = await fetch(`/api/banned/companies/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete banned company");
  }
  return response.json();
}
