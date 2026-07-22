const COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  accepted: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  disbursed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  delinquent: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  closed: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  due: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        COLORS[status] ?? "bg-zinc-100 text-zinc-700"
      }`}
    >
      {status}
    </span>
  );
}
