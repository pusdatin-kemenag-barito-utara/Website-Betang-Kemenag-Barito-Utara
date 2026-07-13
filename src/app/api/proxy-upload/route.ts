import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  try {
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const contentLength = request.headers.get("content-length");
    
    // Buffer seluruh request ke memori agar fetch dapat mengirimkan header Content-Length
    // secara akurat ke S3/R2 (S3 biasanya menolak 'Transfer-Encoding: chunked' untuk Presigned URL)
    const arrayBuffer = await request.arrayBuffer();

    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    const response = await fetch(url, {
      method: "PUT",
      body: arrayBuffer,
      headers: headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error("Upload proxy error from R2:", response.status, errorText);
      return new NextResponse(errorText || "Upload ke remote gagal", { status: response.status });
    }

    return new NextResponse("Uploaded successfully", { status: 200 });
  } catch (error) {
    console.error("Proxy upload error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
