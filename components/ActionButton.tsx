"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared button for the several "fire a POST at this endpoint, then refresh"
 * actions across the app (credit check, accept offer, simulate payment, run
 * accrual).
 */
export function ActionButton({
  label,
  loadingLabel,
  endpoint,
  method = "POST",
  body,
  variant = "primary",
  onResult,
}: {
  label: string;
  loadingLabel?: string;
  endpoint: string;
  method?: string;
  body?: Record<string, unknown>;
  variant?: "primary" | "secondary";
  onResult?: (data: unknown) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch(endpoint, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    setLoading(false);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      setError(errBody.error ?? "Action failed");
      return;
    }

    const data = await res.json().catch(() => null);
    onResult?.(data);
    router.refresh();
  }

  const classes =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
      : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${classes}`}
      >
        {loading ? loadingLabel ?? "Working..." : label}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
