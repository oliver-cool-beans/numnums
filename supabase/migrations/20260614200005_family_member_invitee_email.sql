-- Store the acceptor's email on their family_members row so the family screen
-- can show something useful before they set a display name.
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS invitee_email text;

-- Backfill existing rows from auth.users (safe here since migrations run as superuser).
UPDATE public.family_members fm
SET invitee_email = au.email
FROM auth.users au
WHERE fm.user_id = au.id
  AND fm.invitee_email IS NULL;

-- Allow users to update their own profile row (needed for the post-invite name setup).
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DROP first because PostgreSQL won't let CREATE OR REPLACE change a return type.
DROP FUNCTION IF EXISTS public.accept_invite(uuid);

-- Update accept_invite to:
--   1. Populate invitee_email on the new family_members row.
--   2. Return the invite kind so the frontend can route family acceptors to
--      the name-setup screen.
CREATE OR REPLACE FUNCTION public.accept_invite(invite_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv            record;
  acceptor       uuid := auth.uid();
  acceptor_email text;
BEGIN
  IF acceptor IS NULL THEN
    RAISE EXCEPTION 'must be authenticated to accept an invite';
  END IF;

  SELECT * INTO inv FROM public.invites WHERE id = invite_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite not found';
  END IF;

  IF inv.expires_at <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'invite has expired';
  END IF;

  IF inv.inviter_id = acceptor THEN
    RAISE EXCEPTION 'cannot accept your own invite';
  END IF;

  SELECT email INTO acceptor_email FROM auth.users WHERE id = acceptor;

  IF inv.kind = 'family' THEN
    INSERT INTO public.family_members (family_id, user_id, role, invitee_email)
    VALUES (inv.family_id, acceptor, 'member', acceptor_email)
    ON CONFLICT (family_id, user_id) DO NOTHING;
  ELSE
    INSERT INTO public.friendships (requester_id, addressee_id)
    VALUES (inv.inviter_id, acceptor)
    ON CONFLICT (requester_id, addressee_id) DO NOTHING;
  END IF;

  DELETE FROM public.invites WHERE id = invite_id;

  RETURN inv.kind;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;
