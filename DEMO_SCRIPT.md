# Command Gateway Application - Demo Script

## Introduction (30 seconds)

"Welcome! Today I'm going to demonstrate the Command Gateway application - a sophisticated command management and processing system. This application allows users to submit commands that are automatically evaluated against configurable rules, with features like automatic approval, manual approval workflows, voting systems, escalation, and time-based scheduling.

Let me walk you through the key features and show you how it all works together."

---

## Feature 1: Basic Authentication & User Management (1 minute)

"First, let's look at authentication. The system uses API key-based authentication - secure and simple. Users authenticate using API keys that are hashed before storage.

As an admin, I can create new users and assign them roles - either 'admin' or 'member'. Each user gets a unique API key when created, and I can manage their credit balances. Credits are used to execute commands - think of it as a usage-based billing system.

Let me create a test user... [create user] There - we now have a new member user with 100 credits. Notice how the API key is only shown once during creation for security."

---

## Feature 2: Rule-Based Command Processing (2 minutes)

"Now, the heart of the system - rule-based command processing. Commands are matched against regex patterns with priority-based evaluation.

Let me create a few rules to demonstrate:

First, I'll create a rule that auto-accepts any command starting with 'list' - this is a safe, read-only operation. [create rule: pattern "^list.*", action AUTO_ACCEPT, priority 10]

Next, a rule that auto-rejects any command containing 'delete' - we want to be careful with destructive operations. [create rule: pattern ".*delete.*", action AUTO_REJECT, priority 5]

And finally, a rule that requires approval for commands starting with 'update' - these need human oversight. [create rule: pattern "^update.*", action REQUIRE_APPROVAL, priority 8]

Notice how priority determines evaluation order - higher priority rules are checked first. This allows fine-grained control over command processing."

---

## Feature 3: Command Submission & Auto-Processing (1 minute)

"Now let's see these rules in action. I'll submit a few commands:

First, 'list files' - this matches our auto-accept rule, so it executes immediately. [submit command] See? Status is 'executed' right away, and credits were deducted.

Next, 'delete all files' - this matches our auto-reject rule. [submit command] The command was immediately rejected, and we can see the rejection reason.

Finally, 'update database' - this requires approval. [submit command] The command is now in 'needs_approval' status, waiting for an admin to review it."

---

## Feature 4: Rule Conflict Detection (1 minute)

"One of the powerful features is rule conflict detection. When creating or editing rules, the system automatically detects potential conflicts.

Let me try to create a rule with a pattern that overlaps with an existing one but has a conflicting action. [attempt to create conflicting rule] 

See these warnings? The system detected:
- An exact duplicate pattern
- Overlapping patterns that might match similar commands
- Conflicting actions - where one rule would accept and another would reject the same command

This helps prevent configuration errors and ensures rule consistency."

---

## Feature 5: User-Tier Rules (1 minute)

"The system supports user-tier rules - rules that only apply to specific users or roles. This is incredibly useful for creating custom workflows.

For example, I can create a rule that only applies to admin users - maybe admins can auto-execute certain commands that regular members need approval for. [create rule with restricted_to_role: admin]

Or I can create a rule specific to a single user - perhaps a VIP user gets special treatment. [create rule with restricted_to_user_id]

When a command is submitted, the system filters rules based on the user's ID and role, ensuring each user only sees rules that apply to them."

---

## Feature 6: Voting Thresholds (2 minutes)

"Now let's talk about the voting system. For commands that require approval, we can enable voting with thresholds.

Let me create a rule that requires approval, but with a voting threshold of 2. [create rule with voting_threshold: 2] This means if 2 admins vote to approve, the command will automatically execute.

Let me submit a command that matches this rule... [submit command] Now it's pending approval.

As an admin, I can vote on this command. Let me cast an 'approve' vote... [cast vote] Currently we have 1 approve vote, but we need 2.

If another admin also votes to approve... [cast another vote] Perfect! The threshold is met, and the command was automatically approved and executed. This enables collaborative decision-making while still maintaining security."

---

## Feature 7: Escalation System (2 minutes)

"One of the most sophisticated features is the escalation system. Commands that require approval can automatically escalate if they're not reviewed within a specified time.

Let me create a rule with escalation enabled. [create rule with escalation_enabled: true, escalation_delay_ms: 60000 (1 minute), escalation_action: AUTO_ACCEPT]

When a command matches this rule and requires approval, the system sets an escalation timestamp. If the command isn't approved or rejected within the delay period, it automatically executes the escalation action.

The system runs a cron job every minute to check for commands that have exceeded their escalation time. This ensures that commands don't get stuck waiting indefinitely - they either get human review or automatically resolve based on the escalation policy.

This is perfect for time-sensitive operations where you want human oversight, but also need a fallback mechanism."

---

## Feature 8: Time-Based Rules (2 minutes)

"The system supports time-based scheduling for rules. Rules can be active all the time, or only during specific time windows, or based on cron expressions.

For example, I can create a rule that's only active during business hours - maybe we want stricter approval requirements outside of 9-to-5. [create rule with schedule_type: time_windows, specifying Monday-Friday 9am-5pm]

Or I can use cron expressions for more complex schedules - like a rule that's only active on weekdays at specific times. [create rule with schedule_type: cron, cron_expression: "0 9 * * 1-5"]

When a command is submitted, the system checks if the matching rule is currently active based on the current time and timezone. This allows for time-based access control and different policies for different times of day or days of the week."

---

## Feature 9: Approval Workflow (1.5 minutes)

"Let's look at the approval workflow. Commands that require approval appear in the approvals page, where admins can review them.

Here we can see all pending approvals. For each command, we can see:
- The command text
- The user who submitted it
- The cost in credits
- When it was created
- If voting is enabled, the current vote counts

I can approve a command with an optional reason... [approve command] Or reject it with a required reason... [reject command]

All of these actions are logged in the audit trail for compliance and tracking."

---

## Feature 10: Audit Logging & Monitoring (1 minute)

"Speaking of audit logs, the system maintains comprehensive audit trails. Every significant action is logged:
- Command submissions, executions, and rejections
- Rule creation, updates, and deletions
- User creation and credit adjustments
- Approvals, rejections, and votes
- Escalations

Admins can filter audit logs by user, event type, or date range. This provides complete visibility into system activity and helps with compliance, debugging, and security monitoring."

---

## Feature 11: Credit System (1 minute)

"The credit system provides usage-based control. Each command costs credits, and users must have sufficient balance to execute commands.

If a user tries to submit a command without enough credits, it's immediately rejected. Admins can adjust user credits at any time - adding credits for payment or removing them for refunds.

The credit balance is displayed prominently in the UI, and credits are deducted when commands are executed or approved."

---

## Feature 12: Dashboard & Analytics (30 seconds)

"The dashboard provides an overview of system activity:
- Total commands submitted
- Commands executed, rejected, and pending
- Success rate
- Recent command history
- Current credit balance

This gives users and admins a quick view of system health and their usage."

---

## Conclusion (30 seconds)

"So to summarize, the Command Gateway application provides:
- Flexible rule-based command processing with regex patterns
- Multiple approval workflows including voting and escalation
- Time-based and user-tier rule restrictions
- Comprehensive audit logging
- Credit-based usage control
- Conflict detection to prevent configuration errors

The system is designed to be both powerful and secure, allowing fine-grained control over command execution while maintaining flexibility for different use cases.

Thank you for your attention! Are there any questions?"

---

## Quick Reference: Demo Flow Checklist

### Setup (Before Demo)
- [ ] Ensure admin user exists and you have the API key
- [ ] Start the application (frontend and backend)
- [ ] Have browser open to dashboard

### During Demo
1. [ ] Show user creation
2. [ ] Create 3-4 rules demonstrating different actions
3. [ ] Submit commands showing auto-accept, auto-reject, and require-approval
4. [ ] Show conflict detection warning
5. [ ] Create user-tier rule
6. [ ] Create rule with voting threshold, submit command, cast votes
7. [ ] Create rule with escalation, submit command, wait for escalation (or explain)
8. [ ] Create time-based rule (explain even if not currently active)
9. [ ] Show approval workflow
10. [ ] Show audit logs
11. [ ] Show credit management
12. [ ] Show dashboard overview

### Tips for Presenting
- Speak clearly and at a moderate pace
- Pause after each feature to let it sink in
- Be ready to answer questions about specific use cases
- If something doesn't work as expected, explain what should happen
- Emphasize the flexibility and power of the rule system
- Highlight security features (API key hashing, audit logs, role-based access)


