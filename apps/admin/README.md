# NumNums Admin

This app is the first deployed application inside the NumNums monorepo. It starts from the Vercel admin dashboard template structure, but the stack has been adapted for the platform requirements:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui primitives
- Supabase auth for login and current user session
- Shared server modules and dashboard pages backed by the Supabase Data API for product, recipe, ingredient, link, and user data access

## Foundation rules

- The browser does not read or write application tables directly.
- Supabase in the browser is only for auth and current-session state.
- Application data is fetched through Supabase with authenticated user context.
- The initial schema follows [database.md](/Users/oliver/Documents/github/numnums/database.md) with a few admin-oriented additions such as `import_runs`, audit fields, and user roles.

## Environment variables

Copy `.env.example` to `.env` inside `apps/admin` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` is only for local import scripts and other trusted server-side tasks. Do not expose it to the browser.

## Database setup

Apply the initial migration from [supabase/migrations/202605300001_initial_admin_schema.sql](/Users/oliver/Documents/github/numnums/supabase/migrations/202605300001_initial_admin_schema.sql).

That migration creates the catalogue, recipe, ingredient matching, users, and import run tables the admin app expects.

Apply [supabase/migrations/20260530032708_sync_admin_users_role.sql](/Users/oliver/Documents/github/numnums/supabase/migrations/20260530032708_sync_admin_users_role.sql) as well. It syncs Supabase Auth users into `public.users` by `auth.users.id`, which is what the admin app reads for authorization.

Apply [supabase/migrations/20260530080000_remove_public_user_email_and_lock_users_rls.sql](/Users/oliver/Documents/github/numnums/supabase/migrations/20260530080000_remove_public_user_email_and_lock_users_rls.sql) to remove mirrored email addresses from `public.users`, keep the table keyed only by auth user ID, and restrict `public.users` reads to each authenticated user's own row.

Apply [supabase/migrations/20260530070000_admin_data_api_rls.sql](/Users/oliver/Documents/github/numnums/supabase/migrations/20260530070000_admin_data_api_rls.sql) too. It exposes the admin tables to the `authenticated` role, revokes `anon`, enables RLS, and restricts access to admin users.

Because Supabase no longer exposes new tables automatically on recent projects, make sure these tables are available through the Data API after the migration is applied:

- `users`
- `products`
- `recipes`
- `recipe_ingredients`
- `ingredient_product_links`
- `import_runs`

To grant admin access to a user after they sign up, set their row in `public.users` to `role = 'admin'` using the auth user ID. For example:

```sql
update public.users
set role = 'admin'
where id = '00000000-0000-0000-0000-000000000000';
```

## Running the app

From the repository root:

```bash
pnpm install
pnpm dev
```

This starts `apps/admin` through the workspace root script.

To refresh and import recipe data from the repository root:

```bash
pnpm fetch:everyplate
pnpm import:aldi
pnpm import:everyplate
```

`pnpm fetch:everyplate` refreshes `src/scripts/output/ep-recipes-raw.json` from the current EveryPlate weekly menu.

`pnpm import:everyplate` refreshes the raw EveryPlate dump first, then imports it into Supabase and writes an `import_runs` audit row. `pnpm import:aldi` still imports the checked-in ALDI dump and writes its own `import_runs` audit row.

## Current scope

The current foundation includes:

- Login page wired to Supabase email/password auth
- Admin access via auth `app_metadata.role = 'admin'`
- Overview dashboard with schema-aware stats
- Products, recipes, unmatched ingredients, and access pages

The current foundation also includes manual JSON-to-database import scripts for ALDI products and EveryPlate recipes. Ingredient matching now uses direct live links, and unmatched ingredients are derived from recipe ingredients that do not yet have links.
