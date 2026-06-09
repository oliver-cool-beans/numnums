-- Email-based invites: the inviter types a recipient address and numnums sends
-- the invite itself, rather than the inviter sharing a link manually. Both
-- columns are populated together at creation time (the route signs the token
-- and builds the URL before inserting), so the event-dispatcher's webhook
-- handler can react to a single INSERT without needing the signing secret.
alter table public.invites
  add column if not exists invitee_email text,
  add column if not exists invite_url text;
