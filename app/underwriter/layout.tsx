import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default async function UnderwriterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentProfile();
  if (!ctx) redirect("/login");
  if (ctx.profile.role !== "underwriter") redirect("/applicant");

  return (
    <div className="flex flex-1 flex-col">
      <NavBar role={ctx.profile.role} fullName={ctx.profile.full_name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
