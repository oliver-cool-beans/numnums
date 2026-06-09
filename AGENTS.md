# AGENTS.md

## Purpose

This repository is evolving into a monorepo with separately deployed applications, starting with a Next.js admin panel based on the Vercel Next.js Postgres admin template structure.

The admin panel uses:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase auth for login and current user session
- Next.js server-side API endpoints for all application data reads and writes

These rules exist to keep the codebase small, reusable, and easy to extend without accumulating dead abstractions.

## Core Principles

### Write once, use everywhere

- Put business rules, parsing logic, validation, and data transformations in shared modules, not duplicated across routes, pages, and components.
- If logic is needed in more than one place, move it to the closest shared module immediately.
- Prefer one well-designed implementation over multiple similar helpers.
- Do not copy and tweak code when a shared function or component can solve the problem.

### No useless stubs

- Do not create placeholder functions, placeholder components, or fake service layers that do not yet solve a real problem.
- Do not add `TODO` files, empty wrappers, speculative hooks, or dead interfaces.
- Every file should exist because it provides current value.
- If a feature is not being built yet, omit the code entirely.

### Small surface area

- Prefer fewer files with cohesive responsibility over fragmented micro-files.
- Avoid creating files that only re-export symbols from a sibling file unless there is a real boundary benefit.
- Avoid barrel files that hide ownership and make imports ambiguous.
- Group like code together so ownership is obvious.

### Build from the real path

- Start from the screen, route, endpoint, or script that directly owns the behavior.
- Fix issues at the source rather than layering adapters over unclear code.
- Prefer direct, boring code over clever indirection.

## TypeScript Standards

### Naming

- Use `camelCase` for variables, functions, parameters, object keys, and file-local constants.
- Use `PascalCase` for React components, types, and interfaces.
- Use `UPPER_SNAKE_CASE` only for true constants shared across a module, such as static configuration values.
- Function names must be short, descriptive, and action-oriented.
- Good examples: `parseIngredient`, `listProducts`, `getCurrentUser`, `buildImportSummary`, `approveLink`.
- Bad examples: `doThing`, `handleDataStuff`, `processAndTransformRecipeIngredientData`, `helper`.

### Types

- Prefer explicit domain types at boundaries: API payloads, database records, import input, and UI view models.
- Prefer `type` aliases unless an `interface` is required for extension or implementation semantics.
- Never use `any` unless there is no practical alternative at a foreign boundary. Narrow it immediately.
- Use `unknown` for untrusted input, then validate and convert.
- Keep types close to the code that owns them unless they are shared across apps or packages.

### Functions

- Keep functions focused on one job.
- Prefer pure functions for parsing, mapping, formatting, and derived state.
- Separate data fetching from data transformation.
- Avoid functions with hidden side effects.
- Keep parameter lists short. If a function takes many related inputs, pass a typed object.

### Control flow

- Prefer early returns over nested conditionals.
- Fail fast on invalid input.
- Handle impossible states explicitly.
- Do not bury core logic inside large callback chains.

## Next.js Standards

### App Router defaults

- Use Server Components by default.
- Use Client Components only when browser-only interactivity is required.
- Keep route segments aligned to product features, not technical layers.
- Put route-specific UI next to the route that owns it.

### Data access

- The browser must not read or write application tables directly.
- All reads and writes for products, recipes, users, ingredients, imports, and links go through Next.js API routes or server-side modules invoked by those routes.
- Supabase in the browser is for auth and current-session state only.
- Server-side modules own database access and permission checks.

### Validation

- Validate every route input at the boundary.
- Validate query params, route params, and request bodies before business logic runs.
- Return typed, predictable response shapes.
- Do not leak raw database or third-party errors directly to the client.

### Server modules

- Put server-only logic in server-only modules.
- Separate route handlers from domain logic.
- A route should orchestrate request parsing, auth, and response formatting.
- Domain modules should perform the actual work.

## Supabase Standards

### Auth boundary

- Use Supabase auth for login, logout, session lookup, and current user information.
- Centralize session and role checks in reusable server utilities.
- Non-admin users must be blocked before any admin data operation runs.

### Database boundary

- All database access belongs on the server.
- Use a small set of clearly named query modules per domain instead of ad hoc SQL scattered across the app.
- Do not use Supabase RPCs for normal application reads or writes when a direct server-side table query will do. Prefer simple queries over database functions unless there is a clear need that cannot be expressed cleanly otherwise.
- Prefer the Supabase server client query builder for normal application reads and writes. Do not introduce RPCs or database functions for simple lookup flows such as loading the next review item when a direct server-side query is sufficient.
- Do not issue database reads inside per-row loops for page loads or normal admin actions when an inner join, left join, nested relation select, or other single-query shape can return the same data. Prefer one bounded query over N+1 follow-up reads.
- Keep read queries and write commands separate when it improves clarity.
- Normalize external data on ingest instead of pushing raw source structures into the UI.
- When using the Supabase Data API for application tables, keep grants and RLS policies explicit and capture both in the same migration.
- Admin-only tables exposed through the Data API must have RLS enabled and must restrict access to authenticated admin users only.

### Database size

- We run on the Supabase free tier — total database size must be kept to a minimum.
- Every migration and schema design must use the minimal structure required to operate: no speculative columns, no redundant pointers that duplicate data already derivable from another table, no indexes that don't serve a real query or RLS policy.
- Before adding a column, ask whether the value can be derived from an existing row instead (e.g. an "owner" is just the membership row with `role = 'owner'`, not a separate foreign key on the parent).
- Prefer composite primary keys over surrogate UUIDs for pure join/membership tables — it avoids an extra column and an extra unique index.
- Drop bookkeeping columns whose information is already captured elsewhere (e.g. don't store who/when an invite was accepted on the invite row when the resulting membership row already records both).

### Schema changes

- Any database schema change, grant, trigger, function, seed dependency, or RLS policy change must be captured in this repository as a migration or tracked schema file.
- Do not rely on one-off SQL run manually against the remote Supabase project as the source of truth.
- If an urgent remote fix is applied, the exact same change must be added to the repo immediately in the next migration so local, staging, and production environments stay reproducible.
- Treat the `supabase/migrations` directory as the canonical history of database changes.

## Component Standards

### Foundational shadcn components first

- Create or adopt a small, reusable set of foundational UI components before building page-specific variants.
- Start with the primitives the app will reuse heavily: table wrappers, data toolbar controls, status badges, page headers, empty states, dialogs, form fields, and pagination controls.
- Extend shadcn components through composition, not copy-paste forks.
- If a component is only used once and is tightly page-specific, keep it local to that feature.

### Reuse rules

- Reuse existing components before creating new ones.
- When adding a new shared component, make sure it solves at least one repeated pattern.
- Do not create a shared component whose API is vague or overly configurable.
- Prefer clear props over configuration-heavy component factories.

### Styling

- Use Tailwind utility classes directly when the styling is local and simple.
- Extract repeated visual patterns into reusable components, not utility wrappers.
- Use `cn`-style class merging consistently if the foundation includes it.
- Keep variants intentional and limited.
- Prefer flex-based layouts. Use `justify-center` and `items-center` to center content within containers. Constrain width with `max-w-*` and pair with `mx-auto` so content is centered rather than left-anchored on wide screens.

## Directory Layout

Use feature ownership and proximity.

### Preferred shape

```text
apps/
  admin/
    app/
    components/
      ui/
      layout/
      tables/
    server/
      auth/
      db/
      importers/
      ingredients/
      products/
      recipes/
      users/
    lib/
    types/
packages/
  config/
  types/
  db/
src/
  scripts/
```

### Group like code together

- Keep product code with product code, ingredient code with ingredient code, and import code with import code.
- Do not scatter one feature across unrelated top-level utility folders.
- Keep route-specific helpers close to the route until reuse is proven.
- Promote code upward only when multiple features depend on it.

## File Rules

- A file should have one clear reason to change.
- Do not create files that only export constants, types, and wrappers unless they form a real shared boundary.
- Avoid `index.ts` export barrels as a default pattern.
- Prefer direct imports from the owning module so dependencies stay obvious.
- Keep test files next to the code they validate when tests are added.

## API and Domain Design

### Endpoints

- Design endpoints around domain actions, not generic transport patterns.
- Good examples: `GET /api/ingredients/unmatched`, `POST /api/ingredient-links`, `PATCH /api/ingredient-links/:id`.
- Avoid generic endpoints like `/api/data` or `/api/update-item`.

### Domain modules

- Create small domain modules with clear verbs.
- Good examples: `listUnmatchedIngredients`, `searchProducts`, `upsertAldiProducts`, `upsertEveryPlateRecipes`, `updateIngredientLinkStatus`.
- Keep transformation logic out of React components.

## Error Handling and Logging

- Use clear error messages that explain what failed and where.
- Log useful server-side context for imports and admin mutations.
- Do not swallow errors.
- Do not return stack traces to the browser.
- Prefer deterministic failures over silent partial success.

## Data Import Standards

- Treat scraper output as untrusted input.
- Parse and normalize JSON before database writes.
- Preserve raw payloads for debugging, but do not make the UI depend on raw source shapes.
- Record import runs with counts and failure details.
- Make import operations idempotent where possible.
- Do not run fetch or import scripts, or any bulk data-loading command, unless the user explicitly asks for that execution in the current task.

## Matching Workflow Standards

- Suggestions are not approvals.
- No ingredient-product link becomes live without an explicit approved state.
- Same-source reuse is acceptable only when an approved mapping already exists for that exact normalized handle.
- Cross-source reuse must remain a suggestion until approved.
- Keep approval actions auditable.

## Testing and Verification

- Verify behavior with the narrowest useful check after each change.
- Prefer testing domain logic and route behavior over snapshot-heavy UI tests.
- Test parsing and matching rules with realistic fixtures.
- Do not merge unvalidated refactors.

## Refactoring Rules

- Refactor only when it reduces duplication, clarifies ownership, or simplifies future work.
- Do not introduce abstraction ahead of use.
- If a refactor adds more names, files, or layers than it removes, justify it carefully.
- Preserve behavior while improving structure.

## What Good Looks Like

- Clear ownership by feature
- Minimal duplication
- Predictable naming
- Shared domain logic used across routes and UI
- Reusable foundational shadcn components
- Server-owned database access
- Tight, explicit TypeScript types
- No dead files, placeholder layers, or export-only clutter