import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    
    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 1MB" }, { status: 400 });
    }
    
    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const chunkSize = 8192; // Process in chunks to avoid memory issues
    const uint8Array = new Uint8Array(bytes);
    let base64 = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64 += btoa(String.fromCharCode(...chunk));
    }
    
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    return NextResponse.json({ url: dataUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}
