ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'receptionist';
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";
--> statement-breakpoint

-- Trigger function to automatically replicate newly registered Supabase auth.users to public.users
-- NOTE: In this single-clinic bootstrap phase, newly registered users are automatically linked to the first existing clinic.
-- This MUST be replaced with a secure invite token/tenant onboarding flow in production!
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_clinic_id UUID;
  v_full_name TEXT;
  v_role public.user_role;
BEGIN
  -- Select the first existing clinic (single-clinic bootstrap mode)
  SELECT id INTO v_clinic_id FROM public.clinics ORDER BY created_at ASC LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE WARNING 'No clinic found in public.clinics during handle_new_auth_user execution';
    RETURN NEW;
  END IF;

  -- Extract raw user metadata if available, otherwise fallback to email/default
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Extract role from metadata if specified, otherwise default to receptionist
  BEGIN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'receptionist'::public.user_role;
  END;

  INSERT INTO public.users (id, clinic_id, email, full_name, role, active)
  VALUES (
    NEW.id,
    v_clinic_id,
    NEW.email,
    COALESCE(v_full_name, 'Staff Member'),
    COALESCE(v_role, 'receptionist'::public.user_role),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();