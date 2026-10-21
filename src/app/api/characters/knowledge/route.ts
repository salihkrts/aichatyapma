import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const characterId = formData.get("characterId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedExtensions = ["pdf", "txt", "md", "json"];
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      return NextResponse.json(
        {
          error: `Unsupported file format. Supported: ${allowedExtensions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Read file buffer & text if plain text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawContent = "";
    if (["txt", "md", "json"].includes(extension)) {
      rawContent = buffer.toString("utf-8");
    } else if (extension === "pdf") {
      // PDF placeholder or text extractor indicator
      rawContent = `[PDF Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`;
    }

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const { error: storageError } = await supabase.storage
      .from("knowledge-files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (storageError) {
      console.warn("Storage upload warning (proceeding with db record):", storageError.message);
    }

    // Get public/signed URL or reference path
    const fileUrl = storagePath;

    // If characterId is provided (existing character), insert directly to DB
    let knowledgeRecordId: string | null = null;
    if (characterId) {
      const { data: record, error: dbError } = await supabase
        .from("character_knowledge")
        .insert({
          character_id: characterId,
          file_name: file.name,
          file_type: extension as "pdf" | "txt" | "md" | "json",
          file_size: file.size,
          file_url: fileUrl,
          raw_content: rawContent.slice(0, 50000), // First 50k chars
          chunk_count: Math.ceil(rawContent.length / 1000) || 1,
          processing_status: "completed",
        })
        .select("id")
        .single();

      if (dbError) {
        return NextResponse.json(
          { error: `Database error: ${dbError.message}` },
          { status: 500 }
        );
      }
      knowledgeRecordId = record?.id ?? null;
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileType: extension,
        fileSize: file.size,
        fileUrl,
        rawContentPreview: rawContent.slice(0, 300),
        knowledgeRecordId,
      },
    });
  } catch (error: unknown) {
    console.error("Knowledge upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
