# Chindupolitique - Project Context for Agents

## Stack
- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS
- Database: Supabase (see /supabase folder for schema and migrations)
- Testing: Playwright + Vitest
- Hosting: Vercel (auto-deploy on push to main)
- Package manager: Bun (use bun instead of npm)
- Repo: https://github.com/Bifrii/chindupolitique

## Key files
- src/          -> all React components and pages
- supabase/     -> database schema, migrations, edge functions
- public/       -> static assets
- index.html    -> entry point
- vite.config.ts -> build config
- tailwind.config.ts -> styling config
- .env          -> environment variables (NEVER commit this file)

## Agent rules
- NEVER touch .env or commit secrets
- NEVER push directly to main - always use a feature branch
- Use bun to install packages: bun add [package]
- Run tests before pushing: bun run test
- Commit message format: fix/feat/chore/refactor: short description
- After any change, update PROJECT.md if the stack changes

## Agent workflows

### Fix a bug
1. @analyst reads the relevant files in src/ and identifies the problem
2. @dev creates branch fix/bug-name, edits the file, commits and pushes
3. @reporter summarises what was changed and why

### Add a feature
1. @strategist defines what to build and in which file
2. @dev creates branch feat/feature-name, implements, commits and pushes
3. @reporter documents what was added

### Database change
1. @analyst reads supabase/ folder first
2. @dev creates migration file in supabase/migrations/
3. @reporter documents the schema change
