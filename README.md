# Command Gateway Application Documentation

**Hosted Application**: https://unbound-hack-ovbx.vercel.app/



use the api key below 


PS C:\Users\rajes\OneDrive\Desktop\unbound>    npx convex run seed:seedAdmin
[CONVEX ?(seed:seedAdmin)] [LOG] '============================================================'
[CONVEX ?(seed:seedAdmin)] [LOG] 'Admin User Created'
[CONVEX ?(seed:seedAdmin)] [LOG] 'Email: admin@example.com'
[CONVEX ?(seed:seedAdmin)] [LOG] 'API Key: 6bf5c4ce5d08e6a825ed07cb3fa802b79ff56a13d71785c86904055a5287190c'
[CONVEX ?(seed:seedAdmin)] [LOG] 'Store this key securely. It cannot be retrieved later.'
[CONVEX ?(seed:seedAdmin)] [LOG] '============================================================'
PS C:\Users\rajes\OneDrive\Desktop\unbound> 









## Table of Contents
1. [Application Overview](#application-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [User Flow](#user-flow)
4. [Admin Management](#admin-management)
5. [Creating a Seed Admin User](#creating-a-seed-admin-user)
6. [Features](#features)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Authentication](#authentication)
10. [Command Processing Flow](#command-processing-flow)
11. [Advanced Features](#advanced-features)
12. [Development Setup](#development-setup)

---

## Application Overview

**Command Gateway** is a sophisticated command management and processing system that allows users to submit commands that are automatically evaluated against configurable rules. The system uses a credit-based model where each command execution costs credits, and rules determine whether commands are automatically accepted, rejected, or require manual approval.

### Key Concepts

- **API Key Authentication**: Users authenticate using API keys (stored as hashed values using SHA-256)
- **Role-Based Access Control**: Two roles - `admin` and `member`
- **Rule-Based Processing**: Commands are matched against regex patterns with priority-based evaluation
- **Credit System**: Commands consume credits, which can be managed by admins
- **Audit Logging**: All significant actions are logged for compliance and debugging
- **Escalation System**: Commands requiring approval can automatically escalate after a delay
- **Voting System**: Admins can vote on commands requiring approval, with configurable thresholds
- **Time-Based Scheduling**: Rules can be scheduled using time windows or cron expressions
- **User-Tier Restrictions**: Rules can be restricted to specific users or roles

---

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Custom components built with Tailwind
- **State Management**: React Context API (AuthContext, ToastContext)
- **Data Fetching**: Convex React hooks (`useQuery`, `useMutation`)
- **Icons**: Lucide React
- **Date Formatting**: date-fns

### Backend
- **Backend Framework**: Convex (serverless backend)
- **Database**: Convex Database (NoSQL)
- **Authentication**: Convex Auth (supports Google OAuth and Password auth, but app uses API keys)
- **API**: RESTful HTTP endpoints via Convex HTTP router + Convex queries/mutations
- **Cron Jobs**: Convex cron jobs for escalation processing

### Key Libraries
- `@convex-dev/auth`: Authentication library
- `convex`: Convex backend SDK
- `date-fns`: Date formatting
- `lucide-react`: Icons
- `clsx` & `tailwind-merge`: Utility functions for styling

---

## User Flow

### 1. Initial Setup & Login

1. **Access the Application**: Navigate to the root URL (`/`)
2. **Login Page**: Users are redirected to `/` (login page) if not authenticated
3. **API Key Entry**: 
   - User enters their API key in the login form
   - Option to "Remember key" (stores in localStorage)
   - Click "Continue" to authenticate
4. **Authentication**:
   - API key is sent to Convex query `queries.getMe`
   - Backend validates the key (hashes it and looks up user)
   - User information is returned (id, name, role, credits)
5. **Dashboard Redirect**: Upon successful authentication, user is redirected to `/dashboard`

### 2. Dashboard Experience

#### For Members:
- **Dashboard Home** (`/dashboard`):
  - View welcome message with credit balance
  - See command statistics (total, executed, rejected, pending)
  - View recent commands (last 5)
  
- **Commands Page** (`/dashboard/commands`):
  - Submit new commands via textarea
  - View command history with filtering by status
  - See command details: text, status, matched rule, cost, timestamp
  - Real-time credit balance display

#### For Admins:
All member features plus:

- **Users Page** (`/dashboard/users`):
  - View all users in a table
  - Create new users (generates API key)
  - Adjust user credits (add/remove)
  - View user roles and creation dates

- **Rules Page** (`/dashboard/rules`):
  - Create new rules with regex patterns
  - Edit existing rules
  - Enable/disable rules
  - Set rule priority, action type, and cost
  - Configure escalation settings
  - Set time-based scheduling (time windows or cron)
  - Restrict rules to specific users or roles
  - Set voting thresholds
  - View all rules sorted by priority
  - Detect rule conflicts

- **Approvals Page** (`/dashboard/approvals`):
  - View all commands requiring approval
  - Approve or reject commands
  - Cast votes on commands (if voting enabled)
  - View vote counts and thresholds
  - See command details and matched rules

- **Audit Logs Page** (`/dashboard/audit`):
  - View comprehensive audit trail
  - Filter by user, event type, date range
  - View detailed log information
  - Track all system events

### 3. Command Submission Flow

1. **User Submits Command**:
   - Enters command text in the Commands page
   - Clicks "Submit Command"

2. **Backend Processing**:
   - Validates user has sufficient credits (early check)
   - Fetches all enabled rules, filtered by:
     - Time-based schedules (time windows or cron)
     - User-tier restrictions (user_id or role)
   - Sorts rules by priority (highest first), then by creation date
   - Matches command text against rule patterns (regex)
   - First matching rule determines action:
     - `AUTO_ACCEPT`: Command is immediately executed, credits deducted
     - `AUTO_REJECT`: Command is rejected
     - `REQUIRE_APPROVAL`: Command status set to "needs_approval"
   - If no rule matches, default is `AUTO_REJECT`
   - For `REQUIRE_APPROVAL`, sets escalation timestamp if escalation enabled
   - Creates command record and audit logs

3. **Response**:
   - User receives feedback about command status
   - Command appears in history with appropriate status badge
   - Credit balance is updated (if executed)

### 4. Approval & Escalation Flow

1. **Commands Requiring Approval**:
   - Commands with status "needs_approval" appear in Approvals page
   - Admins can approve or reject commands
   - If voting is enabled, admins can cast votes
   - When voting threshold is met, command is auto-approved

2. **Escalation**:
   - Cron job runs every minute to check for escalated commands
   - Commands with `escalation_at` timestamp in the past are processed
   - Escalation action (AUTO_ACCEPT or AUTO_REJECT) is applied
   - Credits are deducted if escalated to AUTO_ACCEPT
   - Audit logs are created for escalation events

### 5. Logout Flow

- User clicks logout button in TopBar
- API key is cleared from localStorage
- User state is reset
- Redirect to login page (`/`)

---

## Admin Management

### Admin Capabilities

Admins have full access to all features and can:

1. **User Management**:
   - Create new users (members or admins)
   - View all users and their details
   - Adjust user credits (add or remove)
   - View user creation dates

2. **Rule Management**:
   - Create, edit, and delete rules
   - Enable/disable rules without deletion
   - Set rule priority (higher priority rules are evaluated first)
   - Define regex patterns for command matching
   - Set rule actions (AUTO_ACCEPT, AUTO_REJECT, REQUIRE_APPROVAL)
   - Assign custom costs per rule
   - Configure escalation settings (delay, action)
   - Set time-based scheduling (time windows or cron expressions)
   - Restrict rules to specific users or roles
   - Set voting thresholds for auto-approval
   - Detect rule conflicts (overlapping patterns, conflicting actions)

3. **Approval Management**:
   - View all commands requiring approval
   - Approve or reject commands with reasons
   - Cast votes on commands (if voting enabled)
   - View vote counts and thresholds

4. **Audit & Monitoring**:
   - View complete audit logs
   - Filter logs by user, event type, or date range
   - Monitor all system activities
   - Track credit adjustments, rule changes, and command executions

5. **Command Oversight**:
   - View all commands from all users (not just their own)
   - See command statuses and matched rules
   - Monitor system usage

### Admin-Only Routes

The following HTTP routes require admin role:
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:userId/credits` - Adjust credits
- `GET /api/rules` - List all rules
- `POST /api/rules` - Create rule
- `PATCH /api/rules/:ruleId` - Update rule
- `DELETE /api/rules/:ruleId` - Delete rule
- `GET /api/audit` - View audit logs

The following Convex queries/mutations require admin role:
- `queries.listUsers` - List all users
- `queries.createUser` - Create new user
- `queries.adjustCredits` - Adjust credits
- `queries.listRules` - List all rules
- `queries.createRule` - Create rule
- `queries.updateRule` - Update rule
- `queries.deleteRule` - Delete rule
- `queries.getAuditLogs` - View audit logs
- `queries.getPendingApprovals` - Get pending approvals
- `queries.approveCommand` - Approve command
- `queries.rejectCommand` - Reject command
- `queries.castVote` - Cast vote on command
- `queries.getVoteCounts` - Get vote counts
- `queries.detectRuleConflicts` - Detect rule conflicts

### Admin UI Pages

- `/dashboard/users` - User management interface
- `/dashboard/rules` - Rule management interface
- `/dashboard/approvals` - Command approval interface
- `/dashboard/audit` - Audit log viewer

All admin pages check user role and show "Access Denied" if user is not an admin.

---

## Creating a Seed Admin User

### Method 1: Using the Seed Function (Recommended)

The application includes a seed function that creates a default admin user. Here's how to use it:

1. **Locate the Seed File**: `convex/seed.ts`

2. **Run the Seed Action**:
   ```bash
   # Using Convex CLI
   npx convex run seed:seedAdmin
   ```

   Or if you have a script set up:
   ```bash
   npm run seed
   ```

3. **Default Admin Credentials**:
   - **Email**: `admin@example.com`
   - **API Key**: Will be displayed in the console output
   - **Role**: `admin`
   - **Name**: "Default Admin"
   - **Initial Credits**: 100

4. **Important**: The API key is only shown once during creation. Make sure to copy it immediately and store it securely.

### Method 2: Manual Creation via API

If you already have an admin user, you can create additional admins via the API:

```bash
curl -X POST https://your-convex-url/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  -d '{
    "name": "New Admin",
    "email": "admin2@example.com",
    "role": "admin",
    "initialCredits": 100
  }'
```

The response will include the new user's API key:
```json
{
  "userId": "...",
  "email": "admin2@example.com",
  "apiKey": "generated_api_key_here"
}
```

### Seed Function Details

The seed function (`convex/seed.ts`) performs the following:

1. Checks if admin user already exists (by email)
2. If exists, skips creation and logs a message
3. If not exists:
   - Generates a secure random API key (64-character hex string)
   - Hashes the API key using SHA-256
   - Creates user record with:
     - Email: `admin@example.com`
     - Role: `admin`
     - Name: "Default Admin"
     - Hashed API key
     - Creation timestamp
   - Initializes user with 100 credits
4. Outputs the API key to console (only time it's visible)

### Security Best Practices

- **Store API Keys Securely**: Never commit API keys to version control
- **Use Environment Variables**: For production, consider using environment variables
- **Rotate Keys Regularly**: Implement a key rotation policy
- **Limit Admin Access**: Only grant admin role to trusted users
- **Monitor Audit Logs**: Regularly review audit logs for suspicious activity

---

## Features

### 1. Authentication & Authorization

- **API Key Authentication**: Secure authentication using API keys (SHA-256 hashed)
- **Role-Based Access Control**: Two-tier system (admin/member)
- **Session Management**: API keys stored in localStorage (optional)
- **Automatic Redirects**: Unauthenticated users redirected to login

### 2. User Management (Admin Only)

- **User Creation**: Create new users with auto-generated API keys
- **User Listing**: View all users with details
- **Credit Management**: Add or remove credits from user accounts
- **Role Assignment**: Assign admin or member roles
- **User Details**: View user creation dates and current credit balances

### 3. Command Processing

- **Command Submission**: Submit commands via web interface or API
- **Rule Matching**: Automatic pattern matching using regex
- **Priority-Based Evaluation**: Rules evaluated by priority (highest first)
- **Time-Based Rule Activation**: Rules can be scheduled using time windows or cron
- **User-Tier Restrictions**: Rules can be restricted to specific users or roles
- **Multiple Actions**:
  - `AUTO_ACCEPT`: Immediate execution
  - `AUTO_REJECT`: Immediate rejection
  - `REQUIRE_APPROVAL`: Manual approval required
- **Credit Deduction**: Automatic credit deduction on execution (not on submission for approval)
- **Insufficient Credits Handling**: Commands rejected if credits insufficient
- **Mocked Execution**: Commands are mocked (output shows what would be executed)

### 4. Rule Management (Admin Only)

- **Rule Creation**: Create rules with regex patterns
- **Rule Editing**: Update existing rules
- **Rule Deletion**: Remove rules
- **Rule Toggle**: Enable/disable rules without deletion
- **Priority Management**: Set rule evaluation order
- **Cost Assignment**: Set custom credit costs per rule
- **Regex Validation**: Real-time regex pattern validation
- **Conflict Detection**: Warns about duplicate patterns and conflicting actions
- **Escalation Configuration**: Set escalation delay and action
- **Time-Based Scheduling**: Configure time windows or cron expressions
- **User-Tier Restrictions**: Restrict rules to specific users or roles
- **Voting Thresholds**: Set voting thresholds for auto-approval

### 5. Credit System

- **Credit Balance**: Each user has a credit balance
- **Automatic Deduction**: Credits deducted on command execution (AUTO_ACCEPT or approved)
- **Admin Adjustment**: Admins can add/remove credits
- **Balance Display**: Real-time credit balance in UI
- **Insufficient Credits**: Commands rejected if balance too low
- **Credit Tracking**: All credit adjustments are logged in audit logs

### 6. Command History

- **Command Listing**: View all submitted commands
- **Status Filtering**: Filter by status (executed, rejected, pending, needs_approval)
- **Command Details**: View full command text, status, matched rule, cost, timestamps
- **User-Specific View**: Members see only their commands
- **Admin View**: Admins see all commands from all users
- **Real-Time Updates**: Refresh to see latest commands

### 7. Approval Workflow (Admin Only)

- **Pending Approvals**: View all commands requiring approval
- **Approve/Reject**: Approve or reject commands with reasons
- **Voting System**: Cast votes on commands (if voting enabled)
- **Vote Thresholds**: Auto-approve when threshold is met
- **Vote Tracking**: View vote counts and individual votes
- **Credit Validation**: Ensures sufficient credits before approval

### 8. Escalation System

- **Automatic Escalation**: Commands requiring approval can escalate after a delay
- **Configurable Delay**: Set escalation delay per rule (in milliseconds)
- **Escalation Actions**: AUTO_ACCEPT or AUTO_REJECT on escalation
- **Cron Processing**: Escalations processed every minute via cron job
- **Audit Logging**: All escalations are logged

### 9. Audit Logging

- **Comprehensive Logging**: All significant events logged
- **Event Types**:
  - `COMMAND_SUBMITTED`: Command submitted for processing
  - `COMMAND_EXECUTED`: Command successfully executed
  - `COMMAND_REJECTED`: Command rejected
  - `COMMAND_ESCALATED`: Command escalated after delay
  - `COMMAND_APPROVED`: Command approved by admin
  - `COMMAND_REJECTED_BY_APPROVER`: Command rejected by admin
  - `VOTE_CAST`: Vote cast on command
  - `RULE_CREATED`: New rule created
  - `RULE_UPDATED`: Rule modified
  - `RULE_DELETED`: Rule removed
  - `USER_CREATED`: New user created
  - `USER_UPDATED`: User information updated
  - `CREDITS_UPDATED`: Credit balance changed
- **Filtering**: Filter by user, event type, date range
- **Detailed View**: View full log details in modal
- **Admin Only**: Audit logs only accessible to admins

### 10. Dashboard & Analytics

- **Overview Dashboard**: Command statistics and recent activity
- **Statistics Cards**: Total commands, executed, rejected, pending counts
- **Success Rate**: Percentage of executed commands
- **Recent Commands**: Last 5 commands displayed
- **Credit Display**: Current credit balance prominently shown

### 11. UI/UX Features

- **Responsive Design**: Works on desktop and mobile
- **Toast Notifications**: Success/error feedback
- **Loading States**: Visual feedback during operations
- **Form Validation**: Real-time validation (e.g., regex patterns)
- **Modal Dialogs**: For creating users, adjusting credits, viewing details
- **Status Badges**: Color-coded status indicators
- **Dark Mode Support**: UI adapts to system preferences

### 12. API Features

- **RESTful API**: Standard HTTP methods (GET, POST, PATCH, DELETE)
- **Convex Queries/Mutations**: Direct Convex function calls from frontend
- **API Key Header**: Authentication via `X-API-Key` header
- **Error Handling**: Comprehensive error responses
- **JSON Responses**: All responses in JSON format
- **Query Parameters**: Filtering and pagination support

---

## API Endpoints

### Authentication Required
All endpoints require the `X-API-Key` header:
```
X-API-Key: your_api_key_here
```

### HTTP Endpoints (via Convex HTTP Router)

#### User Endpoints

##### GET /api/me
Get current user information and credit balance.

**Response**:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "role": "admin" | "member",
  "credits": 100
}
```

##### POST /api/users (Admin Only)
Create a new user.

**Request Body**:
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "role": "admin" | "member",
  "initialCredits": 100
}
```

**Response**:
```json
{
  "userId": "user_id",
  "email": "user@example.com",
  "apiKey": "generated_api_key"
}
```

##### PATCH /api/users/:userId/credits (Admin Only)
Adjust user credits.

**Request Body**:
```json
{
  "amount": 50
}
```

**Response**:
```json
{
  "success": true
}
```

#### Command Endpoints

##### POST /api/commands
Submit a new command.

**Request Body**:
```json
{
  "command_text": "list files"
}
```

**Response**:
```json
{
  "commandId": "command_id",
  "status": "executed" | "rejected" | "needs_approval",
  "action": "AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL",
  "cost": 1,
  "matchedRuleId": "rule_id",
  "output": "Execution mocked: would run 'list files'"
}
```

##### GET /api/commands
List commands. Members see only their commands; admins see all.

**Query Parameters**:
- `status` (optional): Filter by status (executed, rejected, pending, needs_approval)

**Response**:
```json
[
  {
    "_id": "command_id",
    "user_id": "user_id",
    "command_text": "list files",
    "status": "executed",
    "matched_rule_id": "rule_id",
    "cost": 1,
    "created_at": 1234567890,
    "executed_at": 1234567890,
    "output": "Execution mocked: would run 'list files'"
  }
]
```

##### GET /api/commands/:commandId
Get a specific command's details.

**Response**: Same as command object in list response.

#### Rule Endpoints (Admin Only)

##### GET /api/rules
List all rules.

**Response**:
```json
[
  {
    "_id": "rule_id",
    "pattern": "^list.*",
    "action": "AUTO_ACCEPT",
    "priority": 10,
    "enabled": true,
    "cost": 1,
    "created_by": "user_id",
    "created_at": 1234567890,
    "escalation_enabled": false,
    "schedule_type": "always",
    "restricted_to_user_id": null,
    "restricted_to_role": null,
    "voting_threshold": null
  }
]
```

##### POST /api/rules
Create a new rule.

**Request Body**:
```json
{
  "pattern": "^list.*",
  "action": "AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL",
  "priority": 10,
  "enabled": true,
  "cost": 1,
  "escalation_enabled": false,
  "escalation_delay_ms": 3600000,
  "escalation_action": "AUTO_ACCEPT" | "AUTO_REJECT",
  "schedule_type": "always" | "time_windows" | "cron",
  "time_windows": [
    {
      "day_of_week": 1,
      "start_hour": 9,
      "start_minute": 0,
      "end_hour": 17,
      "end_minute": 0,
      "timezone": "America/New_York"
    }
  ],
  "cron_expression": "0 9 * * 1-5",
  "cron_timezone": "America/New_York",
  "restricted_to_user_id": "user_id",
  "restricted_to_role": "admin" | "member",
  "voting_threshold": 2
}
```

**Response**:
```json
{
  "ruleId": "rule_id"
}
```

##### PATCH /api/rules/:ruleId
Update an existing rule.

**Request Body** (all fields optional): Same as POST /api/rules

**Response**:
```json
{
  "success": true
}
```

##### DELETE /api/rules/:ruleId
Delete a rule.

**Response**:
```json
{
  "success": true
}
```

#### Audit Endpoints (Admin Only)

##### GET /api/audit
Get audit logs.

**Query Parameters**:
- `userId` (optional): Filter by user ID
- `eventType` (optional): Filter by event type
- `from` (optional): Start timestamp
- `to` (optional): End timestamp
- `limit` (optional): Maximum number of results (default: 100)

**Response**:
```json
[
  {
    "_id": "log_id",
    "user_id": "user_id",
    "command_id": "command_id",
    "event_type": "COMMAND_EXECUTED",
    "details": {},
    "created_at": 1234567890
  }
]
```

### Convex Queries/Mutations

The application also exposes Convex queries and mutations that can be called directly from the frontend:

- `queries.getMe` - Get current user info
- `queries.listUsers` - List all users (admin)
- `queries.createUser` - Create user (admin)
- `queries.adjustCredits` - Adjust credits (admin)
- `queries.listRules` - List all rules (admin)
- `queries.createRule` - Create rule (admin)
- `queries.updateRule` - Update rule (admin)
- `queries.deleteRule` - Delete rule (admin)
- `queries.detectRuleConflicts` - Detect rule conflicts (admin)
- `queries.submitCommand` - Submit command
- `queries.listCommands` - List commands
- `queries.getAuditLogs` - Get audit logs (admin)
- `queries.getPendingApprovals` - Get pending approvals (admin)
- `queries.approveCommand` - Approve command (admin)
- `queries.rejectCommand` - Reject command (admin)
- `queries.castVote` - Cast vote (admin)
- `queries.getVoteCounts` - Get vote counts (admin)

---

## Database Schema

### Users Table
```typescript
{
  _id: Id<"users">,
  email?: string,
  emailVerificationTime?: number,
  phone?: string,
  phoneVerificationTime?: number,
  isAnonymous?: boolean,
  name?: string,
  image?: string,
  api_key?: string,  // Hashed API key (SHA-256)
  role?: "admin" | "member",
  created_at?: number,
  updated_at?: number
}
```

**Indexes**:
- `email`: For email lookups
- `by_api_key`: For API key authentication

### User Credits Table
```typescript
{
  _id: Id<"user_credits">,
  user_id: Id<"users">,
  balance: number,
  updated_at: number
}
```

**Indexes**:
- `by_user_id`: For user credit lookups

### Rules Table
```typescript
{
  _id: Id<"rules">,
  pattern: string,  // Regex pattern
  action: "AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL",
  priority?: number,  // Higher = evaluated first
  cost?: number,  // Credit cost
  created_by: Id<"users">,
  created_at: number,
  enabled: boolean,
  
  // Escalation fields
  escalation_enabled?: boolean,
  escalation_delay_ms?: number,  // Delay in milliseconds
  escalation_action?: "AUTO_ACCEPT" | "AUTO_REJECT",
  
  // Time-based scheduling fields
  schedule_type?: "always" | "time_windows" | "cron",
  time_windows?: Array<{
    day_of_week: number,  // 0-6 (Sunday-Saturday)
    start_hour: number,   // 0-23
    start_minute: number, // 0-59
    end_hour: number,     // 0-23
    end_minute: number,   // 0-59
    timezone?: string,    // e.g., "America/New_York"
  }>,
  cron_expression?: string,  // Cron expression (5 parts)
  cron_timezone?: string,    // Timezone for cron
  
  // User-tier restriction fields
  restricted_to_user_id?: Id<"users">,
  restricted_to_role?: "admin" | "member",
  voting_threshold?: number,  // Required votes for auto-approval
}
```

**Indexes**:
- `by_enabled_and_priority`: For rule matching queries
- `by_created_by`: For finding rules by creator
- `by_restricted_user`: For user-specific rules
- `by_restricted_role`: For role-specific rules

### Commands Table
```typescript
{
  _id: Id<"commands">,
  user_id: Id<"users">,
  command_text: string,
  status: "pending" | "executed" | "rejected" | "needs_approval",
  matched_rule_id?: Id<"rules">,
  cost: number,
  created_at: number,
  executed_at?: number,
  rejection_reason?: string,
  output?: string,  // Mocked execution output
  
  // Escalation tracking fields
  escalation_at?: number,  // Timestamp when escalation should trigger
  escalated?: boolean,     // Whether escalation has been processed
  escalation_action?: "AUTO_ACCEPT" | "AUTO_REJECT",
  
  // Approval tracking fields
  approver_id?: Id<"users">,
  approved_at?: number,
  approval_reason?: string,
  voting_threshold?: number,  // Required votes for auto-approval
}
```

**Indexes**:
- `by_user_id`: For user command queries
- `by_status`: For status-based queries
- `by_user_id_and_status`: For combined queries
- `by_matched_rule_id`: For rule-related queries
- `by_status_and_escalation_at`: For escalation queries

### Audit Logs Table
```typescript
{
  _id: Id<"audit_logs">,
  user_id: Id<"users">,
  command_id?: Id<"commands">,
  event_type: "COMMAND_SUBMITTED" | "COMMAND_EXECUTED" | "COMMAND_REJECTED" | 
              "COMMAND_ESCALATED" | "COMMAND_APPROVED" | "COMMAND_REJECTED_BY_APPROVER" |
              "VOTE_CAST" | "RULE_CREATED" | "RULE_UPDATED" | "RULE_DELETED" |
              "USER_CREATED" | "USER_UPDATED" | "CREDITS_UPDATED",
  details: any,  // Flexible JSON object
  created_at: number
}
```

**Indexes**:
- `by_user_id`: For user audit queries
- `by_event_type`: For event type queries
- `by_user_id_and_event_type`: For combined queries
- `by_command_id`: For command-related audit logs
- `by_created_at`: For time-based queries

### Votes Table
```typescript
{
  _id: Id<"votes">,
  command_id: Id<"commands">,
  user_id: Id<"users">,
  vote_type: "approve" | "reject",
  created_at: number
}
```

**Indexes**:
- `by_command_id`: For command vote queries
- `by_user_id`: For user vote queries
- `by_command_and_user`: For unique vote per user per command

---

## Authentication

### API Key Authentication

The application uses API key-based authentication:

1. **Key Generation**: API keys are 64-character hexadecimal strings generated using cryptographically secure random values (`crypto.getRandomValues`)
2. **Key Storage**: Keys are hashed using SHA-256 before storage in the database
3. **Key Transmission**: Keys are sent via `X-API-Key` HTTP header or passed to Convex queries/mutations
4. **Key Validation**: On each request, the key is hashed and compared against stored hashes
5. **Key Display**: New keys are only shown once during user creation

### Authentication Flow

1. User enters API key in login form
2. Key is stored in localStorage (if "Remember key" is checked)
3. Key is sent with every API request via `X-API-Key` header or passed to Convex functions
4. Backend hashes the key and looks up user
5. User information is returned if key is valid
6. Invalid keys return 401 Unauthorized

### Role-Based Access Control

- **Member Role**: Can submit commands, view own commands, view dashboard
- **Admin Role**: All member permissions plus:
  - User management
  - Rule management
  - Audit logs
  - Command approvals
  - Voting on commands

---

## Command Processing Flow

### Detailed Flow Diagram

```
1. User Submits Command
   ↓
2. Early Credit Check
   ├─ Balance <= 0 → Reject Command, Log Event
   └─ Sufficient → Continue
   ↓
3. Fetch Enabled Rules
   ├─ Filter by time-based schedules (time windows/cron)
   ├─ Filter by user-tier restrictions (user_id/role)
   └─ Sort by priority (highest first), then creation date
   ↓
4. Match Command Text Against Rules (Regex)
   ├─ Match Found → Use Rule Action & Cost
   └─ No Match → Default to AUTO_REJECT, Cost = 1
   ↓
5. Final Credit Check (with actual cost)
   ├─ Insufficient → Reject Command, Log Event
   └─ Sufficient → Continue
   ↓
6. Determine Status Based on Action
   ├─ AUTO_ACCEPT → status = "executed", deduct credits
   ├─ AUTO_REJECT → status = "rejected"
   └─ REQUIRE_APPROVAL → status = "needs_approval"
   ↓
7. Set Escalation (if REQUIRE_APPROVAL and escalation enabled)
   └─ escalation_at = now + escalation_delay_ms
   ↓
8. Create Command Record
   ↓
9. Create Audit Log Entries
   ↓
10. Return Response to User
```

### Rule Matching Algorithm

1. Rules are fetched and filtered by:
   - Enabled status
   - Time-based schedules (time windows or cron)
   - User-tier restrictions (user_id or role)
2. Rules are sorted by priority (highest first), then by creation date (earlier first)
3. Command text is tested against each rule's regex pattern
4. First matching rule wins (priority determines order)
5. If no rule matches, default action is `AUTO_REJECT`
6. Rule's cost is used if specified, otherwise default cost is 1

### Credit Deduction

- Credits are deducted **only on execution**:
  - For `AUTO_ACCEPT`: Credits deducted immediately
  - For `REQUIRE_APPROVAL`: Credits deducted when approved
  - For `AUTO_REJECT`: No credits deducted
- If credits are insufficient, command is rejected immediately
- Credit balance can go negative (though commands will be rejected)
- Admins can adjust credits at any time

### Status Transitions

- **pending**: Initial state (rare, used for edge cases)
- **executed**: Command matched AUTO_ACCEPT rule OR was approved OR escalated to AUTO_ACCEPT
- **rejected**: Command matched AUTO_REJECT rule OR insufficient credits OR was rejected OR escalated to AUTO_REJECT
- **needs_approval**: Command matched REQUIRE_APPROVAL rule

### Escalation Processing

1. Cron job runs every minute
2. Finds commands with:
   - Status = "needs_approval"
   - `escalation_at` is set and in the past
   - `escalated` = false
3. Applies escalation action (AUTO_ACCEPT or AUTO_REJECT)
4. Deducts credits if escalated to AUTO_ACCEPT
5. Updates command status and creates audit logs

---

## Advanced Features

### 1. Escalation System

Commands requiring approval can automatically escalate after a configurable delay:

- **Configuration**: Set `escalation_enabled`, `escalation_delay_ms`, and `escalation_action` on rules
- **Processing**: Cron job processes escalations every minute
- **Actions**: Commands can escalate to AUTO_ACCEPT or AUTO_REJECT
- **Audit**: All escalations are logged

### 2. Voting System

Admins can vote on commands requiring approval:

- **Voting**: Adm