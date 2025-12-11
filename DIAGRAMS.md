# Command Gateway - System Diagrams

This document contains sequence and class diagrams for the Command Gateway application.

## Sequence Diagram: Command Submission Flow

This diagram shows the complete flow when a user submits a command through the system.

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend (React)
    participant AuthContext as AuthContext
    participant ConvexQuery as Convex Query Layer
    participant HTTPRouter as HTTP Router
    participant AuthHelper as Auth Helper
    participant CommandsModule as Commands Module
    participant RulesModule as Rules Module
    participant Database as Convex Database
    participant AuditModule as Audit Module

    User->>Frontend: Enter command text & click Submit
    Frontend->>AuthContext: Get API key
    AuthContext-->>Frontend: Return API key
    
    Frontend->>ConvexQuery: submitCommand(apiKey, commandText)
    ConvexQuery->>AuthHelper: authenticateUser(apiKey)
    AuthHelper->>Database: Hash API key & lookup user
    Database-->>AuthHelper: Return user object
    AuthHelper-->>ConvexQuery: User authenticated
    
    ConvexQuery->>CommandsModule: submitCommand(userId, commandText)
    
    CommandsModule->>Database: Get user & credit balance
    Database-->>CommandsModule: User & credit data
    
    alt Insufficient Credits (balance <= 0)
        CommandsModule->>Database: Create command (status: rejected)
        CommandsModule->>AuditModule: Log COMMAND_SUBMITTED
        CommandsModule->>AuditModule: Log COMMAND_REJECTED
        CommandsModule-->>ConvexQuery: Return rejected status
    else Sufficient Credits
        CommandsModule->>RulesModule: getEnabledRules()
        RulesModule->>Database: Query enabled rules (sorted by priority)
        Database-->>RulesModule: Return rules list
        RulesModule-->>CommandsModule: Return sorted rules
        
        CommandsModule->>CommandsModule: Match command against rules (regex)
        
        alt Rule Matched
            CommandsModule->>CommandsModule: Extract action & cost from rule
        else No Rule Matched
            CommandsModule->>CommandsModule: Use default (REQUIRE_APPROVAL, cost=1)
        end
        
        alt Insufficient Credits for Rule Cost
            CommandsModule->>Database: Create command (status: rejected)
            CommandsModule->>AuditModule: Log COMMAND_SUBMITTED
            CommandsModule->>AuditModule: Log COMMAND_REJECTED
            CommandsModule-->>ConvexQuery: Return rejected status
        else Sufficient Credits
            alt Action is AUTO_ACCEPT
                CommandsModule->>Database: Deduct credits
                CommandsModule->>Database: Create command (status: executed)
                CommandsModule->>AuditModule: Log COMMAND_SUBMITTED
                CommandsModule->>AuditModule: Log COMMAND_EXECUTED
            else Action is AUTO_REJECT
                CommandsModule->>Database: Create command (status: rejected)
                CommandsModule->>AuditModule: Log COMMAND_SUBMITTED
                CommandsModule->>AuditModule: Log COMMAND_REJECTED
            else Action is REQUIRE_APPROVAL
                CommandsModule->>Database: Create command (status: needs_approval)
                CommandsModule->>AuditModule: Log COMMAND_SUBMITTED
            end
            CommandsModule-->>ConvexQuery: Return command result
        end
    end
    
    ConvexQuery-->>Frontend: Return command status
    Frontend->>User: Display result (toast notification)
    Frontend->>AuthContext: Refresh user credits
```

## Sequence Diagram: Authentication Flow

This diagram shows how users authenticate using API keys.

```mermaid
sequenceDiagram
    participant User
    participant LoginPage as Login Page
    participant AuthContext as AuthContext
    participant LocalStorage as localStorage
    participant ConvexQuery as Convex Query
    participant AuthHelper as Auth Helper
    participant Database as Convex Database
    participant UsersModule as Users Module

    User->>LoginPage: Enter API key
    User->>LoginPage: Check "Remember key"
    User->>LoginPage: Click Continue
    
    LoginPage->>AuthContext: login(apiKey, remember)
    
    alt Remember Key
        AuthContext->>LocalStorage: Store API key
    end
    
    AuthContext->>AuthContext: Set API key state
    AuthContext->>ConvexQuery: getMe(apiKey)
    
    ConvexQuery->>AuthHelper: authenticateUser(apiKey)
    AuthHelper->>Database: Hash API key & lookup user
    Database-->>AuthHelper: Return user or null
    
    alt Valid API Key
        AuthHelper-->>ConvexQuery: Return user
        ConvexQuery->>UsersModule: getMe(userId)
        UsersModule->>Database: Get user & credits
        Database-->>UsersModule: Return user data
        UsersModule-->>ConvexQuery: Return user info
        ConvexQuery-->>AuthContext: Return user object
        AuthContext->>AuthContext: Update user state
        AuthContext->>LoginPage: Redirect to /dashboard
        LoginPage-->>User: Show dashboard
    else Invalid API Key
        AuthHelper-->>ConvexQuery: Throw error
        ConvexQuery-->>AuthContext: Return null
        AuthContext->>LocalStorage: Remove API key
        AuthContext->>AuthContext: Clear API key state
        AuthContext-->>LoginPage: Show error
        LoginPage-->>User: Display "Invalid API Key"
    end
```

## Sequence Diagram: Admin Creating a Rule

This diagram shows the flow when an admin creates a new rule.

```mermaid
sequenceDiagram
    participant Admin
    participant RulesPage as Rules Page
    participant ConvexQuery as Convex Query
    participant AuthHelper as Auth Helper
    participant AdminModule as Admin Module
    participant RulesModule as Rules Module
    participant Database as Convex Database
    participant AuditModule as Audit Module

    Admin->>RulesPage: Fill rule form (pattern, action, priority, cost)
    Admin->>RulesPage: Click "Create Rule"
    
    RulesPage->>RulesPage: Validate regex pattern
    RulesPage->>ConvexQuery: createRule(apiKey, ruleData)
    
    ConvexQuery->>AuthHelper: authenticateUser(apiKey)
    AuthHelper->>Database: Hash API key & lookup user
    Database-->>AuthHelper: Return user
    AuthHelper-->>ConvexQuery: User authenticated
    
    ConvexQuery->>ConvexQuery: checkRole(user, "admin")
    
    alt Not Admin
        ConvexQuery-->>RulesPage: Throw "Forbidden" error
        RulesPage-->>Admin: Show access denied
    else Is Admin
        ConvexQuery->>ConvexQuery: Validate regex pattern
        ConvexQuery->>AdminModule: createRule(ruleData, creatorId)
        AdminModule->>Database: Insert rule
        Database-->>AdminModule: Return rule ID
        AdminModule-->>ConvexQuery: Return rule ID
        
        ConvexQuery->>AuditModule: createAuditLog(RULE_CREATED)
        AuditModule->>Database: Insert audit log
        Database-->>AuditModule: Return log ID
        AuditModule-->>ConvexQuery: Audit logged
        
        ConvexQuery-->>RulesPage: Return rule ID
        RulesPage->>RulesPage: Refresh rules list
        RulesPage-->>Admin: Show success message
    end
```

## Class Diagram: Database Schema & Relationships

This diagram shows the database schema, relationships, and key data structures.

```mermaid
classDiagram
    class Users {
        +Id _id
        +string? email
        +number? emailVerificationTime
        +string? phone
        +number? phoneVerificationTime
        +boolean? isAnonymous
        +string? name
        +string? image
        +string? api_key
        +"admin"|"member"? role
        +number? created_at
        +number? updated_at
    }

    class UserCredits {
        +Id _id
        +Id user_id
        +number balance
        +number updated_at
    }

    class Rules {
        +Id _id
        +string pattern
        +"AUTO_ACCEPT"|"AUTO_REJECT"|"REQUIRE_APPROVAL" action
        +number? priority
        +number? cost
        +Id created_by
        +number created_at
        +boolean enabled
    }

    class Commands {
        +Id _id
        +Id user_id
        +string command_text
        +"pending"|"executed"|"rejected"|"needs_approval" status
        +Id? matched_rule_id
        +number cost
        +number created_at
        +number? executed_at
        +string? rejection_reason
        +string? output
    }

    class AuditLogs {
        +Id _id
        +Id user_id
        +Id? command_id
        +string event_type
        +any details
        +number created_at
    }

    class AuthContext {
        +User? user
        +boolean isAuthenticated
        +boolean isLoading
        +string? apiKey
        +login(key, remember)
        +logout()
        +refreshUser()
    }

    class ApiClient {
        -string? apiKey
        +setApiKey(key)
        +getApiKey()
        +clearApiKey()
        +request(endpoint, options)
        +get(endpoint, params)
        +post(endpoint, body)
        +patch(endpoint, body)
        +delete(endpoint)
    }

    class ConvexQueries {
        +getMe(apiKey)
        +listUsers(apiKey)
        +createUser(apiKey, userData)
        +adjustCredits(apiKey, userId, amount)
        +listRules(apiKey)
        +createRule(apiKey, ruleData)
        +updateRule(apiKey, ruleId, updates)
        +deleteRule(apiKey, ruleId)
        +submitCommand(apiKey, commandText)
        +listCommands(apiKey, status?)
        +getAuditLogs(apiKey, filters)
    }

    class CommandsModule {
        +submitCommand(userId, commandText)
        +listCommands(userId?, status?)
        +getCommand(commandId)
    }

    class RulesModule {
        +getEnabledRules()
        +listRules()
        +getRule(ruleId)
        +updateRule(ruleId, updates)
        +deleteRule(ruleId)
    }

    class AdminModule {
        +createApiUser(email, name, role)
        +listUsers()
        +createRule(ruleData, creatorId)
        +adjustCredits(userId, amount, reason)
        +createAuditLog(userId, eventType, details)
        +getAuditLogs(filters)
    }

    class HTTPRouter {
        +route(path, method, handler)
        +authenticatedRoute(handler, requiredRole?)
    }

    Users ||--o{ UserCredits : "has one"
    Users ||--o{ Commands : "submits"
    Users ||--o{ Rules : "creates"
    Users ||--o{ AuditLogs : "generates"
    Rules ||--o{ Commands : "matches"
    Commands ||--o{ AuditLogs : "triggers"
    
    AuthContext --> ConvexQueries : "uses"
    ConvexQueries --> CommandsModule : "calls"
    ConvexQueries --> RulesModule : "calls"
    ConvexQueries --> AdminModule : "calls"
    HTTPRouter --> ConvexQueries : "routes to"
    CommandsModule --> RulesModule : "queries"
    CommandsModule --> AdminModule : "logs to"
    AdminModule --> RulesModule : "creates"
```

## Class Diagram: Frontend Components

This diagram shows the React component structure and relationships.

```mermaid
classDiagram
    class AppProviders {
        +children
        +render()
    }

    class ConvexClientProvider {
        +children
        +render()
    }

    class AuthProvider {
        -string? apiKey
        -User? user
        -boolean isLoading
        +login(key, remember)
        +logout()
        +refreshUser()
    }

    class ToastProvider {
        -Toast[] toasts
        +addToast(message, type)
        +removeToast(id)
    }

    class DashboardLayout {
        +children
        +render()
    }

    class Sidebar {
        +User? user
        +render()
    }

    class TopBar {
        +User? user
        +logout()
        +render()
    }

    class DashboardPage {
        +render()
        +fetchStatistics()
    }

    class CommandsPage {
        -string commandText
        -string statusFilter
        +handleSubmit()
        +render()
    }

    class UsersPage {
        -User[] users
        +handleCreateUser()
        +handleAdjustCredits()
        +render()
    }

    class RulesPage {
        -Rule[] rules
        +handleCreateRule()
        +handleUpdateRule()
        +handleDeleteRule()
        +render()
    }

    class AuditPage {
        -AuditLog[] logs
        -filters
        +handleFilter()
        +render()
    }

    class Button {
        +variant
        +size
        +onClick
        +children
    }

    class Card {
        +children
    }

    class Table {
        +data
        +columns
    }

    class Modal {
        +isOpen
        +onClose
        +children
    }

    AppProviders --> ConvexClientProvider : "wraps"
    AppProviders --> AuthProvider : "wraps"
    AppProviders --> ToastProvider : "wraps"
    
    DashboardLayout --> Sidebar : "contains"
    DashboardLayout --> TopBar : "contains"
    
    DashboardPage --> AuthProvider : "uses"
    CommandsPage --> AuthProvider : "uses"
    CommandsPage --> ToastProvider : "uses"
    UsersPage --> AuthProvider : "uses"
    UsersPage --> ToastProvider : "uses"
    RulesPage --> AuthProvider : "uses"
    RulesPage --> ToastProvider : "uses"
    AuditPage --> AuthProvider : "uses"
    
    CommandsPage --> Button : "uses"
    CommandsPage --> Card : "uses"
    CommandsPage --> Table : "uses"
    UsersPage --> Button : "uses"
    UsersPage --> Card : "uses"
    UsersPage --> Table : "uses"
    UsersPage --> Modal : "uses"
    RulesPage --> Button : "uses"
    RulesPage --> Card : "uses"
    RulesPage --> Table : "uses"
    RulesPage --> Modal : "uses"
    AuditPage --> Card : "uses"
    AuditPage --> Table : "uses"
```

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js App]
        B[React Components]
        C[AuthContext]
        D[ToastContext]
    end

    subgraph "API Layer"
        E[Convex HTTP Router]
        F[Authentication Middleware]
    end

    subgraph "Business Logic Layer"
        G[Convex Queries]
        H[Convex Mutations]
        I[Commands Module]
        J[Rules Module]
        K[Admin Module]
        L[Users Module]
    end

    subgraph "Data Layer"
        M[(Users Table)]
        N[(User Credits Table)]
        O[(Rules Table)]
        P[(Commands Table)]
        Q[(Audit Logs Table)]
    end

    A --> B
    B --> C
    B --> D
    C --> G
    B --> G
    B --> H
    
    E --> F
    F --> G
    F --> H
    
    G --> I
    G --> J
    G --> K
    G --> L
    H --> I
    H --> J
    H --> K
    H --> L
    
    I --> M
    I --> N
    I --> P
    I --> Q
    J --> O
    K --> M
    K --> N
    K --> O
    K --> Q
    L --> M
    L --> N
    
    I --> J
    I --> K
```

## Key Relationships Summary

### Database Relationships
- **Users** → **UserCredits**: One-to-One (each user has one credit record)
- **Users** → **Commands**: One-to-Many (each user can submit many commands)
- **Users** → **Rules**: One-to-Many (each admin can create many rules)
- **Users** → **AuditLogs**: One-to-Many (each user generates many audit logs)
- **Rules** → **Commands**: One-to-Many (each rule can match many commands)
- **Commands** → **AuditLogs**: One-to-Many (each command can generate multiple audit logs)

### Authentication Flow
1. User provides API key
2. API key is hashed (SHA-256)
3. Hashed key is looked up in Users table
4. User object is returned with role and credits
5. Role-based access control is enforced

### Command Processing Flow
1. Validate user credits
2. Fetch enabled rules (sorted by priority)
3. Match command text against rule patterns (regex)
4. Determine action (AUTO_ACCEPT, AUTO_REJECT, REQUIRE_APPROVAL)
5. Deduct credits (if AUTO_ACCEPT)
6. Create command record
7. Create audit log entries

### Rule Matching Algorithm
1. Rules are sorted by priority (descending)
2. Command text is tested against each rule's regex pattern
3. First matching rule wins
4. If no match, default to REQUIRE_APPROVAL with cost=1

