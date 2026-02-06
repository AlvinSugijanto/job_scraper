import { NextResponse } from "next/server";

import axios from "axios";

export async function POST(req) {
  const EMAIL = process.env.NEXT_PUBLIC_API_EMAIL;

  try {
    const formData = await req.formData();
    const headers = req.headers;

    const res = await axios.post(`${EMAIL}`, formData, {
      headers,
    });

    return NextResponse.json(res.data);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error?.response?.status || 500 },
    );
  }
}
