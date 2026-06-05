const API_URL = process.env.API_URL || "http://localhost:8000";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const response = await fetch(`${API_URL}/banned-keywords/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("DELETE banned-keyword error:", error);
    return Response.json(
      { error: "Failed to delete banned keyword" },
      { status: 500 },
    );
  }
}
