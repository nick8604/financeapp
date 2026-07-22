import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { DecisionForm } from "@/components/DecisionForm";
import { formatCurrency } from "@/lib/currency";
import type { CreditCheck, Decision, Document } from "@/lib/types";

export default async function UnderwriterApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentProfile();
  if (!ctx) return null;
  const { supabase } = ctx;

  const { data: application } = await supabase
    .from("applications")
    .select("*, profiles(full_name), documents(*), credit_checks(*), decisions(*)")
    .eq("id", id)
    .single();

  if (!application) notFound();

  const applicantProfile = Array.isArray(application.profiles)
    ? application.profiles[0]
    : application.profiles;
  const documents = (application.documents ?? []) as Document[];
  const creditChecks = (application.credit_checks ?? []) as CreditCheck[];
  // decisions.application_id is UNIQUE, so PostgREST embeds it as a single
  // object (or null), not an array.
  const decision = (
    Array.isArray(application.decisions)
      ? application.decisions[0]
      : application.decisions
  ) as Decision | null;
  const latestScore = creditChecks.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {applicantProfile?.full_name ?? "Applicant"}&apos;s application
        </h1>
        <StatusBadge status={application.status} />
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <p className="text-zinc-500">Requested amount</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(Number(application.requested_amount))}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Requested tenure</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {application.requested_tenure_months} months
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Monthly income</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {formatCurrency(Number(application.income))}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Employment</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {application.employment_info}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Credit score</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {latestScore ? latestScore.score : "Not checked yet"}
          </p>
        </div>
        <div>
          <p className="text-zinc-500">Documents</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {documents.length > 0
              ? documents.map((d) => d.type).join(", ")
              : "None uploaded"}
          </p>
        </div>
      </section>

      {application.status === "submitted" && (
        <DecisionForm
          applicationId={application.id}
          suggestedAmount={Number(application.requested_amount)}
        />
      )}

      {decision && application.status !== "submitted" && (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
            Recorded decision
          </h2>
          <p className="text-zinc-700 dark:text-zinc-300">
            {decision.decision === "approved"
              ? `Approved ${formatCurrency(
                  Number(decision.approved_amount)
                )} at ${decision.interest_rate}% APR over ${decision.tenure_months} months.`
              : `Rejected. ${decision.reason ?? ""}`}
          </p>
        </section>
      )}
    </div>
  );
}
