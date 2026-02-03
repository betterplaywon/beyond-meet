# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Guidelines

**IMPORTANT**: All explanations and communications with the user MUST be in Korean (한글). Internal thinking and technical analysis can be in English, but all user-facing messages, explanations, and documentation must be written in Korean.

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
├── services/       # Business logic (auth, match, call, push, admin, storage, moderation, user, email)
├── routes/         # Express route definitions (auth, user, friends, call, agora, push, admin, moderation)
├── middlewares/    # auth.ts, errorHandler.ts, rateLimiter.ts, admin.ts, upload.ts, validation.ts
├── sockets/        # Socket.io handlers (match-handler.ts)
├── config/         # database.ts (Prisma), redis.ts, firebase.ts, supabase.ts, resend.ts
└── utils/          # jwt.ts, password.ts, validation.ts, image-validator.ts, age.ts, user-status.ts, relationship-checks.ts
```

### Mobile Structure

```
mobile/src/
├── screens/        # Screen components by feature (auth/, home/, match/, call/, profile/, friends/, admin/)
├── components/     # Reusable UI (common/, common/buttons/, call/, moderation/)
├── navigation/     # RootNavigator, AuthNavigator, MainNavigator, AdminNavigator
├── services/       # API clients (api.ts, socketService.ts, pushService.ts, notificationService.ts, tokenRefresh.ts)
├── hooks/          # Custom hooks (useAuth, useSocket, useFriends, useProfile, useCallHistory, useAdmin, usePushNotifications, useNotificationSetup, useFriendStatusSync, useEmailVerification)
├── hooks/call/     # Call-related hooks (useAgoraEngine, useCallEnd, useCallSocketEvents, useCallTimer, useModeration)
├── store/          # Zustand stores (authStore.ts, callStore.ts, languageStore.ts, index.ts)
├── api/            # API endpoint functions (auth.api.ts, agora.api.ts, client.ts)
├── constants/      # Query keys (queryKeys.ts)
├── styles/         # Design system (theme.ts)
├── i18n/           # Internationalization (locales: ko, en, ja)
└── config/         # env.ts (centralized environment variables)
```

### Key Architectural Patterns

1. **State Management**: Zustand for client state, React Query (@tanstack/react-query) for server state
2. **Real-time**: Socket.io for matching/calls, HTTP REST for CRUD operations
3. **Auth Flow**: JWT with access/refresh tokens, invite code validation on registration
4. **Database**: Prisma ORM with PostgreSQL (Supabase)
5. **File Storage**: Supabase Storage for profile photos (via storage-service.ts)
6. **Input Validation**: Zod schemas for request validation (via validation.ts)

## Socket.io vs HTTP REST

**Use Socket.io** (real-time bidirectional):

- Random matching request/response, match cancel/accept/reject
- Call signaling (incoming, accept, reject, end)
- Direct call request (DIRECT match type)
- Friend status broadcasts (online/offline)
- Moderation warnings and force-end

**Use HTTP REST** (request-response):

- User CRUD, file uploads, non-real-time operations
- Call history, session info retrieval
- Friends and block list management
- Admin operations

### Socket Events

Client → Server: `match:request`, `match:cancel`, `call:accept`, `call:reject`, `call:end`, `moderation:warning`, `moderation:force-end`

Server → Client: `match:waiting`, `match:found`, `match:failed`, `match:cancelled`, `call:incoming`, `call:requested`, `call:accepted`, `call:rejected`, `call:ended`, `call:failed`, `friend:status-changed`, `moderation:warning-received`, `moderation:call-force-ended`, `auth:token-refreshed`

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

### Input Validation Pattern

Use Zod schemas from `utils/validation.ts`:

```typescript
import { registerSchema, formatZodError } from '../utils/validation';

const result = registerSchema.safeParse(req.body);
if (!result.success) {
  throw new AppError(400, 'VALIDATION_ERROR', formatZodError(result.error));
}
```

### File Upload Pattern

Use Multer middleware with Supabase Storage:

```typescript
// Route with upload middleware
router.post('/me/photos', uploadLimiter, upload.single('photo'), userController.uploadProfilePhoto);

// Service handles Supabase upload
import { uploadProfilePhoto, deleteProfilePhoto } from '../services/storage-service';
```

## External Services

| Service  | Purpose                          | Config Location                                 |
| -------- | -------------------------------- | ----------------------------------------------- |
| Supabase | PostgreSQL + Storage             | `backend/src/config/database.ts`, `supabase.ts`, `services/storage-service.ts` |
| Agora    | Video calls (10,000 min/mo free) | `backend/src/controllers/agora-controller.ts`   |
| Firebase | FCM push notifications           | `backend/src/config/firebase.ts`                |
| Upstash  | Redis cache                      | `backend/src/config/redis.ts`                   |
| Hugging Face | AI content moderation        | `backend/src/services/moderation-service.ts`    |
| Resend   | Email verification               | `backend/src/config/resend.ts`, `services/email-service.ts` |

## Reference Documentation

- [docs/PRD.md](docs/PRD.md) - Product requirements, beta strategy, data models
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture, DB schema, auth flow
- [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) - REST API endpoints
- [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md) - Socket.io events with payloads
- [docs/CODING_RULES.md](docs/CODING_RULES.md) - Controller/Service patterns, error handling
- [docs/UI_FLOW.md](docs/UI_FLOW.md) - Design system, screen flow
- [docs/AI_CONTENT_MODERATION.md](docs/AI_CONTENT_MODERATION.md) - AI moderation settings
- [docs/TODO.md](docs/TODO.md) - Remaining tasks and improvements
- [docs/BUILD_DEPLOYMENT_GUIDE.md](docs/BUILD_DEPLOYMENT_GUIDE.md) - iOS/Android build and deployment
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide, environment variables
