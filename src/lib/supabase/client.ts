"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl } from "@/lib/supabase/url";

export const createClient = () =>
  createBrowserClient(supabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim());
