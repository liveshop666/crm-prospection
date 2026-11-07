import { createServerClient } from "@supabase/ssr";
import { supabaseUrl } from "@/lib/supabase/url";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/r/", "/offre/", "/api/n8n/", "/api/public/"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // Seuls les emails listés dans ALLOWED_EMAILS ont accès au CRM
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAllowed = !!user && (allowed.length === 0 || allowed.includes((user.email ?? "").toLowerCase()));

  if (!isPublic && !isAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (user && !isAllowed) url.searchParams.set("error", "non_autorise");
    return NextResponse.redirect(url);
  }
  return response;
}
