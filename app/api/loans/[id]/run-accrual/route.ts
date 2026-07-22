import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

const LATE_PENALTY_RATE = 0.02; // 2% of the missed installment, per accrual run

/**
 * Manual stand-in for a scheduled interest-accrual job (see roadmap
 * "constraints" section). Finds installments past their due_date that
 * haven't been paid, flags them overdue, and adds a late-payment penalty to
 * the loan's outstanding balance. A real cron/queue worker would run this
 * automatically per period instead of on an admin click.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;
  const { id: loanId } = await params;

  if (profile.role !== "underwriter") {
    return jsonError("Only underwriters can run accrual", 403);
  }

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single();

  if (loanError || !loan) return jsonError("Loan not found", 404);

  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueInstallments, error: overdueError } = await supabase
    .from("repayment_schedule")
    .select("*")
    .eq("loan_id", loanId)
    .lt("due_date", today)
    .in("status", ["due", "overdue"]);

  if (overdueError) return jsonError(overdueError.message, 500);

  if (!overdueInstallments || overdueInstallments.length === 0) {
    return NextResponse.json({ penaltyApplied: 0, overdueCount: 0 });
  }

  let totalPenalty = 0;
  for (const installment of overdueInstallments) {
    const penalty =
      Math.round(Number(installment.amount_due) * LATE_PENALTY_RATE * 100) / 100;
    totalPenalty += penalty;

    if (installment.status !== "overdue") {
      await supabase
        .from("repayment_schedule")
        .update({ status: "overdue" })
        .eq("id", installment.id);
    }
  }

  const newBalance =
    Math.round((Number(loan.outstanding_balance) + totalPenalty) * 100) / 100;

  const { error: updateError } = await supabase
    .from("loans")
    .update({ outstanding_balance: newBalance, status: "delinquent" })
    .eq("id", loanId);

  if (updateError) return jsonError(updateError.message, 500);

  await logAudit(supabase, {
    entity: "loan",
    entityId: loanId,
    action: "accrual_run",
    actorId: profile.id,
    details: { overdueCount: overdueInstallments.length, penaltyApplied: totalPenalty },
  });

  return NextResponse.json({
    penaltyApplied: totalPenalty,
    overdueCount: overdueInstallments.length,
    newBalance,
  });
}
