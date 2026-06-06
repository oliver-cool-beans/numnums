function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabasePublicEnvConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublishableKey());
}

export function isSupabaseServerEnvConfigured() {
  return isSupabasePublicEnvConfigured();
}

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function getSupabaseServiceEnv() {
  return null;
}