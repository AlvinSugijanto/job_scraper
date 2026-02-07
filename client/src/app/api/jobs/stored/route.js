const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const response = await fetch(
      `${API_URL}/jobs/stored?${searchParams.toString()}`,
    );

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch stored jobs" },
      { status: 500 },
    );
  }
}
