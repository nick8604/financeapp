import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function GET() {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;

  const query = supabase
    .from("applications")
    .select("*, profiles(full_name), decisions(*), credit_checks(score)")
    .order("created_at", { ascending: false });

  const { data, error } =
    profile.role === "underwriter" ? await query : await query.eq("user_id", profile.id);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ applications: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase, profile } = ctx;

  if (profile.role !== "applicant") {
    return jsonError("Only applicants can submit applications", 403);
  }

  const body = await request.json();
  const { income, employmentInfo, requestedAmount, requestedTenureMonths } = body;

  if (!income || !employmentInfo || !requestedAmount || !requestedTenureMonths) {
    return jsonError("Missing required fields", 400);
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: profile.id,
      income,
      employment_info: employmentInfo,
      requested_amount: requestedAmount,
      requested_tenure_months: requestedTenureMonths,
    })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  await logAudit(supabase, {
    entity: "application",
    entityId: data.id,
    action: "submitted",
    actorId: profile.id,
  });

  return NextResponse.json({ application: data }, { status: 201 });
}
