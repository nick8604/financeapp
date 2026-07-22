import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;
  const { id: applicationId } = await params;

  if (profile.role !== "underwriter") {
    return jsonError("Only underwriters can decide applications", 403);
  }

  const body = await request.json();
  const { decision, approvedAmount, interestRate, tenureMonths, reason } = body;

  if (decision !== "approved" && decision !== "rejected") {
    return jsonError("decision must be 'approved' or 'rejected'", 400);
  }
  if (decision === "approved" && (!approvedAmount || !interestRate || !tenureMonths)) {
    return jsonError(
      "approvedAmount, interestRate, and tenureMonths are required to approve",
      400
    );
  }

  const { data: decisionRow, error: decisionError } = await supabase
    .from("decisions")
    .insert({
      application_id: applicationId,
      decision,
      approved_amount: decision === "approved" ? approvedAmount : null,
      interest_rate: decision === "approved" ? interestRate : null,
      tenure_months: decision === "approved" ? tenureMonths : null,
      decided_by: profile.id,
      reason: reason ?? null,
    })
    .select()
    .single();

  if (decisionError) return jsonError(decisionError.message, 500);

  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: decision, updated_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (updateError) return jsonError(updateError.message, 500);

  await logAudit(supabase, {
    entity: "application",
    entityId: applicationId,
    action: `decision_${decision}`,
    actorId: profile.id,
    details: { approvedAmount, interestRate, tenureMonths, reason },
  });

  return NextResponse.json({ decision: decisionRow }, { status: 201 });
}
