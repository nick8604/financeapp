# Credit91 — LOS/LMS

A Loan Origination System + Loan Management System, built as a single
Next.js app with Supabase (Postgres + Auth + Storage) and deployed on Vercel.
Zero-cost stack — no credit card required for any piece.

## Stack

| Layer               | Choice                                    |
| ------------------- | ------------------------------------------ |
| App                 | Next.js 16 (App Router) + TypeScript, one codebase for pages + API routes |
| DB + Auth + Storage | Supabase free tier (Postgres, built-in auth, file storage) |
| Hosting             | Vercel free tier |
| Interest accrual    | Admin-triggered "Run Accrual" button (same calculation a scheduled job would run) |
| Credit check / payments | Mocked (`lib/mockCreditScore.ts`, "Simulate Payment" button) — no external accounts |

See the one-line constraints pitch at the bottom of this file for the HLD.

## What's built

- Signup/login via Supabase Auth, with an `applicant` / `underwriter` role chosen at signup
- Application form (income, employment, requested amount/tenure)
- Document upload (Supabase Storage, one file type: `id_proof`)
- Mock credit score generator
- Underwriter dashboard: list applications, approve/reject + set rate & tenure
- Accept-offer flow: on approval + applicant acceptance, creates a `Loan` and generates a reducing-balance amortization schedule
- Applicant loan view: repayment schedule + "Simulate Payment"
- Admin collections list (loans with a missed due date) + "Run Accrual" button
- Audit log: a row inserted on every key action (application submitted, decision made, document uploaded, payment simulated, accrual run)
- Row Level Security on every table — applicants only ever see their own rows, underwriters see everything

## Data model

See `supabase/migrations/0001_init.sql` for the full schema, constraints, and
RLS policies: `profiles`, `applications`, `documents`, `credit_checks`,
`decisions`, `loans`, `repayment_schedule`, `payments`, `audit_log`.

**Application status state machine:**
`submitted` → `approved` | `rejected` → `accepted` → `disbursed`

(`accepted` and `disbursed` collapse into a single step today — accepting an
offer disburses immediately since there's no real payment rail to wait on. A
production system would separate them and wait for a disbursement
confirmation webhook.)

**Loan status:** `active` → `delinquent` (has overdue installments) → `closed` (fully paid)

**Amortization formula** (`lib/amortization.ts`, unit-tested in
`lib/amortization.test.ts`): standard reducing-balance EMI —
`EMI = P × r × (1+r)^n / ((1+r)^n − 1)` where `r` is the monthly rate. All
money math is done in integer cents to avoid float drift, and the final
installment absorbs any rounding remainder so the balance always reaches
exactly zero.

## API routes

```
POST   /api/applications
GET    /api/applications
GET    /api/applications/[id]
POST   /api/applications/[id]/documents
POST   /api/applications/[id]/credit-check      (mock)
PATCH  /api/applications/[id]/decision           (underwriter only)
POST   /api/applications/[id]/accept-offer       (creates Loan + schedule)

GET    /api/loans/[id]/schedule
POST   /api/loans/[id]/payments                  (simulate payment)
POST   /api/loans/[id]/run-accrual                (manual trigger, underwriter only)
GET    /api/admin/collections
```

Auth itself (`signUp`, `signInWithPassword`, `signOut`) goes straight through
the Supabase client SDK from the browser — no custom `/api/auth/*` routes.

## Local setup

**1. Create a free Supabase project** — [supabase.com/dashboard](https://supabase.com/dashboard), sign up with GitHub, no card needed.

**2. Run the schema migration** — open the SQL Editor in your Supabase project and paste in the full contents of `supabase/migrations/0001_init.sql`, then run it. This creates every table, the `profiles` auto-provisioning trigger, RLS policies, and the `documents` storage bucket.

**3. (Recommended) Disable email confirmation for the demo** — Authentication → Providers → Email → turn off "Confirm email", so signup logs you straight in without a real inbox.

**4. Copy environment variables:**

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
Project Settings → API. (`SUPABASE_SERVICE_ROLE_KEY` is only needed if you
want to run the seed script — see below.)

**5. Install and run:**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up once as an
`underwriter` and once as an `applicant` (two different browsers/incognito
windows, or sign out/in) to see both sides of the flow.

**6. Run the unit tests** (the amortization formula is the one place a bug
would look bad — this is checked against a hand-verified EMI):

```bash
npm test
```

**7. (Optional) Seed demo data** — creates one underwriter and three
applicants (pending / active mid-repayment / delinquent) via SQL directly,
so the live URL looks alive without manual clicking. Requires the
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`:

```bash
npm run seed
```

Demo logins (password `Password123!`): `underwriter@demo.local`,
`pending@demo.local`, `active@demo.local`, `delinquent@demo.local`.

## Deploying

1. Push this repo to GitHub.
2. Import it on [vercel.com/new](https://vercel.com/new) (free tier, sign up with GitHub).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project settings.
4. Deploy — Vercel builds and gives you a live URL in a couple of minutes.

## Out of scope (mentioned, not built)

Escrow management, a real payment gateway/webhook, real credit bureau
integration, notifications (email/SMS), multi-document KYC/OCR, fine-grained
RBAC beyond the two roles above, and a real scheduled cron job.

## Constraints (for the HLD)

> Given assessment time and cost constraints, external integrations (credit
> bureau, payment gateway, notifications) were mocked and the scheduled
> interest-accrual job was implemented as an admin-triggered action
> performing identical calculation logic; in production these would be
> replaced with a real bureau API, payment webhook handler, and a cron-based
> worker (e.g. Vercel Cron or a queue consumer) with no change to the core
> domain logic.
