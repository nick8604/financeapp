import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ActionButton } from "@/components/ActionButton";
import { formatCurrency } from "@/lib/currency";
import type { CreditCheck, Decision, Document, Loan } from "@/lib/types";

export default async function ApplicationDetailPage({
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
    .select("*, documents(*), credit_checks(*), decisions(*), loans(*)")
    .eq("id", id)
    .single();

  if (!application) notFound();

  const documents = (application.documents ?? []) as Document[];
  const creditChecks = (application.credit_checks ?? []) as CreditCheck[];
  // decisions.application_id and loans.application_id are both UNIQUE, so
  // PostgREST embeds them as a single object (or null), not an array.
  const decision = (
    Array.isArray(application.decisions)
      ? application.decisions[0]
      : application.decisions
  ) as Decision | null;
  const loan = (
    Array.isArray(application.loans) ? application.loans[0] : application.loans
  ) as Loan | null;
  const latestScore = creditChecks.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Application
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
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Documents
        </h2>
        {documents.length === 0 ? (
          <p className="text-sm text-zinc-500">No documents uploaded yet.</p>
        ) : (
          <ul className="text-sm text-zinc-700 dark:text-zinc-300">
            {documents.map((doc) => (
              <li key={doc.id}>
                {doc.type} — uploaded{" "}
                {new Date(doc.uploaded_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
        <DocumentUpload applicationId={application.id} />
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Credit check
        </h2>
        {latestScore ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Score: <span className="font-semibold">{latestScore.score}</span>
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-500">
              No credit check on file yet. Run one so the underwriter has a
              score to review.
            </p>
            <ActionButton
              label="Run credit check"
              loadingLabel="Checking..."
              endpoint={`/api/applications/${application.id}/credit-check`}
              variant="secondary"
            />
          </>
        )}
      </section>

      {application.status === "approved" && decision && (
        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-200">
            You&apos;re approved
          </h2>
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            {formatCurrency(Number(decision.approved_amount))}{" "}
            at {decision.interest_rate}% APR over {decision.tenure_months}{" "}
            months.
          </p>
          <ActionButton
            label="Accept offer"
            loadingLabel="Disbursing..."
            endpoint={`/api/applications/${application.id}/accept-offer`}
          />
        </section>
      )}

      {application.status === "rejected" && decision && (
        <section className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <h2 className="font-semibold text-red-900 dark:text-red-200">
            Application rejected
          </h2>
          {decision.reason && (
            <p className="text-sm text-red-800 dark:text-red-300">
              {decision.reason}
            </p>
          )}
        </section>
      )}

      {loan && (
        <Link
          href={`/applicant/loans/${loan.id}`}
          className="block rounded-xl border border-sky-200 bg-sky-50 p-6 text-sm font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200"
        >
          Your loan has been disbursed → view repayment schedule
        </Link>
      )}
    </div>
  );
}
