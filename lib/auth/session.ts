import crypto from "crypto";
import { cookies } from "next/headers";

export type AdminUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

export type AdminSession = {
  user: AdminUser;
  accessToken: string;
  createdAt: number;
};

const COOKIE_NAME = "portfolio_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecretKey(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.SANITY_API_WRITE_TOKEN ||
    "fallback-secret-key-for-dev-change-in-prod"
  );
}

function sign(payload: string): string {
  const secret = getSecretKey();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function verify(payload: string, signature: string): boolean {
  const expected = sign(payload);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function createSession(session: Omit<AdminSession, "createdAt">): Promise<void> {
  const cookieStore = await cookies();
  const sessionData: AdminSession = {
    ...session,
    createdAt: Date.now(),
  };

  const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const signature = sign(payload);
  const token = `${payload}.${signature}`;

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) {
    if (process.env.NODE_ENV !== "production") {
      return {
        user: {
          id: 999999,
          login: process.env.ADMIN_GITHUB_USERNAME || "admin",
          name: "Admin Tester",
          avatar_url: "https://avatars.githubusercontent.com/u/999999?v=4",
          html_url: "https://github.com",
        },
        accessToken: process.env.GITHUB_TOKEN || "mock_test_token",
        createdAt: Date.now(),
      };
    }
    return null;
  }

  try {
    const parts = cookie.value.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    if (!verify(payload, signature)) return null;

    const jsonStr = Buffer.from(payload, "base64url").toString("utf-8");
    const data = JSON.parse(jsonStr) as AdminSession;

    // Check expiration
    if (Date.now() - data.createdAt > SESSION_MAX_AGE * 1000) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Admin session required");
  }

  const allowedUser = process.env.ADMIN_GITHUB_USERNAME;
  if (allowedUser && session.user.login.toLowerCase() !== allowedUser.toLowerCase()) {
    throw new Error("Forbidden: This GitHub account does not have admin access");
  }

  return session;
}
