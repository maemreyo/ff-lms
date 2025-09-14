# Tech Stack

## Frontend Framework
- **Next.js 15** with App Router pattern
- **React 19.1.0** with React DOM
- **TypeScript 5** with strict mode enabled
- **Turbopack** for faster builds and development

## UI Framework & Styling
- **Radix UI** components for accessibility
- **shadcn/ui** component system (New York style variant)
- **Tailwind CSS v4** for styling with CSS variables
- **Framer Motion** for animations
- **Lucide React** for icons
- **class-variance-authority** and **clsx** for conditional styling

## Backend & Database
- **Supabase** for backend services (auth, database, real-time)
- **PostgreSQL** database with Row Level Security (RLS) policies
- Database migrations managed in `/migrations/` directory
- Generated TypeScript types from Supabase schema

## AI Integration
- **Anthropic Claude SDK** (primary AI provider)
- **OpenAI** SDK for GPT models
- **Google Generative AI** for additional capabilities

## State Management
- **TanStack Query v5** for server state management with persistence
- **TanStack Query Persist Client** for cache persistence using session storage
- **React Context** for global state (AuthContext)

## Form Management & Validation
- **React Hook Form** for form handling
- **Zod v4** for schema validation
- **@hookform/resolvers** for form validation integration

## Development Tools
- **ESLint** with Next.js and TypeScript rules
- **PostCSS** for CSS processing
- **pnpm** as the package manager (required)

## Additional Libraries
- **youtubei.js** for YouTube integration
- **date-fns** for date manipulation
- **uuid** for unique identifier generation
- **driver.js** for user onboarding/tours
- **sonner** for toast notifications