import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Ensure that the environment variables are defined
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}

const supabase = createBrowserClient(
  supabaseUrl,
  supabaseKey,
  {
    // Removed custom cookies configuration to allow createBrowserClient to handle it automatically.
    // The previous implementation was directly accessing `document.cookie`,
    // causing "document is not defined" errors during server-side rendering.
  }
);

export default supabase;