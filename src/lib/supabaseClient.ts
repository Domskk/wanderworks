import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Export a function to create a new client (if needed)
export const createClient = () => {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Export a singleton instance (recommended for most use cases)
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);