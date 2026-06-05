import Cookies from "js-cookie";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL;

async function handler(req, { params }) {
  const { path } = await params;
  const targetPath = path.join("/");
  const searchParams = req.nextUrl.search; // e.g. "?page=1&limit=10"
  const targetUrl = `${BACKEND_API}/${targetPath}${searchParams}`;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("T_SESSION")?.value;

    const isMultipart = req.headers
      .get("content-type")
      ?.includes("multipart/form-data");

    const headers = {
      // Don't set Content-Type for multipart — fetch will auto-set it with the correct boundary
      ...(!isMultipart && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Only include body for methods that support it
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      if (isMultipart) {
        // Parse incoming FormData and reconstruct for upstream fetch
        // (don't set Content-Type — fetch will auto-set with correct boundary)
        const incoming = await req.formData();
        const outgoing = new FormData();
        for (const [key, value] of incoming.entries()) {
          outgoing.append(key, value);
        }
        fetchOptions.body = outgoing;
      } else {
        const body = await req.text();
        if (body) fetchOptions.body = body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    const clientAccept = req.headers.get("accept") || "";

    // If it's a stream (either response is SSE or client requested SSE), return it directly
    if (
      contentType.includes("text/event-stream") ||
      clientAccept.includes("text/event-stream")
    ) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": contentType || "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no", // disable nginx buffering jika ada
        },
      });
    }

    let data;

    if (contentType.includes("application/json")) {
      data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      // For other types, getting text is safer for now if we want to modify/inspect
      // But if we want to support general streaming, we could just return response.body
      // sticking to original logic for non-stream for safety, but supporting stream explicitly
      // data = await response.text();
      return new NextResponse(response.body, {
        status: response.status,
        headers: { "Content-Type": contentType },
      });
    }
  } catch (error) {
    // console.error(`[API Proxy] ${req.method} /${targetPath} ->`, error.message);
    console.log(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
