import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { NewApplicationForm } from "@/components/NewApplicationForm";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/currency";
import type { Application } from "@/lib/types";

export default async function ApplicantDashboard() {
  const ctx = await getCurrentProfile();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  const { data: applications } = await supabase
    .from("applications")
    .select("*, loans(id)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <NewApplicationForm />

      <div className="space-y-3">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Your applications
        </h2>
        {!applications || applications.length === 0 ? (
          <p className="text-sm text-zinc-500">No applications yet.</p>
        ) : (
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {(
              applications as (Application & {
                loans: { id: string } | { id: string }[] | null;
              })[]
            ).map((app) => {
              // loans.application_id is UNIQUE, so PostgREST embeds it as a
              // single object (or null), not an array.
              const loan = Array.isArray(app.loans) ? app.loans[0] : app.loans;
              return (
                <Link
                  key={app.id}
                  href={
                    loan
                      ? `/applicant/loans/${loan.id}`
                      : `/applicant/applications/${app.id}`
                  }
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(Number(app.requested_amount))}{" "}
                      over {app.requested_tenure_months} months
                    </p>
                    <p className="text-sm text-zinc-500">
                      Submitted{" "}
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
