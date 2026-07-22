import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client bound to the request's cookies, so RLS
 * policies evaluate against the signed-in user's own JWT (auth.uid()).
 *
 * Safe to call from Server Components, Route Handlers, and Server Actions.
 * In Server Components `cookieStore.set` throws (cookies are read-only there)
 * -- that's expected and harmless since session refresh happens in proxy.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component - ignore, proxy.ts refreshes sessions.
          }
        },
      },
    }
  );
}
