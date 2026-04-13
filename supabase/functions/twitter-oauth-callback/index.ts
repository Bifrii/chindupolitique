import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const appUrl = Deno.env.get("APP_URL") || "https://chindupim.lovable.app";

    if (error || !code || !state) {
      return Response.redirect(`${appUrl}/parametres?twitter=error&reason=${error || "missing_params"}`, 302);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Retrieve stored state
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from("twitter_oauth_states")
      .select("*")
      .eq("state", state)
      .single();

    if (stateError || !stateData) {
      console.error("State not found:", stateError);
      return Response.redirect(`${appUrl}/parametres?twitter=error&reason=invalid_state`, 302);
    }

    // Clean up used state
    await supabaseAdmin.from("twitter_oauth_states").delete().eq("state", state);

    const TWITTER_CLIENT_ID = Deno.env.get("TWITTER_CLIENT_ID")!;
    const TWITTER_CLIENT_SECRET = Deno.env.get("TWITTER_CLIENT_SECRET")!;
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twitter-oauth-callback`;

    // Exchange code for tokens
    const basicAuth = btoa(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`);
    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
        code_verifier: stateData.code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errText);
      return Response.redirect(`${appUrl}/parametres?twitter=error&reason=token_exchange`, 302);
    }

    const tokens = await tokenResponse.json();

    // Fetch Twitter user info
    const userResponse = await fetch("https://api.x.com/2/users/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let twitterUsername = "";
    let twitterUserId = "";
    if (userResponse.ok) {
      const userData = await userResponse.json();
      twitterUsername = userData.data?.username || "";
      twitterUserId = userData.data?.id || "";
    }

    // Upsert tokens
    const { error: upsertError } = await supabaseAdmin
      .from("twitter_tokens")
      .upsert({
        user_id: stateData.user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        twitter_username: twitterUsername,
        twitter_user_id: twitterUserId,
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        connected_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Token upsert error:", upsertError);
      return Response.redirect(`${appUrl}/parametres?twitter=error&reason=save_tokens`, 302);
    }

    return Response.redirect(`${appUrl}/parametres?twitter=success&username=${twitterUsername}`, 302);
  } catch (e) {
    console.error("twitter-oauth-callback error:", e);
    const appUrl = Deno.env.get("APP_URL") || "https://chindupim.lovable.app";
    return Response.redirect(`${appUrl}/parametres?twitter=error&reason=unknown`, 302);
  }
});
