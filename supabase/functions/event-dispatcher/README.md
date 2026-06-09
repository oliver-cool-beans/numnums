# event-dispatcher

Single Edge Function fed by Database Webhooks on domain tables (no generic `events` log table). [index.ts](index.ts) is a thin generic router: it parses the `{table}:{type}` webhook payload and hands the row to each destination, which decides for itself whether (and how) to act on it.

- **Push** — [push.ts](push.ts) sends Web Push; row-specific copy lives in the small `PUSH_HANDLERS` map in [index.ts](index.ts).
- **Loops** — [loops.ts](loops.ts) owns all marketing/lifecycle email. It resolves the acting user's email via `supabase.auth.admin.getUserById` (`public.users` has no email column) and sends an event to the Loops Events API (`POST /api/v1/events/send`). Loops automations triggered by these events handle delivery — including the "you've been invited" email.

## One-time setup

1. **Generate VAPID keys** (used to sign Web Push messages):
   ```
   npx web-push generate-vapid-keys
   ```

2. **Create a Loops API key** (Loops → Settings → API → Create API Key).

3. **Set function secrets**:
   ```
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT="mailto:you@yourdomain.com" LOOPS_API_KEY=...
   ```
   (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.)

4. **Expose the VAPID public key to the client**: set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `apps/customer/.env` (and in Vercel project env vars) to the same public key from step 1.

5. **Deploy the function**:
   ```
   supabase functions deploy event-dispatcher
   ```

6. **Wire Database Webhooks** (Dashboard → Database → Webhooks), all pointing at this function's URL (`https://<project-ref>.functions.supabase.co/event-dispatcher`):
   - `users`, on **Insert** — fires "Signed Up"
   - `invites`, on **Insert** — fires "Invite Sent" for the subset created with a recipient address (`invitee_email`/`invite_url`, populated by the `/api/invites` route in one shot); the Loops automation triggered by this event handles emailing the invitee
   - `friendships`, on **Insert** — fires push + "Invite Accepted" (`type: friend`)
   - `family_members`, on **Insert** — fires push + "Invite Accepted" (`type: family`)
   - `user_meal_plans`, on **Insert** — fires "Meal Plan Created"
   - `shopping_lists`, on **Update** — fires "Shopping List Confirmed"/"Shopping List Completed" on status transitions
   - `user_recipe_progress`, on **Insert** and **Update** — fires "Recipe Started"/"Recipe Completed" on status transitions
   - `recipe_swap_suggestions`, on **Insert** and **Update** — fires "Recipe Swap Suggested" / "Recipe Swap Approved"
   - `user_notification_preferences`, on **Update** — fires "Email Notifications Updated" when `email_enabled` changes

## Adding a new notification or Loops event

- **Push**: add a `"table:TYPE"` entry to `PUSH_HANDLERS` in [index.ts](index.ts) with a handler.
- **Loops**: add a `"table:TYPE"` entry to `RESOLVERS` in [loops.ts](loops.ts) — a function that inspects the row (and `old_record` for updates) and calls `trackForUser`/`send` if it's worth forwarding. Wire up the matching Database Webhook if the table/event isn't already covered above.
