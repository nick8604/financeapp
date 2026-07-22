import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";

export default async function UnderwriterDashboard() {
  const ctx = await getCurrentProfile();
  if (!ctx) return null;
  const { supabase } = ctx;

  const { data: applications } = await supabase
    .from("applications")
    .select("*, profiles(full_name), credit_checks(score)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Applications
      </h1>

      {!applications || applications.length === 0 ? (
        <p className="text-sm text-zinc-500">No applications yet.</p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {applications.map((app) => {
            const applicantName =
              (Array.isArray(app.profiles) ? app.profiles[0]?.full_name : app.profiles?.full_name) ??
              "Unknown applicant";
            const latestScore = app.credit_checks?.at(-1)?.score;

            return (
              <Link
                key={app.id}
                href={`/underwriter/applications/${app.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {applicantName} —{" "}
                    {Number(app.requested_amount).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {app.requested_tenure_months} months · income{" "}
                    {Number(app.income).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })}
                    {latestScore ? ` · credit score ${latestScore}` : ""}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
