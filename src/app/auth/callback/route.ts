import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const INVITATION_TOKEN = /^[0-9a-f]{64}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const invite = url.searchParams.get("invite") ?? "";
  const oauthError = url.searchParams.get("error");
  const oauthProvider = url.searchParams.get("provider");
  const oauthErrorCode = url.searchParams.get("error_code") ?? "";
  if (oauthError && oauthProvider === 'google') {
    const duplicate = oauthErrorCode === 'identity_already_exists' || /already exists|already registered/i.test(url.searchParams.get('error_description') ?? '');
    return NextResponse.redirect(new URL(`/auth/login?error=${duplicate ? 'google_existing_account' : 'google_cancelled'}`, request.url));
  }
  if (!code) return NextResponse.redirect(new URL("/auth/login?error=auth_callback", request.url));
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (INVITATION_TOKEN.test(invite)) {
      const { data, error: acceptError } = await supabase.rpc("accept_company_invitation", {
        p_invitation_token: invite,
        p_full_name: undefined,
      });
      if (acceptError || !data?.[0]) {
        return NextResponse.redirect(new URL(`/auth/invite?token=${invite}&error=invite`, request.url));
      }
      return NextResponse.redirect(new URL("/catalogo", request.url));
    }
    return NextResponse.redirect(new URL("/auth/after-login", request.url));
  } catch {
    return NextResponse.redirect(new URL("/auth/login?error=auth_callback", request.url));
  }
}
