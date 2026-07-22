import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET() {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;

  if (profile.role !== "underwriter") {
    return jsonError("Underwriters only", 403);
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueRows, error } = await supabase
    .from("repayment_schedule")
    .select(
      "id, due_date, amount_due, status, loan_id, loans(id, outstanding_balance, status, application_id, applications(user_id, profiles(full_name)))"
    )
    .lt("due_date", today)
    .in("status", ["due", "overdue"]);

  if (error) return jsonError(error.message, 500);

  const byLoan = new Map<
    string,
    {
      loanId: string;
      borrowerName: string | null;
      outstandingBalance: number;
      loanStatus: string;
      overdueInstallments: number;
      earliestDueDate: string;
    }
  >();

  for (const row of overdueRows ?? []) {
    const loan = Array.isArray(row.loans) ? row.loans[0] : row.loans;
    if (!loan) continue;
    const application = Array.isArray(loan.applications)
      ? loan.applications[0]
      : loan.applications;
    const applicantProfile = application
      ? Array.isArray(application.profiles)
        ? application.profiles[0]
        : application.profiles
      : null;

    const existing = byLoan.get(row.loan_id);
    if (existing) {
      existing.overdueInstallments += 1;
      if (row.due_date < existing.earliestDueDate) {
        existing.earliestDueDate = row.due_date;
      }
    } else {
      byLoan.set(row.loan_id, {
        loanId: row.loan_id,
        borrowerName: applicantProfile?.full_name ?? null,
        outstandingBalance: Number(loan.outstanding_balance),
        loanStatus: loan.status,
        overdueInstallments: 1,
        earliestDueDate: row.due_date,
      });
    }
  }

  return NextResponse.json({ collections: Array.from(byLoan.values()) });
}
