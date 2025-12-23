# ChatOps Assistant - Multi-Platform Automation Platform

## Overview
A web-based ChatOps automation assistant that allows users to manage infrastructure across multiple platforms (GitHub, Cloudflare, AWS, Azure, GCP, Kubernetes) through a conversational interface with approval workflows, rollback capabilities, and comprehensive audit logging.

## Core Features
- **Chat Interface**: Natural language commands to manage infrastructure
- **Plan Cards**: Visual representation of proposed changes with risk assessment
- **Approval Workflow**: "同意操作" (Approve) button with risk-based confirmations
- **Rollback**: "Rollback here" capability to revert changes using snapshots
- **Capability Discovery**: Automatic detection of available actions based on OAuth permissions
- **Graceful Degradation**: Falls back to PLAN_ONLY mode when permissions are insufficient

## Architecture

### Frontend (client/)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS v4
- **Routing**: wouter
- **State Management**: @tanstack/react-query
- **Components**:
  - `Layout.tsx` - Main layout with sidebar navigation
  - `Chat.tsx` - Chat interface with message history
  - `PlanCard.tsx` - Plan card with risk badges and action buttons
  - `ConnectionCard.tsx` - Connection status and capabilities

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket for live updates
- **Key Services**:
  - `storage.ts` - Database operations
  - `routes.ts` - API endpoints
  - `connectors/` - Platform connectors (GitHub, etc.)
  - `services/planner.ts` - Plan generation
  - `services/executor.ts` - Plan execution with snapshots

### Database Schema (shared/schema.ts)
- `tenants` - Multi-tenant support
- `users` - User accounts
- `connections` - OAuth connections with auth levels
- `capability_profiles` - Discovered capabilities per connection
- `chat_sessions` & `messages` - Conversation history
- `plans` - Generated operation plans
- `runs` - Execution records with status
- `snapshots` - Pre-state snapshots for rollback
- `rollbacks` - Rollback history
- `audit_events` - Immutable audit trail
- `feature_flags` - Feature toggles per tenant

## API Endpoints

### Authentication
- `POST /api/auth/demo-login` - Demo login (creates demo user)

### Connections
- `GET /api/connections` - List connections
- `POST /api/connections/:provider/start` - Start OAuth flow
- `POST /api/connections/:provider/discover` - Discover capabilities
- `GET /api/connections/:id/capabilities` - Get capability profile

### Chat
- `GET /api/chat/sessions` - List sessions
- `POST /api/chat/sessions` - Create session
- `GET /api/chat/sessions/:id/messages` - Get messages
- `POST /api/chat/sessions/:id/messages` - Send message

### Plans & Runs
- `GET /api/plans/:id` - Get plan
- `POST /api/plans/:id/dry-run` - Dry run
- `POST /api/plans/:id/approve` - Approve and execute
- `GET /api/runs/:id` - Get run status
- `POST /api/runs/:id/rollback` - Rollback

### Audit
- `GET /api/audit` - Query audit events

## Connector SDK

### Interface
```typescript
interface Connector {
  id: string;
  generateOAuthUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<TokenResponse>;
  discoverCapabilities(accessToken: string): Promise<CapabilityDiscoveryResult>;
  getActions(): ActionCapability[];
  executeAction<I, O>(actionId: string, params: ActionExecuteParams<I>): Promise<ActionResult<O>>;
}
```

### Auth Levels
- `READ` - Read-only access
- `WRITE_LOW` - Low-risk write operations
- `WRITE_HIGH` - High-risk write operations (admin)

### Risk Levels
- `LOW` - No confirmation required
- `MED` - Double confirmation required
- `HIGH` - Must type CONFIRM to proceed

### Rollbackability
- `YES` - Fully reversible
- `PARTIAL` - Partially reversible (e.g., DNS TTL delays)
- `NO` - Cannot be rolled back

## Baseline Packs

### GitHub Security Baseline v1
- Branch protection enabled
- Required PR reviews (≥1)
- Force push disabled
- Vulnerability alerts enabled
- Automated security fixes enabled

## Development

### Start Development Server
```bash
npm run dev
```

### Push Database Schema
```bash
npm run db:push
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `GITHUB_CLIENT_ID` - GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App client secret
- `GITHUB_REDIRECT_URI` - OAuth callback URL

## User Preferences
- Language: Chinese (Traditional) for UI labels
- Risk confirmations required for HIGH risk operations
- Audit logging for all operations

## Project Structure
```
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilities and API client
├── server/                 # Backend Express server
│   ├── connectors/        # Platform connectors
│   ├── services/          # Business logic
│   └── baselines/         # Baseline pack definitions
├── shared/                 # Shared types and schemas
│   ├── schema.ts          # Drizzle schema
│   └── types.ts           # TypeScript types
└── db/                     # Database connection
```

## Recent Changes
- Initial project setup (December 23, 2025)
- Created full-stack application with Chat UI
- Implemented GitHub connector with OAuth
- Added Plan Card with risk badges and approval workflow
- Created GitHub Security Baseline Pack v1
- Set up PostgreSQL database with full schema
