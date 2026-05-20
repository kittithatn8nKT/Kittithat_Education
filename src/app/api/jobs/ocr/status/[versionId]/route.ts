import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Status polling endpoint. Returns the OCR state for a single version.
 * RLS scopes the read — callers outside the tenant see 404.
 *
 * The UI can use this to poll while a document is uploading and update
 * the status badge in near-real-time (Phase 4 will swap polling for
 * Supabase Realtime).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { versionId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("document_versions")
    .select("id, ocr_status, ocr_attempt, ocr_max_attempts, ocr_error, ocr_completed_at")
    .eq("id", versionId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
