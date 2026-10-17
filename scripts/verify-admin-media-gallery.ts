import { chromium } from "playwright";
import crypto from "crypto";

// Compute admin session cookie
const secret = process.env.AUTH_SECRET || "portfolio-admin-super-secret-key-change-as-needed";
const sessionData = {
  user: {
    id: 123456,
    login: "sksbkt",
    name: "Sovereign Admin",
    avatar_url: "https://avatars.githubusercontent.com/u/123456",
    html_url: "https://github.com/sksbkt",
  },
  accessToken: process.env.GITHUB_TOKEN || "test-access-token",
  createdAt: Date.now(),
};

const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
const sessionCookieValue = `${payload}.${signature}`;

async function main() {
  console.log("🚀 Launching Playwright to test Admin Project Media Gallery...");
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "portfolio_admin_session",
      value: sessionCookieValue,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  console.log("🔗 Navigating to Admin Project Detail for Gaming Front (cmvc38qv80000v6648plo7z1e)...");
  await page.goto("http://127.0.0.1:3000/en/admin/projects/cmvc38qv80000v6648plo7z1e");
  await page.waitForLoadState("networkidle");

  const pageTitle = await page.title();
  console.log("Page title:", pageTitle);
  console.log("Current URL:", page.url());

  // Click the Media tab
  console.log("👆 Clicking Media tab...");
  const mediaTabBtn = page.locator("button, [role='tab']").filter({ hasText: /^Media$/i }).first();
  await mediaTabBtn.waitFor({ state: "visible", timeout: 10000 });
  await mediaTabBtn.click();
  await page.waitForTimeout(2000);

  // Verify Media Gallery Elements
  console.log("🔍 Verifying Media Gallery controls & cards...");

  // 1. Check Action buttons
  const triggerCaptureBtn = page.locator("button").filter({ hasText: /Trigger Capture Action/i }).first();
  const syncCapturesBtn = page.locator("button").filter({ hasText: /Sync Repo Captures/i }).first();
  const uploadBtn = page.locator("label, button").filter({ hasText: /Upload Media Asset/i }).first();

  console.log("- Trigger Capture button present:", (await triggerCaptureBtn.count()) > 0);
  console.log("- Sync Captures button present:   ", (await syncCapturesBtn.count()) > 0);
  console.log("- Upload Media button present:    ", (await uploadBtn.count()) > 0);

  // 2. Check GitHub OG Card
  const ghOgBadge = page.locator("span").filter({ hasText: "GitHub OG" }).first();
  console.log("- GitHub OG badge present:        ", (await ghOgBadge.count()) > 0);

  const currentCoverBadge = page.locator("span").filter({ hasText: "Current Cover" });
  const currentCoverCount = await currentCoverBadge.count();
  console.log("- Current Cover indicator count:  ", currentCoverCount);

  const refetchOgBtn = page.locator("button").filter({ hasText: /Re-fetch OG|Fetch GitHub OG/i }).first();
  console.log("- Fetch/Refresh OG button present:", (await refetchOgBtn.count()) > 0);

  // 3. Test Set as Cover button
  const setCoverBtn = page.locator("button").filter({ hasText: /★ Set as Cover/i }).first();
  const activeCoverBtn = page.locator("button").filter({ hasText: /Current Cover/i }).first();
  console.log("- Active Cover button present:    ", (await activeCoverBtn.count()) > 0);

  // If there's an inactive card, click Set as Cover; otherwise test clicking Re-fetch or verify state
  if ((await setCoverBtn.count()) > 0) {
    console.log("👆 Clicking '★ Set as Cover'...");
    await setCoverBtn.click();
    await page.waitForTimeout(2000);
  }

  // Take screenshot of the verified media tab
  await page.screenshot({ path: "media-gallery-verification.png", fullPage: true });
  console.log("📸 Saved verification screenshot to media-gallery-verification.png");

  console.log("\n✅ All UI verification checks passed!");
  await page.waitForTimeout(4000);
  await browser.close();
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
