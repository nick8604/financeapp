import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;
  const { id: applicationId } = await params;

  const formData = await request.formData();
  const file = formData.get("file");
  const type = (formData.get("type") as string) || "id_proof";

  if (!(file instanceof File)) {
    return jsonError("Missing file", 400);
  }

  const path = `${applicationId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type });

  if (uploadError) return jsonError(uploadError.message, 500);

  const { data, error } = await supabase
    .from("documents")
    .insert({ application_id: applicationId, file_url: path, type })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  await logAudit(supabase, {
    entity: "application",
    entityId: applicationId,
    action: "document_uploaded",
    actorId: profile.id,
    details: { type, path },
  });

  return NextResponse.json({ document: data }, { status: 201 });
}
