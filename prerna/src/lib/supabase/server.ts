import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Ensure environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL for server client. Check .env file.');
}
if (!supabaseAnonKey) {
  throw new Error('Missing Supabase Anon Key for server client. Check .env file.');
}

// Server client for use in Server Actions and Route Handlers
export async function createSupabaseServerActionClient() {
  const cookieStore = await cookies();
  
  // Temporary console.log to debug environment variables
  console.log('Supabase URL in server client:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Supabase Anon Key in server client:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              path: '/',
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            });
          } catch (error) {
            console.error('Cookie set error:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: '',
              path: '/',
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              expires: new Date(0),
            });
          } catch (error) {
            console.error('Cookie remove error:', error);
          }
        },
      },
    }
  );
}

// Server client for use in Server Components (read-only operations)
export async function createSupabaseServerComponentClient() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return (cookieStore as any).get(name)?.value;
        },
        // No set/remove for server components as they should not modify cookies directly
      },
    }
  );
}