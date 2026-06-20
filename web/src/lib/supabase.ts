"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseEnv = Boolean(
  supabaseUrl && supabasePublishableKey
);

export function assertSupabaseEnv() {
  if (!hasSupabaseEnv) {
    throw new Error(
      "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
}

const fallbackSupabaseUrl = supabaseUrl ?? "https://placeholder.supabase.co";
const fallbackSupabasePublishableKey =
  supabasePublishableKey ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder";

export const supabase = createClient(
  fallbackSupabaseUrl,
  fallbackSupabasePublishableKey,
  {
  auth: {
    flowType: "pkce",
  },
  }
);
