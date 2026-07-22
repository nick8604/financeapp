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
    <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          Credit91
        </span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-500">
          {fullName ?? "You"} · {role}
        </span>
        <button
          onClick={handleLogout}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
