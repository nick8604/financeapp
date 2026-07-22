import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

/**
 * "Simulate Payment": pays the earliest outstanding installment on the loan
 * (or a specific one, if scheduleId is provided). No real payment gateway --
 * this stands in for a webhook-confirmed payment in production.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;
  const { id: loanId } = await params;

  const body = await request.json().catch(() => ({}));
  const scheduleId: string | undefined = body.scheduleId;

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single();

  if (loanError || !loan) return jsonError("Loan not found", 404);

  let installmentQuery = supabase
    .from("repayment_schedule")
    .select("*")
    .eq("loan_id", loanId)
    .neq("status", "paid")
    .order("installment_no", { ascending: true })
    .limit(1);

  if (scheduleId) {
    installmentQuery = supabase
      .from("repayment_schedule")
      .select("*")
      .eq("id", scheduleId);
  }

  const { data: installments, error: installmentError } = await installmentQuery;
  if (installmentError) return jsonError(installmentError.message, 500);

  const installment = installments?.[0];
  if (!installment) return jsonError("No outstanding installment to pay", 400);
  if (installment.status === "paid") {
    return jsonError("Installment already paid", 400);
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      loan_id: loanId,
      schedule_id: installment.id,
      amount: installment.amount_due,
    })
    .select()
    .single();

  if (paymentError) return jsonError(paymentError.message, 500);

  const { error: scheduleUpdateError } = await supabase
    .from("repayment_schedule")
    .update({ status: "paid" })
    .eq("id", installment.id);

  if (scheduleUpdateError) return jsonError(scheduleUpdateError.message, 500);

  const newBalance = Math.max(
    0,
    Number(loan.outstanding_balance) - Number(installment.principal_component)
  );

  const { count: remaining } = await supabase
    .from("repayment_schedule")
    .select("*", { count: "exact", head: true })
    .eq("loan_id", loanId)
    .neq("status", "paid");

  const isFullyPaid = (remaining ?? 0) === 0;

  const { error: loanUpdateError } = await supabase
    .from("loans")
    .update({
      outstanding_balance: newBalance,
      status: isFullyPaid ? "closed" : "active",
    })
    .eq("id", loanId);

  if (loanUpdateError) return jsonError(loanUpdateError.message, 500);

  await logAudit(supabase, {
    entity: "loan",
    entityId: loanId,
    action: "payment_simulated",
    actorId: profile.id,
    details: {
      installmentNo: installment.installment_no,
      amount: installment.amount_due,
    },
  });

  return NextResponse.json({ payment, newBalance, loanClosed: isFullyPaid }, { status: 201 });
}
