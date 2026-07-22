import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { generateAmortizationSchedule } from "@/lib/amortization";

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
    .select("*, decisions(*)")
    .eq("id", applicationId)
    .single();

  if (appError || !application) return jsonError("Application not found", 404);
  if (application.user_id !== profile.id) {
    return jsonError("Not your application", 403);
  }
  if (application.status !== "approved") {
    return jsonError("Application is not in an approved state", 400);
  }

  // decisions.application_id is UNIQUE, so PostgREST embeds it as a single
  // object (or null), not an array.
  const decision = Array.isArray(application.decisions)
    ? application.decisions[0]
    : application.decisions;
  if (!decision) return jsonError("No decision found for this application", 400);

  // Mocked instant disbursement: in production this step would wait on a
  // real disbursement/payment-rail confirmation before marking as disbursed.
  const disbursedAt = new Date();

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      application_id: applicationId,
      principal: decision.approved_amount,
      interest_rate: decision.interest_rate,
      tenure_months: decision.tenure_months,
      outstanding_balance: decision.approved_amount,
      status: "active",
      disbursed_at: disbursedAt.toISOString(),
    })
    .select()
    .single();

  if (loanError) return jsonError(loanError.message, 500);

  const schedule = generateAmortizationSchedule(
    Number(decision.approved_amount),
    Number(decision.interest_rate),
    Number(decision.tenure_months),
    disbursedAt
  );

  const { error: scheduleError } = await supabase.from("repayment_schedule").insert(
    schedule.map((row) => ({
      loan_id: loan.id,
      installment_no: row.installmentNo,
      due_date: row.dueDate,
      amount_due: row.amountDue,
      principal_component: row.principalComponent,
      interest_component: row.interestComponent,
    }))
  );

  if (scheduleError) return jsonError(scheduleError.message, 500);

  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: "disbursed", updated_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (updateError) return jsonError(updateError.message, 500);

  await logAudit(supabase, {
    entity: "loan",
    entityId: loan.id,
    action: "disbursed",
    actorId: profile.id,
    details: { principal: decision.approved_amount },
  });

  return NextResponse.json({ loan }, { status: 201 });
}
