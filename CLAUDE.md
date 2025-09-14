# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fluent Flow is a language learning platform focused on interactive video lessons. It's built as a Next.js application with Supabase backend integration for user management, groups, quizzes, and progress tracking.

## Development Commands

- **Development server:** `pnpm dev` (runs on port 3838)
- **Build:** `pnpm build`
- **Production start:** `pnpm start`
- **Linting:** `pnpm lint`
- **Type checking:** `pnpm typecheck`
- **Generate Supabase types:** `pnpm type:gen`

**Important:** Always use `pnpm` as the package manager. The project uses pnpm-lock.yaml.

## Architecture Overview

This is a Next.js 15 application using the App Router pattern with the following key architectural layers:

### Core Structure
- **`src/app/`** - Next.js App Router pages and API routes
- **`src/components/`** - Reusable UI components organized by feature
- **`src/lib/services/`** - Business logic layer with comprehensive services
- **`src/lib/supabase/`** - Database client configurations and types
- **`src/hooks/`** - Custom React hooks
- **`src/contexts/`** - React context providers

### Key Services Architecture
The application follows a service-oriented architecture with specialized services:
- **AI Service** (`ai-service.ts`) - Handles AI integrations (Anthropic, OpenAI, Google)
- **Loop Management** (`loop-management-service.ts`) - Core loop functionality
- **Group Service** (`groups-service.ts`) - Group management and collaboration
- **Question Generation** (`question-generation-service.ts`) - Quiz question generation
- **Progress Tracking** (`progress-tracking-service.ts`) - User progress analytics
- **Notification Service** (`notification-service.ts`) - In-app notifications
- **User Service** (`user-service.ts`) - User management and authentication

### Database Layer
- Uses Supabase for backend services
- Database migrations are in `/migrations/` directory
- Row Level Security (RLS) policies are implemented
- Generated TypeScript types in `src/lib/supabase/types.ts`

### UI Framework
- **Radix UI** components for accessibility
- **shadcn/ui** component system (New York style)
- **Tailwind CSS v4** for styling
- **Framer Motion** for animations
- **Lucide React** for icons

### State Management
- **TanStack Query** for server state with persistence
- **React Context** for global state (AuthContext)
- Session storage for quiz cache persistence

## Configuration Notes

### Next.js Configuration
- Uses Turbopack for faster builds and development
- Router cache is disabled (`staleTimes: { dynamic: 0, static: 0 }`)
- Custom port 3838 for development

### TypeScript Configuration
- Strict mode enabled
- Path mapping: `@/*` maps to `./src/*`
- ES2017 target for broad compatibility

### ESLint Configuration
- Extends Next.js core web vitals and TypeScript rules
- Custom rules disable strict `no-explicit-any`
- Warnings for unused variables and hook dependencies

## Key Features

### Multi-AI Integration
The platform integrates multiple AI providers:
- Anthropic Claude (primary)
- OpenAI GPT models
- Google Generative AI

### Group Learning
- Group creation and management
- Shared questions and quizzes
- Group invitations and join requests
- Group-specific sessions and progress tracking

### Interactive Video Learning
- YouTube integration via `youtubei.js`
- Loop-based learning sessions
- Vocabulary enhancement
- Custom prompt systems for learning

### Question Generation
- AI-powered question generation from video content
- Multiple question types and difficulty levels
- Favorites system for questions
- Shared question pools within groups

## Deployment

The project includes deployment documentation in Vietnamese (`DEPLOYMENT.md`) for Vercel deployment. Key points:
- Configured for Vercel deployment
- Root directory should be set to project folder
- Environment variables need to be configured
- Auto-deployment on git pushes

## Database Schema

Database uses Supabase with these key tables:
- User profiles and authentication
- Groups and memberships
- Questions and quiz results
- Sessions and progress tracking
- Custom prompts and vocabulary
- Notifications and group invitations

Migration files provide schema evolution history in `/migrations/`.