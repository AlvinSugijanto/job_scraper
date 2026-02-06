import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let fileName = "";
  let filePath = "";

  if (type === "brochure") {
    fileName = "Nawadhya Big Data Brochure.pdf";
    filePath = path.join(process.cwd(), "public", fileName);
  } else if (type === "product") {
    fileName = "Nawadhya Product Line 2026.pdf";
    filePath = path.join(process.cwd(), "public", fileName);
  } else {
    return new NextResponse("Invalid file", { status: 400 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("File not found", { status: 404 });
  }
}
