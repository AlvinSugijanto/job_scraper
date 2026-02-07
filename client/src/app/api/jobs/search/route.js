const API_URL = process.env.API_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/jobs/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: "Failed to search jobs" }, { status: 500 });
  }
}
