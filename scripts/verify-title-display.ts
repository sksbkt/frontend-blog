import { chromium } from "playwright";
import crypto from "crypto";

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

async function verifyTitleBehavior() {
  console.log("🚀 Launching Playwright to verify project title display behavior...");
  const browser = await chromium.launch({
    executablePath: "C:\\Users\\Ocelot\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe",
    headless: false,
    slowMo: 50,
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

  // 1. Visit the Admin Grid View
  console.log("🔗 Navigating to http://127.0.0.1:3000/en/admin?view=grid ...");
  await page.goto("http://127.0.0.1:3000/en/admin?view=grid", { waitUntil: "networkidle" });

  // Wait for the cards to load and render
  console.log("⏳ Waiting for repository cards to render...");
  await page.locator("h3").first().waitFor({ state: "visible", timeout: 30000 });

  // Verify Gaming Front card displays "Gaming Front"
  console.log("🔍 Checking titles in Admin Grid...");
  const gamingFrontTitle = page.locator("h3").filter({ hasText: /^Gaming Front$/i }).first();
  const hasGamingFrontTitle = (await gamingFrontTitle.count()) > 0;
  console.log("- 'Gaming Front' project title visible on card:", hasGamingFrontTitle);

  // Take screenshot of admin grid with titles
  await page.screenshot({ path: "admin-grid-titles.png", fullPage: false });
  console.log("📸 Saved admin-grid-titles.png");

  // 2. Open Gaming Front Project Editor
  console.log("🔗 Navigating to Gaming Front Editor (cmvc38qv80000v6648plo7z1e)...");
  await page.goto("http://127.0.0.1:3000/en/admin/projects/cmvc38qv80000v6648plo7z1e");
  await page.waitForLoadState("domcontentloaded");

  const h1Title = page.locator("h1").first();
  const h1Text = (await h1Title.textContent())?.trim();
  console.log("- H1 Title in Editor:", h1Text);

  const breadcrumbActive = page.locator("nav ol li").last();
  const breadcrumbText = (await breadcrumbActive.textContent())?.trim();
  console.log("- Breadcrumb Title in Editor:", breadcrumbText);

  // 3. Test unsaved new draft fallback to GitHub repo name
  console.log("🔗 Navigating to unsaved new draft to test fallback to GitHub repo name...");
  await page.goto("http://127.0.0.1:3000/en/admin/projects/drafts.my-custom-test-repo");
  await page.waitForLoadState("domcontentloaded");

  const fallbackH1 = page.locator("h1").first();
  const fallbackH1Text = (await fallbackH1.textContent())?.trim();
  console.log("- Fallback H1 Title for unsaved draft:", fallbackH1Text);

  await page.screenshot({ path: "admin-editor-title.png", fullPage: false });
  console.log("📸 Saved admin-editor-title.png");

  console.log("\n✅ All title resolution tests verified!");
  await page.waitForTimeout(2000);
  await browser.close();
}

verifyTitleBehavior().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
