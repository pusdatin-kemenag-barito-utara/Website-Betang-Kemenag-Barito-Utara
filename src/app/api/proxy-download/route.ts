import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return new NextResponse(`Failed to fetch from remote: ${response.statusText}`, { status: response.status });
    }

    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    
    if (contentType) headers.set("Content-Type", contentType);
    if (contentLength) headers.set("Content-Length", contentLength);
    
    // Gunakan arrayBuffer untuk memastikan file biner (gambar, pdf, dll) tidak rusak (corrupt)
    // saat di-proxy oleh Next.js NextResponse.
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Proxy download error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
