const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const response = await fetch(
      `${API_URL}/banned-companies?${searchParams.toString()}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("GET banned-companies error:", error);
    return Response.json(
      { error: "Failed to fetch banned companies" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_URL}/banned-companies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("POST banned-companies error:", error);
    return Response.json(
      { error: "Failed to create banned company" },
      { status: 500 },
    );
  }
}
