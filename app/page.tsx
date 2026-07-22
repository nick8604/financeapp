import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function Home() {
  const ctx = await getCurrentProfile();
  if (ctx) {
    redirect(ctx.profile.role === "underwriter" ? "/underwriter" : "/applicant");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <div className="max-w-lg space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Credit91 — Loan Origination &amp; Management System
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Apply for a loan, get an underwriting decision, and manage
          repayment — all in one demo built on Next.js and Supabase.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
