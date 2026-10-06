import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  await clearSession();
  const url = new URL(request.url);
  const redirectUrl = url.searchParams.get("redirect") || "/admin";

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

export async function GET(request: Request) {
  await clearSession();
  const url = new URL(request.url);
  const redirectUrl = url.searchParams.get("redirect") || "/admin";

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
