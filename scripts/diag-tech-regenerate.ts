import crypto from "crypto";
import { prisma } from "../lib/prisma";

function createTestCookie() {
  const secret = process.env.AUTH_SECRET || "fallback-secret-key-for-dev-change-in-prod";
  const sessionData = {
    user: { id: 1, login: "admin", name: "Admin", avatar_url: "", html_url: "" },
    accessToken: "test",
    createdAt: Date.now(),
  };
  const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `portfolio_admin_session=${payload}.${signature}`;
}

async function run() {
  const cookie = createTestCookie();
  console.log(
    "[RUNNER] Dispatching POST to http://localhost:3000/api/admin/techs/jotai/regenerate (30s timeout)..."
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error("[RUNNER ERROR] Request exceeded 30 seconds. Aborting...");
    controller.abort();
  }, 30000);

  try {
    const res = await fetch("http://localhost:3000/api/admin/techs/jotai/regenerate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("[RUNNER] HTTP Status Code:", res.status);
    const body = await res.text();
    console.log("[RUNNER] Response Body:", body.slice(0, 500));
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error(
        "[RUNNER] Fetch aborted due to 10s timeout. The route handler is blocked internally."
      );
    } else {
      console.error("[RUNNER ERROR]:", err.message);
    }
  } finally {
    console.log("[RUNNER] Disconnecting Prisma and terminating...");
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
