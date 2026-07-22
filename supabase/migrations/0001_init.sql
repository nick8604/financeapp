-- LOS/LMS core schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users, adds the applicant/underwriter role)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('applicant', 'underwriter')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up. The role is passed in
-- via signUp(..., { data: { role, full_name } }) as user metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'applicant'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used inside RLS policies to check the caller's role without
-- recursively re-evaluating profiles' own RLS.
create function public.my_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected', 'accepted', 'disbursed')),
  income numeric(14, 2) not null,
  employment_info text not null,
  requested_amount numeric(14, 2) not null,
  requested_tenure_months integer not null check (requested_tenure_months > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_idx on public.applications (user_id);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  file_url text not null,
  type text not null default 'id_proof',
  uploaded_at timestamptz not null default now()
);

create index documents_application_id_idx on public.documents (application_id);

-- ---------------------------------------------------------------------------
-- credit_checks (mocked score generator)
-- ---------------------------------------------------------------------------
create table public.credit_checks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  score integer not null check (score between 300 and 900),
  checked_at timestamptz not null default now()
);

create index credit_checks_application_id_idx on public.credit_checks (application_id);

-- ---------------------------------------------------------------------------
-- decisions (underwriter approve/reject + terms)
-- ---------------------------------------------------------------------------
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  approved_amount numeric(14, 2),
  interest_rate numeric(5, 2),
  tenure_months integer,
  decided_by uuid not null references public.profiles (id),
  reason text,
  decided_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- loans
-- ---------------------------------------------------------------------------
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  principal numeric(14, 2) not null,
  interest_rate numeric(5, 2) not null,
  tenure_months integer not null,
  outstanding_balance numeric(14, 2) not null,
  status text not null default 'active' check (status in ('active', 'delinquent', 'closed')),
  disbursed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- repayment_schedule
-- ---------------------------------------------------------------------------
create table public.repayment_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  amount_due numeric(14, 2) not null,
  principal_component numeric(14, 2) not null,
  interest_component numeric(14, 2) not null,
  status text not null default 'due' check (status in ('due', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  unique (loan_id, installment_no)
);

create index repayment_schedule_loan_id_idx on public.repayment_schedule (loan_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  schedule_id uuid not null references public.repayment_schedule (id) on delete cascade,
  amount numeric(14, 2) not null,
  paid_at timestamptz not null default now()
);

create index payments_loan_id_idx on public.payments (loan_id);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references public.profiles (id),
  details jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.documents enable row level security;
alter table public.credit_checks enable row level security;
alter table public.decisions enable row level security;
alter table public.loans enable row level security;
alter table public.repayment_schedule enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

-- profiles: everyone can read their own row; underwriters can read all
-- (needed to show applicant names on the underwriter dashboard).
create policy "profiles_select_own_or_underwriter"
  on public.profiles for select
  using (id = auth.uid() or public.my_role() = 'underwriter');

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- applications: applicants see/manage their own; underwriters see/manage all.
create policy "applications_select"
  on public.applications for select
  using (user_id = auth.uid() or public.my_role() = 'underwriter');

create policy "applications_insert_own"
  on public.applications for insert
  with check (user_id = auth.uid());

create policy "applications_update"
  on public.applications for update
  using (user_id = auth.uid() or public.my_role() = 'underwriter');

-- documents: visible/insertable by the owning applicant or any underwriter.
create policy "documents_select"
  on public.documents for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

create policy "documents_insert"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = documents.application_id and a.user_id = auth.uid()
    )
  );

-- credit_checks: same visibility pattern as documents.
create policy "credit_checks_select"
  on public.credit_checks for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = credit_checks.application_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

create policy "credit_checks_insert"
  on public.credit_checks for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = credit_checks.application_id and a.user_id = auth.uid()
    )
  );

-- decisions: underwriters create; applicant + underwriter can read.
create policy "decisions_select"
  on public.decisions for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = decisions.application_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

create policy "decisions_insert_underwriter"
  on public.decisions for insert
  with check (public.my_role() = 'underwriter' and decided_by = auth.uid());

-- loans: applicant (via their application) creates on accept-offer; both roles read.
create policy "loans_select"
  on public.loans for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = loans.application_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

create policy "loans_insert_own_application"
  on public.loans for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = loans.application_id and a.user_id = auth.uid()
    )
  );

create policy "loans_update"
  on public.loans for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = loans.application_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

-- repayment_schedule: same visibility as the parent loan; insert alongside
-- loan creation, update on payment/accrual by either party.
create policy "schedule_select"
  on public.repayment_schedule for select
  using (
    exists (
      select 1 from public.loans l
      join public.applications a on a.id = l.application_id
      where l.id = repayment_schedule.loan_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

create policy "schedule_insert"
  on public.repayment_schedule for insert
  with check (
    exists (
      select 1 from public.loans l
      join public.applications a on a.id = l.application_id
      where l.id = repayment_schedule.loan_id and a.user_id = auth.uid()
    )
  );

create policy "schedule_update"
  on public.repayment_schedule for update
  using (
    exists (
      select 1 from public.loans l
      join public.applications a on a.id = l.application_id
      where l.id = repayment_schedule.loan_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

-- payments: applicant records their own payments; underwriter reads all.
create policy "payments_select"
  on public.payments for select
  using (
    exists (
      select 1 from public.loans l
      join public.applications a on a.id = l.application_id
      where l.id = payments.loan_id
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );

create policy "payments_insert"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.loans l
      join public.applications a on a.id = l.application_id
      where l.id = payments.loan_id and a.user_id = auth.uid()
    )
  );

-- audit_log: any authenticated user can append; only underwriters browse the
-- full log (applicants have no UI for it, so read access is admin-only).
create policy "audit_log_insert"
  on public.audit_log for insert
  with check (actor_id = auth.uid());

create policy "audit_log_select_underwriter"
  on public.audit_log for select
  using (public.my_role() = 'underwriter');

-- ---------------------------------------------------------------------------
-- Storage bucket for the single "id_proof" document type
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Files are stored under `${application_id}/${filename}`. Ownership is
-- resolved by checking the application row, same as the documents table above.
create policy "storage_documents_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[1]
        and a.user_id = auth.uid()
    )
  );

create policy "storage_documents_select"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[1]
        and (a.user_id = auth.uid() or public.my_role() = 'underwriter')
    )
  );
