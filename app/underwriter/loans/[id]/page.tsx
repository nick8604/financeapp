import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionButton } from "@/components/ActionButton";
import { formatCurrency } from "@/lib/currency";
import type { RepaymentInstallment } from "@/lib/types";

export default async function UnderwriterLoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentProfile();
  if (!ctx) return null;
  const { supabase } = ctx;

  const { data: loan } = await supabase
    .from("loans")
    .select("*, applications(profiles(full_name))")
    .eq("id", id)
    .single();

  if (!loan) notFound();

  const application = Array.isArray(loan.applications)
    ? loan.applications[0]
    : loan.applications;
  const applicantProfile = Array.isArray(application?.profiles)
    ? application?.profiles[0]
    : application?.profiles;

  const { data: schedule } = await supabase
    .from("repayment_schedule")
    .select("*")
    .eq("loan_id", id)
    .order("installment_no", { ascending: true });

  const rows = (schedule ?? []) as RepaymentInstallment[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {applicantProfile?.full_name ?? "Applicant"}&apos;s loan
        </h1>
        <StatusBadge status={loan.status} />
      </div>

      <section className="grid grid-cols-3 gap-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <p className="text-zinc-500">Principal</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(Number(loan.principal))}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Interest rate</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {loan.interest_rate}% APR
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Outstanding balance</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(Number(loan.outstanding_balance))}
          </p>
        </div>
      </section>

      <ActionButton
        label="Run accrual for this loan"
        loadingLabel="Running..."
        endpoint={`/api/loans/${id}/run-accrual`}
        variant="secondary"
      />

      <section className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Total due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.installment_no}</td>
                <td className="px-4 py-3">{row.due_date}</td>
                <td className="px-4 py-3">
                  {formatCurrency(Number(row.amount_due))}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
