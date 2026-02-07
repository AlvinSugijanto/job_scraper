const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const response = await fetch(`${API_URL}/jobs/stored/${id}`);

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
