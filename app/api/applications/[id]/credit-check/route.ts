import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { generateMockCreditScore } from "@/lib/mockCreditScore";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;
  const { id: applicationId } = await params;

  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("income, requested_amount")
    .eq("id", applicationId)
    .single();

  if (appError || !application) return jsonError("Application not found", 404);

  const score = generateMockCreditScore(
    Number(application.income),
    Number(application.requested_amount)
  );

  const { data, error } = await supabase
    .from("credit_checks")
    .insert({ application_id: applicationId, score })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  await logAudit(supabase, {
    entity: "application",
    entityId: applicationId,
    action: "credit_check_run",
    actorId: profile.id,
    details: { score },
  });

  return NextResponse.json({ creditCheck: data }, { status: 201 });
}
