import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    
    // Test if video_thumbnail column exists by trying to select it
    const { data, error } = await supabase
      .from("tasks")
      .select("id, video_thumbnail")
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        error: "Database schema issue", 
        details: error.message,
        suggestion: "The video_thumbnail column may not exist in the tasks table. Please add it to your database schema."
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: "Database schema is correct",
      hasVideoThumbnail: true,
      sampleData: data 
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}
