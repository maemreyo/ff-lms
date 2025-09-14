# Codebase Structure

## Root Directory
```
├── migrations/           # Database migration files (9 SQL files)
├── public/              # Static assets
├── src/                 # Main source code
├── supabase/            # Supabase configuration
├── package.json         # Dependencies and scripts (uses pnpm)
├── next.config.ts       # Next.js configuration with Turbopack
├── tsconfig.json        # TypeScript configuration
├── eslint.config.mjs    # ESLint configuration
├── components.json      # shadcn/ui configuration (New York style)
├── DEPLOYMENT.md        # Vietnamese deployment guide for Vercel
└── CLAUDE.md           # Project documentation for AI assistants
```

## Source Structure (`src/`)
```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes (14 endpoints)
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard page
│   ├── groups/         # Group management pages (9 routes)
│   ├── loops/          # Loop/session pages
│   ├── profile/        # User profile pages
│   ├── questions/      # Question pages
│   ├── layout.tsx      # Root layout with providers
│   ├── page.tsx        # Home page
│   ├── providers.tsx   # TanStack Query + Auth providers
│   └── globals.css     # Global styles
│
├── components/          # React components organized by feature
│   ├── ui/             # shadcn/ui base components (50+ components)
│   ├── auth/           # Authentication components (6 components)
│   ├── groups/         # Group-related components (20+ components)
│   ├── questions/      # Question/quiz components (9 components)
│   ├── sessions/       # Session management components
│   ├── loops/          # Loop components
│   ├── profile/        # Profile components
│   ├── vocabulary/     # Vocabulary components
│   ├── layout/         # Layout components
│   ├── navigation/     # Navigation components
│   └── pages/          # Page-level shared components
│
├── lib/                # Utilities and services
│   ├── services/       # Business logic services (17 services)
│   ├── supabase/       # Database client configurations
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   └── permissions/    # Permission utilities
│
├── hooks/              # Custom React hooks (18+ hooks)
├── contexts/           # React contexts (AuthContext)
├── services/           # Additional services
└── styles/             # Additional style files
```

## Key Services (17 total)
- **ai-service.ts**: Multi-provider AI integration
- **loop-management-service.ts**: Core loop functionality
- **groups-service.ts**: Group management and collaboration
- **question-generation-service.ts**: AI question generation
- **progress-tracking-service.ts**: User analytics
- **notification-service.ts**: In-app notifications
- **user-service.ts**: User management
- **vocabulary-enhancement-service.ts**: Vocabulary features
- Plus 9 additional specialized services

## Database Layer
- **Supabase integration** with multiple client configurations
- **Row Level Security (RLS)** policies implemented
- **Generated TypeScript types** in `src/lib/supabase/types.ts`
- **9 migration files** tracking schema evolution
- **Service role** and **client-side** configurations

## Component Organization
- **Feature-based organization** (not by component type)
- **Shared UI components** in `ui/` directory (50+ components)
- **Domain-specific components** in feature directories
- **Page-level components** in `pages/shared/` for reusability