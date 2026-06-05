const API_URL = process.env.API_URL || "http://localhost:8000";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const response = await fetch(`${API_URL}/banned-companies/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("DELETE banned-company error:", error);
    return Response.json(
      { error: "Failed to delete banned company" },
      { status: 500 },
    );
  }
}
