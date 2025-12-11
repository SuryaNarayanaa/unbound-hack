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
  output?: string;
  escalation_at?: number;
  escalated?: boolean;
  escalation_action?: "AUTO_ACCEPT" | "AUTO_REJECT";
}

export interface TimeWindow {
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_hour: number; // 0-23
  start_minute: number; // 0-59
  end_hour: number; // 0-23
  end_minute: number; // 0-59
  timezone?: string; // Timezone (e.g., "America/New_York"), defaults to UTC
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
  // Escalation fields
  escalation_enabled?: boolean;
  escalation_delay_ms?: number;
  escalation_action?: "AUTO_ACCEPT" | "AUTO_REJECT";
  // Time-based scheduling fields
  schedule_type?: "always" | "time_windows" | "cron";
  time_windows?: TimeWindow[];
  cron_expression?: string;
  cron_timezone?: string;
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
  event_type: "COMMAND_SUBMITTED" | "COMMAND_EXECUTED" | "COMMAND_REJECTED" | "RULE_CREATED" | "USER_CREATED" | "CREDITS_UPDATED" | "COMMAND_ESCALATED";
  details: any;
  created_at: number;
}

