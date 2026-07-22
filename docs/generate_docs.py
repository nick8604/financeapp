"""
Generates HLD.pdf and LLD.pdf for the Credit91 LOS/LMS assessment project.
Run: python3 docs/generate_docs.py
"""
from fpdf import FPDF

NAVY = (25, 40, 65)
ACCENT = (37, 99, 235)
GRAY = (90, 90, 90)
LIGHT = (240, 242, 247)
LINE = (210, 214, 220)


class DocPDF(FPDF):
    def __init__(self, title, subtitle):
        super().__init__(format="A4")
        self.doc_title = title
        self.doc_subtitle = subtitle
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 16, 18)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 8, self.doc_title, ln=0, align="L")
        self.cell(0, 8, "Credit91", ln=1, align="R")
        self.set_draw_color(*LINE)
        self.line(18, 16, 192, 16)
        self.ln(2)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")

    def title_page(self):
        self.add_page()
        self.set_y(80)
        self.set_font("Helvetica", "B", 26)
        self.set_text_color(*NAVY)
        self.multi_cell(0, 12, self.doc_title, align="C")
        self.ln(4)
        self.set_font("Helvetica", "", 14)
        self.set_text_color(*GRAY)
        self.multi_cell(0, 8, self.doc_subtitle, align="C")
        self.ln(10)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(*ACCENT)
        self.cell(0, 8, "Credit91 -- Loan Origination & Management System", align="C", ln=1)
        self.set_text_color(*GRAY)
        self.set_font("Helvetica", "", 10)
        self.cell(0, 8, "Next.js 16 + TypeScript + Supabase (Postgres / Auth / Storage) + Vercel", align="C", ln=1)

    def h1(self, text, number=None):
        self.add_page()
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*NAVY)
        label = f"{number}. {text}" if number else text
        self.cell(0, 12, label, ln=1)
        self.set_draw_color(*ACCENT)
        self.set_line_width(0.8)
        self.line(18, self.get_y(), 60, self.get_y())
        self.set_line_width(0.2)
        self.ln(6)

    def h2(self, text):
        self.set_x(self.l_margin)
        self.ln(2)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*NAVY)
        self.cell(0, 9, text, ln=1)
        self.set_x(self.l_margin)
        self.ln(1)

    def body(self, text):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10.5)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 6, text)
        self.set_x(self.l_margin)
        self.ln(1)

    def bullet(self, text):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10.5)
        self.set_text_color(30, 30, 30)
        x = self.get_x()
        self.cell(5, 6, "-", ln=0)
        self.set_x(x + 5)
        self.multi_cell(0, 6, text)
        self.set_x(self.l_margin)

    def code(self, text):
        self.set_x(self.l_margin)
        self.set_font("Courier", "", 9.5)
        self.set_text_color(40, 40, 40)
        self.set_fill_color(*LIGHT)
        self.multi_cell(0, 5.5, text, fill=True)
        self.set_x(self.l_margin)
        self.ln(1)

    def note(self, text):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "I", 9.5)
        self.set_text_color(*GRAY)
        self.set_fill_color(*LIGHT)
        self.multi_cell(0, 6, text, fill=True)
        self.set_x(self.l_margin)
        self.ln(1)

    def _draw_table_header(self, headers, widths):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 9.5)
        self.set_fill_color(*NAVY)
        self.set_text_color(255, 255, 255)
        for h, w in zip(headers, widths):
            self.cell(w, 8, h, border=0, fill=True)
        self.ln()

    def table(self, headers, rows, widths):
        # Auto page breaks are handled manually per-row below so a row's cells
        # never get split across a page boundary by FPDF's own mid-cell break
        # (which also clobbers font state via the header() callback).
        self.set_auto_page_break(auto=False)
        self._draw_table_header(headers, widths)
        fill = False
        for row in rows:
            self.set_font("Helvetica", "", 9)
            max_lines = 1
            for cell_text, w in zip(row, widths):
                max_lines = max(max_lines, self._line_count(str(cell_text), w))
            row_h = 5.2 * max_lines

            if self.get_y() + row_h > self.page_break_trigger:
                self.add_page()
                self._draw_table_header(headers, widths)

            self.set_font("Helvetica", "", 9)
            self.set_text_color(30, 30, 30)
            self.set_fill_color(*LIGHT if fill else (255, 255, 255))
            y0 = self.get_y()
            x0 = self.get_x()
            for cell_text, w in zip(row, widths):
                x = self.get_x()
                y = self.get_y()
                self.rect(x, y, w, row_h, style="F")
                self.multi_cell(w, 5.2, str(cell_text), border=0, align="L")
                self.set_xy(x + w, y)
            self.set_xy(x0, y0 + row_h)
            fill = not fill
        self.set_auto_page_break(auto=True, margin=18)
        self.ln(2)

    def _line_count(self, text, width):
        # crude estimate of wrapped line count for row-height calc
        self.set_font("Helvetica", "", 9)
        words = text.split(" ")
        lines = 1
        cur = ""
        max_w = width - 2
        for w in words:
            trial = (cur + " " + w).strip()
            if self.get_string_width(trial) > max_w:
                lines += 1
                cur = w
            else:
                cur = trial
        return lines

    def box(self, x, y, w, h, label, fill=LIGHT, text_color=(20, 20, 20)):
        self.set_draw_color(*ACCENT)
        self.set_fill_color(*fill)
        self.rect(x, y, w, h, style="DF")
        n_lines = label.count("\n") + 1
        line_h = 5
        start_y = y + max(2, (h - n_lines * line_h) / 2)
        self.set_xy(x, start_y)
        self.set_font("Helvetica", "B", 9.5)
        self.set_text_color(*text_color)
        self.multi_cell(w, line_h, label, align="C")
        self.set_x(self.l_margin)

    def arrow(self, x1, y1, x2, y2):
        self.set_draw_color(*GRAY)
        self.line(x1, y1, x2, y2)


# =============================================================================
# HLD
# =============================================================================
hld = DocPDF("HLD", "Credit91 - High-Level Design")
hld.title_page()

hld.h1("Overview", 1)
hld.body(
    "Credit91 is a Loan Origination System (LOS) and Loan Management System (LMS) "
    "built as a single Next.js application backed by Supabase. It covers the full "
    "lifecycle of an unsecured loan: an applicant submits a loan application, an "
    "underwriter reviews and decides on it, and on acceptance a loan is disbursed "
    "with a generated repayment schedule that the applicant pays down over time, "
    "including an admin-facing collections and interest-accrual workflow for "
    "loans that fall behind."
)
hld.note(
    "Constraints pitch: Given assessment time and cost constraints, external "
    "integrations (credit bureau, payment gateway, notifications) were mocked and "
    "the scheduled interest-accrual job was implemented as an admin-triggered "
    "action performing identical calculation logic; in production these would be "
    "replaced with a real bureau API, payment webhook handler, and a cron-based "
    "worker (e.g. Vercel Cron or a queue consumer) with no change to the core "
    "domain logic. Email confirmation was disabled to stay within Supabase's "
    "free-tier email rate limits; in production this would go through a "
    "transactional email provider (e.g. Resend, SES) with confirmation required "
    "before first login."
)

hld.h1("Architecture", 2)
hld.h2("Stack")
hld.table(
    ["Layer", "Choice", "Rationale"],
    [
        ["App", "Next.js 16 (App Router, TypeScript)", "One codebase for pages + API routes; no CORS, no separate backend"],
        ["DB / Auth / Storage", "Supabase (Postgres, Auth, Storage)", "One free account replaces 3 separate services"],
        ["Hosting", "Vercel", "Deploys the Next.js app directly from GitHub"],
        ["Interest accrual", "Admin-triggered 'Run Accrual' action", "Same calculation a scheduled job would run, without cron setup"],
        ["Credit check / payments", "Mocked API routes", "No external accounts, keys, or cost"],
    ],
    [35, 60, 87],
)

hld.h2("System diagram")
y0 = hld.get_y() + 2
box_h = 24
hld.box(20, y0, 45, box_h, "Browser\n(Applicant / Underwriter)")
hld.box(85, y0, 50, box_h, "Next.js on Vercel\n(pages + /api routes)")
hld.box(155, y0, 35, box_h, "Supabase\n(Postgres, Auth,\nStorage)")
mid_y = y0 + box_h / 2
hld.arrow(65, mid_y, 85, mid_y)
hld.arrow(135, mid_y, 155, mid_y)
hld.set_y(y0 + box_h + 6)
hld.note(
    "The browser talks only to the Next.js app. Server Components and Route "
    "Handlers use a Supabase client authenticated with the caller's session "
    "cookie, so every query is evaluated under Postgres Row Level Security -- "
    "there is no separate authorization layer to keep in sync with the database."
)

hld.h1("Roles & Security Model", 3)
hld.body(
    "There are exactly two roles, stored on a profiles.role column populated at "
    "signup: applicant and underwriter. A Postgres trigger (handle_new_user) "
    "creates the profiles row automatically from signup metadata, so the "
    "application code never has to synchronize roles by hand."
)
hld.bullet("Applicants can only see and act on their own applications, documents, credit checks, loans, and payments.")
hld.bullet("Underwriters can read every application, run decisions, and view the full audit log and collections list.")
hld.bullet(
    "Both the database (Row Level Security policies) and the API routes enforce "
    "this -- the API layer checks profile.role before allowing an action, and RLS "
    "enforces it again at the data layer, so a bug in one layer doesn't expose data."
)

hld.h1("Data Flow", 4)
hld.h2("Applicant journey")
hld.body(
    "Sign up (role=applicant) -> submit application (income, employment, amount, "
    "tenure) -> upload ID proof document -> trigger mock credit check -> wait for "
    "underwriter decision -> if approved, accept offer (creates Loan + "
    "amortization schedule, instantly 'disbursed') -> view repayment schedule -> "
    "Simulate Payment against the next due installment."
)
hld.h2("Underwriter journey")
hld.body(
    "Sign up (role=underwriter) -> see all submitted applications with credit "
    "score -> open an application -> approve (set amount/rate/tenure) or reject "
    "(with reason) -> Collections screen lists loans with installments past "
    "their due date -> Run Accrual applies a late-payment penalty and flags the "
    "loan delinquent."
)

hld.h1("Scope Cuts", 5)
hld.h2("In scope")
for item in [
    "Signup/login with applicant + underwriter roles",
    "Application form and status tracking",
    "Document upload (Supabase Storage, one file type)",
    "Mocked credit score generator",
    "Underwriter approve/reject with custom rate & tenure",
    "Loan creation + reducing-balance amortization schedule",
    "Simulated repayments and balance reduction",
    "Collections list + manual interest-accrual trigger",
    "Audit log on every key action",
    "Row Level Security on every table",
]:
    hld.bullet(item)
hld.h2("Out of scope (deliberate cuts)")
for item in [
    "Escrow management",
    "Real payment gateway / webhook handling",
    "Real credit bureau integration",
    "Email/SMS notifications (including signup confirmation email)",
    "Multi-document KYC / OCR verification",
    "Fine-grained RBAC beyond the two roles",
    "A real scheduled cron job for interest accrual",
]:
    hld.bullet(item)

hld.h1("Deployment View", 6)
hld.body(
    "The application is a single Vercel project built from the GitHub repository "
    "main branch. Two environment variables (NEXT_PUBLIC_SUPABASE_URL, "
    "NEXT_PUBLIC_SUPABASE_ANON_KEY) connect it to the Supabase project. The "
    "Supabase schema, RLS policies, and storage bucket are provisioned by a "
    "single SQL migration file (supabase/migrations/0001_init.sql) that is run "
    "once via the Supabase SQL Editor. A seed script (scripts/seed.ts) can "
    "populate demo accounts and loans in various states for a live walkthrough."
)
hld.note("Live URL: [add your Vercel deployment URL here once deployed]")

hld.output("/Users/developer/Desktop/credit91/docs/HLD.pdf")

# =============================================================================
# LLD
# =============================================================================
lld = DocPDF("LLD", "Credit91 - Low-Level Design")
lld.title_page()

lld.h1("Data Model", 1)
lld.body("All tables live in the public schema. profiles is 1:1 with Supabase's built-in auth.users.")

lld.h2("profiles")
lld.table(["Column", "Type", "Notes"], [
    ["id", "uuid, PK", "= auth.users.id"],
    ["role", "text", "'applicant' | 'underwriter'"],
    ["full_name", "text", ""],
    ["created_at", "timestamptz", "default now()"],
], [40, 40, 102])

lld.h2("applications")
lld.table(["Column", "Type", "Notes"], [
    ["id", "uuid, PK", "default gen_random_uuid()"],
    ["user_id", "uuid, FK -> profiles", ""],
    ["status", "text", "submitted | approved | rejected | accepted | disbursed"],
    ["income", "numeric(14,2)", ""],
    ["employment_info", "text", ""],
    ["requested_amount", "numeric(14,2)", ""],
    ["requested_tenure_months", "int", "> 0"],
    ["created_at / updated_at", "timestamptz", ""],
], [40, 40, 102])

lld.h2("documents, credit_checks")
lld.table(["Table", "Key columns"], [
    ["documents", "id, application_id (FK), file_url, type, uploaded_at"],
    ["credit_checks", "id, application_id (FK), score (300-900), checked_at"],
], [40, 142])

lld.h2("decisions")
lld.table(["Column", "Type", "Notes"], [
    ["application_id", "uuid, FK, UNIQUE", "one decision per application"],
    ["decision", "text", "'approved' | 'rejected'"],
    ["approved_amount / interest_rate / tenure_months", "numeric / int", "set only when approved"],
    ["decided_by", "uuid, FK -> profiles", "underwriter"],
    ["reason", "text", "required by UI when rejecting"],
], [70, 40, 72])

lld.h2("loans, repayment_schedule, payments")
lld.table(["Table", "Key columns"], [
    ["loans", "id, application_id (FK, UNIQUE), principal, interest_rate, tenure_months, outstanding_balance, status (active|delinquent|closed), disbursed_at"],
    ["repayment_schedule", "id, loan_id (FK), installment_no, due_date, amount_due, principal_component, interest_component, status (due|paid|overdue). UNIQUE(loan_id, installment_no)"],
    ["payments", "id, loan_id (FK), schedule_id (FK), amount, paid_at"],
], [35, 147])

lld.h2("audit_log")
lld.body("id, entity, entity_id, action, actor_id, details (jsonb), created_at -- one row inserted on every key action (submit, credit check, decision, upload, disbursement, payment, accrual).")

lld.h1("State Machines", 2)
lld.h2("Application.status")
lld.code("submitted -> approved -> accepted -> disbursed\n           -> rejected  (terminal)")
lld.note(
    "'accepted' and 'disbursed' collapse into a single step today: accepting an "
    "offer disburses immediately since there is no real payment rail to wait on. "
    "In production these would separate, with 'accepted' waiting on a "
    "disbursement-confirmation webhook before moving to 'disbursed'."
)
lld.h2("Loan.status")
lld.code("active -> delinquent   (has one or more overdue installments)\nactive -> closed       (every installment paid)")
lld.h2("repayment_schedule.status")
lld.code("due -> paid      (a payment is simulated against it)\ndue -> overdue   (due_date has passed with no payment, flagged by Run Accrual)")

lld.h1("API Specification", 3)
lld.table(["Method", "Route", "Notes"], [
    ["POST", "/api/applications", "applicant creates an application"],
    ["GET", "/api/applications", "list -- own rows (applicant) or all (underwriter)"],
    ["GET", "/api/applications/[id]", "single application with joins"],
    ["POST", "/api/applications/[id]/documents", "multipart upload to Supabase Storage"],
    ["POST", "/api/applications/[id]/credit-check", "mock score generator"],
    ["PATCH", "/api/applications/[id]/decision", "underwriter only: approve/reject"],
    ["POST", "/api/applications/[id]/accept-offer", "creates Loan + schedule"],
    ["GET", "/api/loans/[id]/schedule", "schedule + payments for a loan"],
    ["POST", "/api/loans/[id]/payments", "simulate paying next/specific installment"],
    ["POST", "/api/loans/[id]/run-accrual", "underwriter only: flag overdue + apply penalty"],
    ["GET", "/api/admin/collections", "underwriter only: loans with a missed due date"],
], [22, 68, 92])
lld.note(
    "Auth itself (signUp, signInWithPassword, signOut) goes directly through the "
    "Supabase client SDK from the browser -- there are no custom /api/auth/* routes."
)

lld.h1("Core Algorithms", 4)
lld.h2("Amortization (lib/amortization.ts)")
lld.body(
    "Standard reducing-balance EMI. Given principal P, nominal annual rate "
    "annualPct, and tenure n months:"
)
lld.code(
    "monthlyRate r = annualPct / 100 / 12\n"
    "EMI = P * r * (1+r)^n / ((1+r)^n - 1)          (r = 0 => EMI = P / n)\n\n"
    "For each installment i = 1..n:\n"
    "  interest_i  = round(balance * r)\n"
    "  principal_i = min(EMI - interest_i, balance)   (last installment = remaining balance)\n"
    "  amount_due  = principal_i + interest_i\n"
    "  balance    -= principal_i"
)
lld.body(
    "All money math is done in integer cents to avoid floating-point drift, and "
    "the final installment absorbs any rounding remainder so the balance always "
    "reaches exactly zero. Verified example (tested against this build): "
    "P=100,000, annual rate 10%, 12 months -> EMI = 8,791.59 for installments "
    "1-11, and 8,791.56 for installment 12 (absorbing the 3-cent rounding "
    "remainder). Covered by 7 unit tests in lib/amortization.test.ts, including "
    "a hand/calculator-verified EMI check, a 0% interest edge case, and a "
    "full-amortization balance check."
)

lld.h2("Interest accrual (POST /api/loans/[id]/run-accrual)")
lld.body(
    "For the given loan, find every repayment_schedule row with due_date in the "
    "past and status in (due, overdue). For each: apply a 2% late-payment "
    "penalty on that installment's amount_due, add it to the loan's "
    "outstanding_balance, and mark the row 'overdue'. Mark the loan 'delinquent'. "
    "Verified example: a loan with 2 overdue installments and a $60,000.00 "
    "balance moved to $60,416.50 after one run ($208.25 penalty per "
    "installment x 2)."
)

lld.h2("Payment simulation (POST /api/loans/[id]/payments)")
lld.body(
    "Selects the earliest un-paid installment (or a specific scheduleId), "
    "inserts a payments row for its full amount_due, marks the installment "
    "'paid', and reduces the loan's outstanding_balance by that installment's "
    "principal_component only (the interest portion is not principal, so it "
    "does not reduce the balance further). If no installments remain unpaid, "
    "the loan is marked 'closed'."
)

lld.h1("Row Level Security Summary", 5)
lld.body(
    "A SECURITY DEFINER helper function my_role() reads the caller's role from "
    "profiles without re-triggering RLS recursively. Every table's policies "
    "follow the same shape:"
)
lld.code(
    "USING ( <row belongs to auth.uid()> OR my_role() = 'underwriter' )"
)
lld.bullet("profiles: read own row, or any row if underwriter (needed to show applicant names on the underwriter dashboard).")
lld.bullet("applications / documents / credit_checks / decisions / loans / repayment_schedule / payments: visible/writable if the row traces back (directly or via a join to applications) to the caller's own user_id, or the caller is an underwriter.")
lld.bullet("audit_log: any authenticated user may insert their own action; only underwriters may read it.")
lld.bullet("storage.objects (bucket 'documents'): files are stored under `${application_id}/filename`; the same ownership check is applied by parsing the folder name back to an applications row.")

lld.output("/Users/developer/Desktop/credit91/docs/LLD.pdf")

print("Wrote HLD.pdf and LLD.pdf")
