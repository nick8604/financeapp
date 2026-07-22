import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCurrentProfile();
  if (!ctx) return jsonError("Unauthorized", 401);
  const { supabase } = ctx;
  const { id: loanId } = await params;

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .single();

  if (loanError || !loan) return jsonError("Loan not found", 404);

  const { data: schedule, error: scheduleError } = await supabase
    .from("repayment_schedule")
    .select("*, payments(*)")
    .eq("loan_id", loanId)
    .order("installment_no", { ascending: true });

  if (scheduleError) return jsonError(scheduleError.message, 500);

  return NextResponse.json({ loan, schedule });
}
