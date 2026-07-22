/**
 * Seeds 3 demo applicants (pending / mid-repayment / delinquent) plus one
 * underwriter, so the live URL looks alive without manual clicking during
 * review. Run with: npm run seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API -> service_role)
 * in .env.local -- this key bypasses RLS and must never be exposed to the
 * browser or committed to git.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { generateAmortizationSchedule } from "../lib/amortization";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Password123!";

async function createUser(email: string, role: "applicant" | "underwriter", fullName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user!.id;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  return d;
}

async function main() {
  console.log("Seeding demo data...");

  const underwriterId = await createUser(
    "underwriter@mailinator.com",
    "underwriter",
    "Uma Underwriter"
  );

  // --- Applicant A: application still pending review ---------------------
  const applicantAId = await createUser("pending@mailinator.com", "applicant", "Alex Pending");
  const { data: appA, error: appAError } = await supabase
    .from("applications")
    .insert({
      user_id: applicantAId,
      status: "submitted",
      income: 6000,
      employment_info: "Product Manager, Northwind Traders",
      requested_amount: 20000,
      requested_tenure_months: 24,
    })
    .select()
    .single();
  if (appAError) throw appAError;

  await supabase
    .from("credit_checks")
    .insert({ application_id: appA.id, score: 710 });

  // --- Applicant B: active loan, mid-repayment ----------------------------
  const applicantBId = await createUser("active@mailinator.com", "applicant", "Blair Active");
  const { data: appB, error: appBError } = await supabase
    .from("applications")
    .insert({
      user_id: applicantBId,
      status: "disbursed",
      income: 8500,
      employment_info: "Senior Engineer, Initech",
      requested_amount: 150000,
      requested_tenure_months: 12,
    })
    .select()
    .single();
  if (appBError) throw appBError;

  await supabase.from("credit_checks").insert({ application_id: appB.id, score: 780 });

  const decisionBInterestRate = 9.5;
  await supabase.from("decisions").insert({
    application_id: appB.id,
    decision: "approved",
    approved_amount: 150000,
    interest_rate: decisionBInterestRate,
    tenure_months: 12,
    decided_by: underwriterId,
  });

  const disbursedAtB = monthsAgo(4);
  const { data: loanB, error: loanBError } = await supabase
    .from("loans")
    .insert({
      application_id: appB.id,
      principal: 150000,
      interest_rate: decisionBInterestRate,
      tenure_months: 12,
      outstanding_balance: 150000,
      status: "active",
      disbursed_at: disbursedAtB.toISOString(),
    })
    .select()
    .single();
  if (loanBError) throw loanBError;

  const scheduleB = generateAmortizationSchedule(150000, decisionBInterestRate, 12, disbursedAtB);
  const { data: scheduleBRows, error: scheduleBError } = await supabase
    .from("repayment_schedule")
    .insert(
      scheduleB.map((row) => ({
        loan_id: loanB.id,
        installment_no: row.installmentNo,
        due_date: row.dueDate,
        amount_due: row.amountDue,
        principal_component: row.principalComponent,
        interest_component: row.interestComponent,
      }))
    )
    .select();
  if (scheduleBError) throw scheduleBError;

  // Pay the first 3 installments, reducing the outstanding balance.
  let balanceB = 150000;
  for (const row of scheduleBRows!.slice(0, 3)) {
    await supabase
      .from("payments")
      .insert({ loan_id: loanB.id, schedule_id: row.id, amount: row.amount_due });
    await supabase.from("repayment_schedule").update({ status: "paid" }).eq("id", row.id);
    balanceB -= Number(row.principal_component);
  }
  await supabase
    .from("loans")
    .update({ outstanding_balance: Math.round(balanceB * 100) / 100 })
    .eq("id", loanB.id);

  // --- Applicant C: delinquent loan (missed a due date) -------------------
  const applicantCId = await createUser("delinquent@mailinator.com", "applicant", "Casey Delinquent");
  const { data: appC, error: appCError } = await supabase
    .from("applications")
    .insert({
      user_id: applicantCId,
      status: "disbursed",
      income: 4200,
      employment_info: "Freelance Designer",
      requested_amount: 60000,
      requested_tenure_months: 6,
    })
    .select()
    .single();
  if (appCError) throw appCError;

  await supabase.from("credit_checks").insert({ application_id: appC.id, score: 620 });

  const decisionCInterestRate = 14;
  await supabase.from("decisions").insert({
    application_id: appC.id,
    decision: "approved",
    approved_amount: 60000,
    interest_rate: decisionCInterestRate,
    tenure_months: 6,
    decided_by: underwriterId,
  });

  const disbursedAtC = monthsAgo(3);
  const { data: loanC, error: loanCError } = await supabase
    .from("loans")
    .insert({
      application_id: appC.id,
      principal: 60000,
      interest_rate: decisionCInterestRate,
      tenure_months: 6,
      outstanding_balance: 60000,
      status: "active",
      disbursed_at: disbursedAtC.toISOString(),
    })
    .select()
    .single();
  if (loanCError) throw loanCError;

  const scheduleC = generateAmortizationSchedule(60000, decisionCInterestRate, 6, disbursedAtC);
  await supabase.from("repayment_schedule").insert(
    scheduleC.map((row) => ({
      loan_id: loanC.id,
      installment_no: row.installmentNo,
      due_date: row.dueDate,
      amount_due: row.amountDue,
      principal_component: row.principalComponent,
      interest_component: row.interestComponent,
    }))
  );
  // Leave all installments unpaid with due dates already in the past --
  // this loan will show up in Collections, and "Run Accrual" will flag it.

  console.log("\nSeed complete. Demo accounts (all use password: %s)\n", DEMO_PASSWORD);
  console.log("  underwriter@mailinator.com  - underwriter");
  console.log("  pending@mailinator.com      - applicant, application awaiting review");
  console.log("  active@mailinator.com       - applicant, active loan mid-repayment");
  console.log("  delinquent@mailinator.com   - applicant, loan with missed installments");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
