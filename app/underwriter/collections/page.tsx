import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { RunAccrualAll } from "@/components/RunAccrualAll";

export default async function CollectionsPage() {
  const ctx = await getCurrentProfile();
  if (!ctx) return null;
  const { supabase } = ctx;

  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueRows } = await supabase
    .from("repayment_schedule")
    .select(
      "id, due_date, status, loan_id, loans(id, outstanding_balance, status, application_id, applications(profiles(full_name)))"
    )
    .lt("due_date", today)
    .in("status", ["due", "overdue"]);

  type Row = {
    loan_id: string;
    due_date: string;
    loans: {
      id: string;
      outstanding_balance: number;
      status: string;
      applications:
        | { profiles: { full_name: string | null } | { full_name: string | null }[] | null }
        | { profiles: { full_name: string | null } | { full_name: string | null }[] | null }[]
        | null;
    } | { id: string; outstanding_balance: number; status: string; applications: unknown }[];
  };

  const byLoan = new Map<
    string,
    {
      loanId: string;
      borrowerName: string;
      outstandingBalance: number;
      loanStatus: string;
      overdueInstallments: number;
      earliestDueDate: string;
    }
  >();

  for (const raw of (overdueRows ?? []) as Row[]) {
    const loan = Array.isArray(raw.loans) ? raw.loans[0] : raw.loans;
    if (!loan) continue;
    const application = Array.isArray(loan.applications)
      ? loan.applications[0]
      : loan.applications;
    const profileField = (application as { profiles?: unknown } | null)?.profiles;
    const applicantProfile = Array.isArray(profileField)
      ? profileField[0]
      : profileField;
    const borrowerName =
      (applicantProfile as { full_name?: string } | undefined)?.full_name ??
      "Unknown";

    const existing = byLoan.get(raw.loan_id);
    if (existing) {
      existing.overdueInstallments += 1;
      if (raw.due_date < existing.earliestDueDate) {
        existing.earliestDueDate = raw.due_date;
      }
    } else {
      byLoan.set(raw.loan_id, {
        loanId: raw.loan_id,
        borrowerName,
        outstandingBalance: Number(loan.outstanding_balance),
        loanStatus: loan.status,
        overdueInstallments: 1,
        earliestDueDate: raw.due_date,
      });
    }
  }

  const collections = Array.from(byLoan.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Collections
        </h1>
        <RunAccrualAll loanIds={collections.map((c) => c.loanId)} />
      </div>

      {collections.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No loans past their due date right now.
        </p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {collections.map((c) => (
            <Link
              key={c.loanId}
              href={`/underwriter/loans/${c.loanId}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {c.borrowerName}
                </p>
                <p className="text-sm text-zinc-500">
                  {c.overdueInstallments} overdue installment
                  {c.overdueInstallments > 1 ? "s" : ""} since{" "}
                  {c.earliestDueDate} · balance{" "}
                  {c.outstandingBalance.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              </div>
              <StatusBadge status={c.loanStatus} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
