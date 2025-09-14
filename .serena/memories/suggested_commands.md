# Essential Development Commands

## Package Management
**CRITICAL**: Always use `pnpm` as the package manager. Never use npm or yarn.
```bash
pnpm install          # Install dependencies
pnpm add <package>    # Add a new package
pnpm dev              # Start development server on port 3838
```

## Development Server
```bash
pnpm dev              # Start development server with Turbopack (port 3838)
```

## Build & Production
```bash
pnpm build            # Build the application with Turbopack
pnpm start            # Start production server
```

## Code Quality & Type Checking
```bash
pnpm lint             # Run ESLint for code linting
pnpm typecheck        # Run TypeScript compiler without emitting files
```

## Database & Types
```bash
pnpm type:gen         # Generate TypeScript types from Supabase schema
```

## System Commands (macOS/Darwin)
```bash
ls -la                # List files with details
find . -name "*.tsx"  # Find TypeScript React files
grep -r "pattern"     # Search for patterns in files
git status            # Check git repository status
git log --oneline     # View commit history
```

## Development Workflow
1. Start development: `pnpm dev`
2. Make changes to code
3. Run type checking: `pnpm typecheck`
4. Run linting: `pnpm lint`
5. Build to verify: `pnpm build`
6. Generate types if database changes: `pnpm type:gen`

## Important Notes
- Development server runs on port 3838 (not the default 3000)
- Uses Turbopack for faster builds and development
- Router cache is disabled to prevent stale page caching