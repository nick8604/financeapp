"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewApplicationForm() {
  const router = useRouter();
  const [income, setIncome] = useState("");
  const [employmentInfo, setEmploymentInfo] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [requestedTenureMonths, setRequestedTenureMonths] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        income: Number(income),
        employmentInfo,
        requestedAmount: Number(requestedAmount),
        requestedTenureMonths: Number(requestedTenureMonths),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to submit application");
      return;
    }

    setIncome("");
    setEmploymentInfo("");
    setRequestedAmount("");
    setRequestedTenureMonths("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
        New loan application
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Monthly income
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Employment info
          </label>
          <input
            required
            value={employmentInfo}
            onChange={(e) => setEmploymentInfo(e.target.value)}
            placeholder="e.g. Software Engineer, Acme Corp"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Requested amount
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Requested tenure (months)
          </label>
          <input
            required
            type="number"
            min="1"
            value={requestedTenureMonths}
            onChange={(e) => setRequestedTenureMonths(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {loading ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}
