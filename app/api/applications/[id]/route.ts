import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase } = ctx;
  const { id } = await params;

  const { data: application, error } = await supabase
    .from("applications")
    .select(
      "*, profiles(full_name), documents(*), credit_checks(*), decisions(*), loans(*)"
    )
    .eq("id", id)
    .single();

  if (error || !application) return jsonError("Application not found", 404);

  return NextResponse.json({ application });
}
