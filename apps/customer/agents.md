# Customer App Agent Rules

## Purpose

This app is the customer-facing mobile-first experience for NumNums.

## Architecture constraints

- Keep customer data access in frontend code via `@supabase/supabase-js` only.
- Do not add Next.js API routes, server actions, or server-side database modules for customer data access.
- Assume Row Level Security (RLS) policies enforce data authorization.

## Auth requirements

- Use Supabase Auth with Google OAuth for sign-in.
- Keep auth flows in client components.
- Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Never expose service role keys.

## UI rules

- DO NOT USE EMOJIS, ANYWHERE
- Mobile first by default.
- Use foundational shadcn components from `src/components/ui`.
- Keep page structure simple and readable.
- **Entire card/block must be the click target.** Never put onClick only on a text link inside a block — wrap the whole block in a `<button type="button">` or `<a>` so the full hit area is tappable/clickable. Links inside a block should be removed in favour of the block-level handler.

## Coding standards

- TypeScript first; avoid `any`.
- Prefer small reusable helpers and focused components.
- Validate behavior with lint and typecheck after each meaningful change.
