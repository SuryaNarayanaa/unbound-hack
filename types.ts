export interface Command {
  _id: string;
  user_id: string;
  command_text: string;
  status: "pending" | "executed" | "rejected" | "needs_approval";
  matched_rule_id?: string;
  cost: number;
  created_at: number;
  executed_at?: number;
  rejection_reason?: string;
}

export interface Rule {
  _id: string;
  pattern: string;
  action: "AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL";
  priority: number;
  enabled: boolean;
  cost?: number;
  created_by?: string;
  created_at: number;
}

export interface User {
  id: string;
  name: string;
  role: "admin" | "member";
  credits: number;
  created_at?: number;
}

export interface AuditLog {
  _id: string;
  user_id: string;
  command_id?: string;
  event_type: "COMMAND_SUBMITTED" | "COMMAND_EXECUTED" | "COMMAND_REJECTED" | "RULE_CREATED" | "USER_CREATED" | "CREDITS_UPDATED";
  details: any;
  created_at: number;
}

