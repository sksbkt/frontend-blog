import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";

type GitHubAccessTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("github_oauth_state")?.value;
  const returnTo = cookieStore.get("github_oauth_return_to")?.value || "/admin";

  // Clean up oauth cookies
  cookieStore.delete("github_oauth_state");
  cookieStore.delete("github_oauth_return_to");

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=Invalid+state+parameter`, request.url),
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=Missing+GitHub+OAuth+credentials`, request.url),
    );
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as GitHubAccessTokenResponse;

    if (!tokenData.access_token) {
      const err = tokenData.error_description || tokenData.error || "Token exchange failed";
      return NextResponse.redirect(
        new URL(`${returnTo}?error=${encodeURIComponent(err)}`, request.url),
      );
    }

    // 2. Fetch authenticated user profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Portfolio-Admin-CMS",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        new URL(`${returnTo}?error=Failed+to+fetch+GitHub+profile`, request.url),
      );
    }

    const userData = (await userResponse.json()) as GitHubUserResponse;

    // 3. Verify admin restriction if configured
    const allowedAdmin = process.env.ADMIN_GITHUB_USERNAME;
    if (allowedAdmin && userData.login.toLowerCase() !== allowedAdmin.toLowerCase()) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(
            `Access denied. Only @${allowedAdmin} has admin access.`,
          )}`,
          request.url,
        ),
      );
    }

    // 4. Save session in encrypted cookie
    await createSession({
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
      },
      accessToken: tokenData.access_token,
    });

    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`${returnTo}?error=Unexpected+authentication+error`, request.url),
    );
  }
}
