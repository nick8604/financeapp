"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

export function NavBar({
  role,
  fullName,
}: {
  role: Role;
  fullName: string | null;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links =
    role === "underwriter"
      ? [
          { href: "/underwriter", label: "Applications" },
          { href: "/underwriter/collections", label: "Collections" },
        ]
      : [{ href: "/applicant", label: "Dashboard" }];

  return (
    <nav className="flex items-center justify-between gap-x-2 border-b border-zinc-200 bg-white px-3 py-3 sm:gap-x-4 sm:px-6 sm:py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 items-center gap-2 sm:gap-6">
        <span className="whitespace-nowrap font-semibold text-zinc-900 dark:text-zinc-50">
          Credit91
        </span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <span className="hidden whitespace-nowrap text-sm text-zinc-500 sm:inline">
          {fullName ?? "You"} · {role}
        </span>
        <button
          onClick={handleLogout}
          className="whitespace-nowrap rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
