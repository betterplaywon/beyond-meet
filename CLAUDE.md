# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beyond Meet is a WebRTC-based 1:1 video dating app built with React Native (iOS/Android) and Node.js backend. Beta strategy: 20-user invite code system with $0/month operational cost.

## Build & Development Commands

### Backend (backend/)

```bash
npm run dev              # Start dev server with hot reload (ts-node-dev)
npm run build            # Build TypeScript + generate Prisma client
npm start                # Run production server
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:studio    # Open Prisma GUI for database inspection
npm run db:seed          # Generate initial invite codes (BETA-0001 ~ BETA-0020)
```

### Mobile (mobile/)

```bash
npm start                # Start Metro bundler
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run lint             # ESLint check
npm test                 # Run Jest tests

# iOS specific - run after dependency changes
cd ios && pod install && cd ..
```

## Architecture

### Backend Structure

```
backend/src/
├── controllers/    # Request handlers (thin, delegate to services)
├── services/       # Business logic (auth, match, call, push, admin)
├── routes/         # Express route definitions
├── middlewares/    # auth.ts, errorHandler.ts, rateLimiter.ts, admin.ts
├── sockets/        # Socket.io handlers (match-handler.ts)
├── config/         # database.ts (Prisma), redis.ts, firebase.ts, supabase.ts
└── utils/          # jwt.ts, password.ts
```

### Mobile Structure

```
mobile/src/
├── screens/        # Screen components by feature (auth/, home/, call/, profile/, admin/)
├── components/     # Reusable UI (common/, call/, moderation/)
├── navigation/     # RootNavigator, AuthNavigator, MainNavigator, AdminNavigator
├── services/       # API clients (api.ts, socketService.ts, pushService.ts)
├── hooks/          # Custom hooks (useAuth, useSocket, useFriends, useProfile, useCallHistory)
├── store/          # Zustand stores (authStore.ts, callStore.ts, index.ts)
├── api/            # API endpoint functions
└── config/         # env.ts (centralized environment variables)
```

### Key Architectural Patterns

1. **State Management**: Zustand for client state, React Query (@tanstack/react-query) for server state
2. **Real-time**: Socket.io for matching/calls, HTTP REST for CRUD operations
3. **Auth Flow**: JWT with access/refresh tokens, invite code validation on registration
4. **Database**: Prisma ORM with PostgreSQL (Supabase)

## Socket.io vs HTTP REST

**Use Socket.io** (real-time bidirectional):

- Random matching request/response, match cancel/accept/reject
- Call signaling (start, end, incoming notifications)

**Use HTTP REST** (request-response):

- Direct/friend matching (needs DB persistence even if socket disconnects)
- User CRUD, file uploads, non-real-time operations

### Socket Events

Client → Server: `match:request`, `match:cancel`, `call:accept`, `call:reject`, `call:end`
Server → Client: `match:waiting`, `match:found`, `match:failed`, `match:cancelled`, `call:incoming`, `call:accepted`, `call:rejected`, `call:ended`

## Database Migration (Supabase)

**Important**: Do NOT use `prisma db push` or `prisma migrate deploy` directly - they have compatibility issues with Supabase pooler.

1. Modify `backend/prisma/schema.prisma`
2. Generate migration SQL only: `npx prisma migrate dev --name <name> --create-only`
3. **Provide the SQL to user** for manual execution in Supabase Dashboard → SQL Editor
4. After user confirms execution: `npm run prisma:generate`

## API Response Format

All API responses must follow this format:

```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "User-friendly message" } }
```

## Code Conventions

### File Naming

- Files: `kebab-case.ts` (e.g., `auth-controller.ts`)
- Components: `PascalCase.tsx` (e.g., `HomeScreen.tsx`)

### Frontend Environment Variables

Use `mobile/src/config/env.ts` for centralized env access, NOT direct `Config` imports:

```typescript
import { ENV } from "@/config/env";
const api = axios.create({ baseURL: ENV.API_BASE_URL });
```

Development auto-detects localhost (iOS: `localhost:5000`, Android: `10.0.2.2:5000`).

### Backend Controller Pattern

Controllers are thin - extract logic to services:

```typescript
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await registerUser(req.body); // Service handles logic
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

## External Services

| Service  | Purpose                          | Config Location                                 |
| -------- | -------------------------------- | ----------------------------------------------- |
| Supabase | PostgreSQL + Storage             | `backend/src/config/database.ts`, `supabase.ts` |
| Agora    | Video calls (10,000 min/mo free) | `backend/src/controllers/agora-controller.ts`   |
| Firebase | FCM push notifications           | `backend/src/config/firebase.ts`                |
| Upstash  | Redis cache                      | `backend/src/config/redis.ts`                   |

## Reference Documentation

- [docs/PRD.md](docs/PRD.md) - Product requirements, beta strategy, invite code system
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture diagrams
- [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) - Complete API reference
- [docs/UI_FLOW.md](docs/UI_FLOW.md) - Screen designs, user flows
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [TDD_HELP.md](docs/TDD_HELP.md) - Test-Driven Development guide
