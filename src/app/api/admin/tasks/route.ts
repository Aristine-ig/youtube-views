import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tasks: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const channel_name = formData.get("channel_name") as string;
    const video_length = formData.get("video_length") as string;
    const required_actions = formData.get("required_actions") as string;
    const reward_amount = formData.get("reward_amount") as string;
    const max_users = formData.get("max_users") as string;
    const is_enabled = formData.get("is_enabled") === "true";
    const file = formData.get("file") as File | null;

    if (!title || title.trim() === '' || !channel_name || channel_name.trim() === '' || !reward_amount) {
      return NextResponse.json({ error: "Title, channel name and reward amount are required" }, { status: 400 });
    }

    let video_thumbnail: string | null = null;

    if (file) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}-${random}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const buffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("task-thumbnails")
        .upload(filename, buffer, {
          contentType: file.type,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
      }

      video_thumbnail = `task-thumbnails/${filename}`;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: title,
        channel_name: channel_name || null,
        video_length: video_length || null,
        required_actions: required_actions || null,
        reward_amount: parseFloat(reward_amount),
        max_users: max_users || 500,
        is_enabled: is_enabled !== false,
        video_thumbnail: video_thumbnail,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const file = formData.get("file") as File | null;
    
    if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    
    // Add all text fields if they exist
    const fields = ["title", "channel_name", "video_length", "required_actions", "reward_amount", "max_users", "is_enabled", "video_thumbnail"];
    for (const field of fields) {
      const value = formData.get(field);
      if (value !== null) {
        if (field === "is_enabled") {
          updates[field] = value === "true";
        } else if (field === "reward_amount" || field === "max_users") {
          updates[field] = field === "reward_amount" ? parseFloat(value as string) : parseInt(value as string);
        } else {
          updates[field] = value;
        }
      }
    }

    // Validate required fields
    if (updates.title === '' || (updates.title as string)?.trim() === '') {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    if (updates.channel_name === '' || (updates.channel_name as string)?.trim() === '') {
      return NextResponse.json({ error: "Channel name cannot be empty" }, { status: 400 });
    }

    // Handle file upload if provided
    if (file) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}-${random}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const buffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("task-thumbnails")
        .upload(filename, buffer, {
          contentType: file.type,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
      }

      updates.video_thumbnail = `task-thumbnails/${filename}`;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}
