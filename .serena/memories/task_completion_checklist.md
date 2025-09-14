# Task Completion Checklist

## When Any Code Task is Completed

### 1. Type Checking (MANDATORY)
```bash
pnpm typecheck
```
- Must pass without errors before considering task complete
- Fix any TypeScript compilation errors
- Ensure all imports and types are correct

### 2. Linting (MANDATORY)
```bash
pnpm lint
```
- Must pass ESLint checks
- Fix any linting errors or justified warnings
- Ensure code follows project conventions

### 3. Build Verification (RECOMMENDED)
```bash
pnpm build
```
- Verify the application builds successfully
- Catch any build-time errors or issues
- Ensures production readiness

### 4. Type Generation (If Database Changes)
```bash
pnpm type:gen
```
- Run only if Supabase schema/migrations were modified
- Updates TypeScript types from database schema
- Commit the generated types file

## Development Workflow Quality Gates

### Before Committing
1. **Code compiles**: `pnpm typecheck` passes
2. **Linting passes**: `pnpm lint` passes
3. **Application builds**: `pnpm build` succeeds
4. **Types are current**: Run `pnpm type:gen` if database changed

### For Feature Development
1. **Service layer first**: Implement business logic in services
2. **Type safety**: Define interfaces for all data structures
3. **Error handling**: Implement proper error boundaries
4. **Component isolation**: Ensure components have single responsibility

### For Database Changes
1. **Create migration**: Add SQL migration in `/migrations/`
2. **Update types**: Run `pnpm type:gen` after schema changes
3. **Update RLS policies**: Ensure proper Row Level Security
4. **Test data access**: Verify service layer works with changes

## Quality Standards
- **No TypeScript errors**: Code must compile cleanly
- **ESLint compliance**: Follow established code style
- **Service architecture**: Keep business logic in service layer
- **Type definitions**: All props and data structures typed
- **Error handling**: Graceful error handling throughout
- **Performance**: Consider cache invalidation for TanStack Query

## Documentation Updates
- Update CLAUDE.md if architecture changes significantly
- Document new services or major component patterns
- Update deployment notes if build process changes