export type Role = "applicant" | "underwriter";

export type ApplicationStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "accepted"
  | "disbursed";

export type DecisionType = "approved" | "rejected";

export type LoanStatus = "active" | "delinquent" | "closed";

export type ScheduleStatus = "due" | "paid" | "overdue";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  income: number;
  employment_info: string;
  requested_amount: number;
  requested_tenure_months: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  file_url: string;
  type: string;
  uploaded_at: string;
}

export interface CreditCheck {
  id: string;
  application_id: string;
  score: number;
  checked_at: string;
}

export interface Decision {
  id: string;
  application_id: string;
  decision: DecisionType;
  approved_amount: number | null;
  interest_rate: number | null;
  tenure_months: number | null;
  decided_by: string;
  reason: string | null;
  decided_at: string;
}

export interface Loan {
  id: string;
  application_id: string;
  principal: number;
  interest_rate: number;
  tenure_months: number;
  outstanding_balance: number;
  status: LoanStatus;
  disbursed_at: string;
}

export interface RepaymentInstallment {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  amount_due: number;
  principal_component: number;
  interest_component: number;
  status: ScheduleStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  loan_id: string;
  schedule_id: string;
  amount: number;
  paid_at: string;
}

export interface AuditLogEntry {
  id: string;
  entity: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
