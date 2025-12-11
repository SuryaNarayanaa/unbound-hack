# Command Gateway Application Documentation

Hosted app links -->https://unbound-hack-ovbx.vercel.app/


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

---

## Application Overview

**Command Gateway** is a command management and processing system that allows users to submit commands that are automatically evaluated against configurable rules. The system uses a credit-based model where each command execution costs credits, and rules determine whether commands are automatically accepted, rejected, or require manual approval.

### Key Concepts

- **API Key Authentication**: Users authenticate using API keys (stored as hashed values)
- **Role-Based Access Control**: Two roles - `admin` and `member`
- **Rule-Based Processing**: Commands are matched against regex patterns with priority-based evaluation
- **Credit System**: Commands consume credits, which can be managed by admins
- **Audit Logging**: All significant actions are logged for compliance and debugging

---

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS
- **UI Components**: Custom components built with Tailwind
- **State Management**: React Context API (AuthContext, ToastContext)

### Backend
- **Backend Framework**: Convex (serverless backend)
- **Database**: Convex Database (NoSQL)
- **Authentication**: Convex Auth (supports Google OAuth and Password auth, but app uses API keys)
- **API**: RESTful HTTP endpoints via Convex HTTP router

### Key Libraries
- `@convex-dev/auth`: Authentication library
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
   - API key is sent to `/api/me` endpoint
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
  - View all rules sorted by priority

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
   - Validates user has sufficient credits
   - Fetches all enabled rules, sorted by priority (highest first)
   - Matches command text against rule patterns (regex)
   - First matching rule determines action:
     - `AUTO_ACCEPT`: Command is immediately executed
     - `AUTO_REJECT`: Command is rejected
     - `REQUIRE_APPROVAL`: Command status set to "needs_approval"
   - If no rule matches, default is `REQUIRE_APPROVAL`
   - Deducts credits (uses rule cost or default of 1)
   - Creates command record and audit log

3. **Response**:
   - User receives feedback about command status
   - Command appears in history with appropriate status badge
   - Credit balance is updated

### 4. Logout Flow

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

3. **Audit & Monitoring**:
   - View complete audit logs
   - Filter logs by user, event type, or date range
   - Monitor all system activities
   - Track credit adjustments, rule changes, and command executions

4. **Command Oversight**:
   - View all commands from all users (not just their own)
   - See command statuses and matched rules
   - Monitor system usage

### Admin-Only Routes

The following routes require admin role:
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:userId/credits` - Adjust credits
- `GET /api/rules` - List all rules
- `POST /api/rules` - Create rule
- `PATCH /api/rules/:ruleId` - Update rule
- `DELETE /api/rules/:ruleId` - Delete rule
- `GET /api/audit` - View audit logs

### Admin UI Pages

- `/dashboard/users` - User management interface
- `/dashboard/rules` - Rule management interface
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

4. **Important**: The API key is only shown once during creation. Make sure to copy it immediately and store it securely.

### Method 2: Manual Creation via API

If you already have an admin user, you can create additional admins via the API:

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  -d '{
    "name": "New Admin",
    "email": "admin2@example.com",
    "role": "admin"
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

### Method 3: Direct Database Insertion (Advanced)

For development/testing, you can manually create a user in the Convex dashboard:

1. Open Convex Dashboard
2. Navigate to the `users` table
3. Insert a new document with:
   ```json
   {
     "email": "admin@example.com",
     "name": "Admin User",
     "role": "admin",
     "api_key": "hashed_api_key_here",
     "created_at": 1234567890
   }
   ```
4. Generate and hash an API key using the utility functions in `convex/lib/api_key.ts`

**Note**: This method requires you to manually generate and hash the API key, which is more complex.

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

- **API Key Authentication**: Secure authentication using API keys
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
- **Multiple Actions**:
  - `AUTO_ACCEPT`: Immediate execution
  - `AUTO_REJECT`: Immediate rejection
  - `REQUIRE_APPROVAL`: Manual approval required
- **Credit Deduction**: Automatic credit deduction on submission
- **Insufficient Credits Handling**: Commands rejected if credits insufficient

### 4. Rule Management (Admin Only)

- **Rule Creation**: Create rules with regex patterns
- **Rule Editing**: Update existing rules
- **Rule Deletion**: Remove rules
- **Rule Toggle**: Enable/disable rules without deletion
- **Priority Management**: Set rule evaluation order
- **Cost Assignment**: Set custom credit costs per rule
- **Regex Validation**: Real-time regex pattern validation
- **Conflict Detection**: Warns about duplicate patterns

### 5. Credit System

- **Credit Balance**: Each user has a credit balance
- **Automatic Deduction**: Credits deducted on command submission
- **Admin Adjustment**: Admins can add/remove credits
- **Balance Display**: Real-time credit balance in UI
- **Insufficient Credits**: Commands rejected if balance too low

### 6. Command History

- **Command Listing**: View all submitted commands
- **Status Filtering**: Filter by status (executed, rejected, pending, needs_approval)
- **Command Details**: View full command text, status, matched rule, cost, timestamps
- **User-Specific View**: Members see only their commands
- **Admin View**: Admins see all commands from all users
- **Real-Time Updates**: Refresh to see latest commands

### 7. Audit Logging

- **Comprehensive Logging**: All significant events logged
- **Event Types**:
  - `COMMAND_SUBMITTED`: Command submitted for processing
  - `COMMAND_EXECUTED`: Command successfully executed
  - `COMMAND_REJECTED`: Command rejected
  - `RULE_CREATED`: New rule created
  - `RULE_UPDATED`: Rule modified
  - `RULE_DELETED`: Rule removed
  - `USER_CREATED`: New user created
  - `USER_UPDATED`: User information updated
  - `CREDITS_UPDATED`: Credit balance changed
- **Filtering**: Filter by user, event type, date range
- **Detailed View**: View full log details in modal
- **Admin Only**: Audit logs only accessible to admins

### 8. Dashboard & Analytics

- **Overview Dashboard**: Command statistics and recent activity
- **Statistics Cards**: Total commands, executed, rejected, pending counts
- **Success Rate**: Percentage of executed commands
- **Recent Commands**: Last 5 commands displayed
- **Credit Display**: Current credit balance prominently shown

### 9. UI/UX Features

- **Responsive Design**: Works on desktop and mobile
- **Toast Notifications**: Success/error feedback
- **Loading States**: Visual feedback during operations
- **Form Validation**: Real-time validation (e.g., regex patterns)
- **Modal Dialogs**: For creating users, adjusting credits, viewing details
- **Status Badges**: Color-coded status indicators
- **Dark Mode Support**: UI adapts to system preferences

### 10. API Features

- **RESTful API**: Standard HTTP methods (GET, POST, PATCH, DELETE)
- **API Key Header**: Authentication via `X-API-Key` header
- **Error Handling**: Comprehensive error responses
- **JSON Responses**: All responses in JSON format
- **Query Parameters**: Filtering and pagination support

---

## API Endpoints

### Authentication Required
All endpoints require the `X-API-Key` header (except auth endpoints):
```
X-API-Key: your_api_key_here
```

### User Endpoints

#### GET /api/me
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

#### POST /api/users (Admin Only)
Create a new user.

**Request Body**:
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "role": "admin" | "member"
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

#### PATCH /api/users/:userId/credits (Admin Only)
Adjust user credits.

**Request Body**:
```json
{
  "amount": 50  // Positive to add, negative to remove
}
```

**Response**:
```json
{
  "success": true
}
```

### Command Endpoints

#### POST /api/commands
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
  "matchedRuleId": "rule_id"
}
```

#### GET /api/commands
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
    "executed_at": 1234567890
  }
]
```

#### GET /api/commands/:commandId
Get a specific command's details.

**Response**: Same as command object in list response.

### Rule Endpoints (Admin Only)

#### GET /api/rules
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
    "created_at": 1234567890
  }
]
```

#### POST /api/rules
Create a new rule.

**Request Body**:
```json
{
  "pattern": "^list.*",
  "action": "AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL",
  "priority": 10,
  "enabled": true,
  "cost": 1  // optional
}
```

**Response**:
```json
{
  "ruleId": "rule_id"
}
```

#### PATCH /api/rules/:ruleId
Update an existing rule.

**Request Body** (all fields optional):
```json
{
  "pattern": "^list.*",
  "action": "AUTO_ACCEPT",
  "priority": 10,
  "enabled": true,
  "cost": 1
}
```

**Response**:
```json
{
  "success": true
}
```

#### DELETE /api/rules/:ruleId
Delete a rule.

**Response**:
```json
{
  "success": true
}
```

### Audit Endpoints (Admin Only)

#### GET /api/audit
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
  api_key?: string,  // Hashed API key
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
  enabled: boolean
}
```

**Indexes**:
- `by_enabled_and_priority`: For rule matching queries
- `by_created_by`: For finding rules by creator

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
  rejection_reason?: string
}
```

**Indexes**:
- `by_user_id`: For user command queries
- `by_status`: For status-based queries
- `by_user_id_and_status`: For combined queries
- `by_matched_rule_id`: For rule-related queries

### Audit Logs Table
```typescript
{
  _id: Id<"audit_logs">,
  user_id: Id<"users">,
  command_id?: Id<"commands">,
  event_type: "COMMAND_SUBMITTED" | "COMMAND_EXECUTED" | "COMMAND_REJECTED" | 
              "RULE_CREATED" | "USER_CREATED" | "USER_UPDATED" | 
              "CREDITS_UPDATED" | "RULE_UPDATED" | "RULE_DELETED",
  details: any,  // Flexible JSON object
  created_at: number
}
```

**Indexes**:
- `by_user_id`: For user audit queries
- `by_event_type`: For event type queries
- `by_user_id_and_event_type`: For combined queries
- `by_command_id`: For command-related audit logs

---

## Authentication

### API Key Authentication

The application uses API key-based authentication:

1. **Key Generation**: API keys are 64-character hexadecimal strings generated using cryptographically secure random values
2. **Key Storage**: Keys are hashed using SHA-256 before storage in the database
3. **Key Transmission**: Keys are sent via `X-API-Key` HTTP header
4. **Key Validation**: On each request, the key is hashed and compared against stored hashes
5. **Key Display**: New keys are only shown once during user creation

### Authentication Flow

1. User enters API key in login form
2. Key is stored in localStorage (if "Remember key" is checked)
3. Key is sent with every API request via `X-API-Key` header
4. Backend hashes the key and looks up user
5. User information is returned if key is valid
6. Invalid keys return 401 Unauthorized

### Role-Based Access Control

- **Member Role**: Can submit commands, view own commands, view dashboard
- **Admin Role**: All member permissions plus user management, rule management, audit logs

---

## Command Processing Flow

### Detailed Flow Diagram

```
1. User Submits Command
   ↓
2. Validate User Credits
   ├─ Insufficient → Reject Command, Log Event
   └─ Sufficient → Continue
   ↓
3. Fetch Enabled Rules (Sorted by Priority Descending)
   ↓
4. Match Command Text Against Rules (Regex)
   ├─ Match Found → Use Rule Action & Cost
   └─ No Match → Default to REQUIRE_APPROVAL, Cost = 1
   ↓
5. Determine Status Based on Action
   ├─ AUTO_ACCEPT → status = "executed"
   ├─ AUTO_REJECT → status = "rejected"
   └─ REQUIRE_APPROVAL → status = "needs_approval"
   ↓
6. Deduct Credits
   ↓
7. Create Command Record
   ↓
8. Create Audit Log Entry
   ↓
9. Return Response to User
```

### Rule Matching Algorithm

1. Rules are fetched and sorted by priority (highest first)
2. Command text is tested against each rule's regex pattern
3. First matching rule wins (priority determines order)
4. If no rule matches, default action is `REQUIRE_APPROVAL`
5. Rule's cost is used if specified, otherwise default cost is 1

### Credit Deduction

- Credits are deducted **before** command execution
- If credits are insufficient, command is rejected immediately
- Credit balance can go negative (though commands will be rejected)
- Admins can adjust credits at any time

### Status Transitions

- **pending**: Initial state (rare, used for edge cases)
- **executed**: Command matched AUTO_ACCEPT rule
- **rejected**: Command matched AUTO_REJECT rule OR insufficient credits
- **needs_approval**: Command matched REQUIRE_APPROVAL rule OR no rule matched

---

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Convex account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd unbound
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will:
   - Create a new Convex project (if needed)
   - Set up environment variables
   - Deploy the backend schema and functions

4. **Configure environment variables**
   Create `.env.local` with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   CONVEX_DEPLOYMENT=<your-convex-deployment-url>
   GOOGLE_CLIENT_ID=<if-using-google-auth>
   GOOGLE_CLIENT_SECRET=<if-using-google-auth>
   ```

5. **Run the seed script** (to create admin user)
   ```bash
   npx convex run seed:seedAdmin
   ```
   Copy the API key from the console output.

6. **Start the development server**
   ```bash
   npm run dev
   ```
   This starts both Next.js frontend and Convex backend.

7. **Access the application**
   - Frontend: http://localhost:3000
   - Convex Dashboard: https://dashboard.convex.dev

### Running in Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy Convex backend**
   ```bash
   npx convex deploy --prod
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

---

## Security Considerations

1. **API Key Security**:
   - Keys are hashed before storage (SHA-256)
   - Keys are only displayed once during creation
   - Keys should be transmitted over HTTPS in production

2. **Input Validation**:
   - Regex patterns are validated before rule creation
   - Command text is validated before submission
   - All inputs are sanitized

3. **Access Control**:
   - Role-based access control enforced at API level
   - Admin-only routes check user role
   - Members cannot access admin endpoints

4. **Audit Trail**:
   - All significant actions are logged
   - Audit logs are immutable
   - Admin-only access to audit logs

5. **Credit System**:
   - Credits are deducted atomically
   - Insufficient credits prevent command execution
   - Credit adjustments are logged

---

## Troubleshooting

### Common Issues

1. **"Invalid API Key" Error**:
   - Verify the API key is correct
   - Check that the key hasn't been modified
   - Ensure the key is being sent in the `X-API-Key` header

2. **"Access Denied" Error**:
   - Verify user has the correct role (admin vs member)
   - Check that the endpoint requires admin access
   - Ensure user role is set correctly in database

3. **Commands Not Matching Rules**:
   - Verify rule pattern is correct regex
   - Check rule is enabled
   - Verify rule priority (higher priority rules evaluated first)
   - Test regex pattern independently

4. **Credits Not Deducting**:
   - Check user has sufficient credits
   - Verify command was successfully created
   - Check audit logs for credit update events

5. **Seed Admin Not Working**:
   - Ensure Convex backend is running
   - Check that email doesn't already exist
   - Verify seed function is being called correctly
   - Check console for error messages

---

## Future Enhancements

Potential features for future development:

1. **Command Approval Workflow**: UI for admins to approve/reject pending commands
2. **Webhook Support**: Send webhooks on command execution
3. **Rate Limiting**: Prevent command spam
4. **Command Templates**: Pre-defined command templates
5. **Bulk Operations**: Bulk credit adjustments, bulk rule updates
6. **Export Functionality**: Export commands, logs, users to CSV/JSON
7. **Advanced Analytics**: Charts and graphs for usage statistics
8. **Email Notifications**: Notify users of command status changes
9. **API Key Rotation**: Allow users to rotate their API keys
10. **Multi-Tenancy**: Support for multiple organizations/workspaces

---

## Support & Contributing

For issues, questions, or contributions:
- Check the Convex documentation: https://docs.convex.dev
- Review the codebase structure
- Test changes thoroughly before submitting

---

**Last Updated**: 2024
**Version**: 0.1.0

