# Code Style & Conventions

## TypeScript Configuration
- **Strict mode enabled** with comprehensive type checking
- **ES2017 target** for broad browser compatibility
- **Path mapping**: `@/*` maps to `./src/*` for clean imports
- **JSX preserve mode** for Next.js optimization

## ESLint Rules & Style
- Extends Next.js core web vitals and TypeScript recommended rules
- **@typescript-eslint/no-explicit-any**: Disabled (allows `any` type when needed)
- **@typescript-eslint/no-unused-vars**: Warning level
- **react-hooks/exhaustive-deps**: Warning level (not error)
- **react-hooks/rules-of-hooks**: Error level
- Warnings for unused variables, missing dependencies, unescaped entities

## Naming Conventions
- **Components**: PascalCase (e.g., `UserAvatar`, `QuestionCard`)
- **Files**: kebab-case for UI components, PascalCase for React components
- **Services**: kebab-case with `-service` suffix (e.g., `ai-service.ts`)
- **Types/Interfaces**: PascalCase (e.g., `UserAvatarProps`, `AIResponse`)
- **Constants**: camelCase for local, SCREAMING_SNAKE_CASE for globals

## Component Structure
- **Functional components** with TypeScript interfaces for props
- **Props interfaces** named with `Props` suffix (e.g., `UserAvatarProps`)
- **Default exports** for main components, named exports for utilities
- **Consistent destructuring** of props in function parameters

## Import Organization
- External libraries first
- Internal modules grouped by type (components, services, types)
- Relative imports last
- Use path mapping (`@/`) for cleaner imports

## Service Layer Pattern
- Business logic centralized in service classes
- Services follow singleton pattern with exported instances
- Comprehensive error handling and type safety
- Clear separation between data access and business logic

## Styling Approach
- **Tailwind CSS** with utility-first approach
- **CSS variables** for theme consistency
- **shadcn/ui** components as base with customization
- **Conditional styling** using `clsx` and `class-variance-authority`

## File Organization
- Components organized by feature domain (`auth/`, `groups/`, `questions/`)
- Shared components in `ui/` directory
- Services in dedicated `services/` directory
- Types co-located with related components or in service files