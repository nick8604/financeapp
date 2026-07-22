"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunAccrualAll({ loanIds }: { loanIds: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const results = await Promise.all(
      loanIds.map((loanId) =>
        fetch(`/api/loans/${loanId}/run-accrual`, { method: "POST" })
      )
    );

    const failed = results.some((r) => !r.ok);
    setLoading(false);
    if (failed) setError("Some loans failed to accrue — check server logs.");
    router.refresh();
  }

  if (loanIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {loading ? "Running accrual..." : `Run accrual (${loanIds.length} loans)`}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
