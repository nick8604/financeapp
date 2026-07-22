"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DecisionForm({
  applicationId,
  suggestedAmount,
}: {
  applicationId: string;
  suggestedAmount: number;
}) {
  const router = useRouter();
  const [approvedAmount, setApprovedAmount] = useState(String(suggestedAmount));
  const [interestRate, setInterestRate] = useState("10");
  const [tenureMonths, setTenureMonths] = useState("12");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitDecision(decision: "approved" | "rejected") {
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/applications/${applicationId}/decision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        approvedAmount: decision === "approved" ? Number(approvedAmount) : undefined,
        interestRate: decision === "approved" ? Number(interestRate) : undefined,
        tenureMonths: decision === "approved" ? Number(tenureMonths) : undefined,
        reason: reason || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to record decision");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
        Decision
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Approved amount
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={approvedAmount}
            onChange={(e) => setApprovedAmount(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Interest rate (% APR)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tenure (months)
          </label>
          <input
            type="number"
            min="1"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Reason (required for rejection, optional otherwise)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => submitDecision("approved")}
          disabled={loading}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => submitDecision("rejected")}
          disabled={loading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
