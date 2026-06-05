export async function getBannedKeywords({
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

  const response = await fetch(`/api/banned/keywords?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch banned keywords");
  }
  return response.json();
}

export async function addBannedKeyword(keyword) {
  const response = await fetch("/api/banned/keywords", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keyword }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail || "Failed to add banned keyword");
  }
  return response.json();
}

export async function deleteBannedKeyword(id) {
  const response = await fetch(`/api/banned/keywords/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete banned keyword");
  }
  return response.json();
}
