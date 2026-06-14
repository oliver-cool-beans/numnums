-- Add creator_id to families so the original founder can be distinguished from
-- owners who were promoted later. The creator cannot be removed; promoted owners
-- share the same 'owner' role in family_members but won't match creator_id.

ALTER TABLE public.families
  ADD COLUMN creator_id uuid REFERENCES public.users(id);

-- Backfill: for existing families, the creator is the earliest owner row.
UPDATE public.families f
SET creator_id = (
  SELECT fm.user_id
  FROM public.family_members fm
  WHERE fm.family_id = f.id
    AND fm.role = 'owner'
  ORDER BY fm.created_at ASC
  LIMIT 1
);

-- Update create_family() to stamp creator_id at creation time.
CREATE OR REPLACE FUNCTION public.create_family(family_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_family_id uuid;
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'must be authenticated to create a family';
  END IF;

  INSERT INTO public.families (name, creator_id)
  VALUES (family_name, caller)
  RETURNING id INTO new_family_id;

  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, caller, 'owner');

  RETURN new_family_id;
END;
$$;
