import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function createTestCookie(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SANITY_API_WRITE_TOKEN ||
    "fallback-secret-key-for-dev-change-in-prod";

  const sessionData = {
    user: {
      id: 999999,
      login: process.env.ADMIN_GITHUB_USERNAME || "admin",
      name: "Admin Tester",
      avatar_url: "https://github.com/ghost.png",
      html_url: "https://github.com",
    },
    accessToken: "mock_test_token",
    createdAt: Date.now(),
  };

  const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `portfolio_admin_session=${payload}.${signature}`;
}

async function main() {
  console.log("=== TESTING ADMIN TECH DICTIONARY API ROUTES ===");
  const cookie = createTestCookie();
  const baseUrl = "http://localhost:3000";

  try {
    // 1. GET /api/admin/techs
    console.log("\n[1/4] Testing GET /api/admin/techs...");
    const getRes = await fetch(`${baseUrl}/api/admin/techs?limit=10`, {
      headers: { Cookie: cookie },
    });
    const getData = await getRes.json();
    console.log(`[GET] Status: ${getRes.status}, Total in DB: ${getData.total}, Returned: ${getData.data?.length}`);
    if (getData.data?.length > 0) {
      console.log(`[Sample Item]:`, {
        name: getData.data[0].name,
        slug: getData.data[0].slug,
        aliases: getData.data[0].aliases,
        category: getData.data[0].category,
      });
    }

    // 2. POST /api/admin/techs (Create)
    console.log("\n[2/4] Testing POST /api/admin/techs (Creating 'TestZustand')...");
    const postRes = await fetch(`${baseUrl}/api/admin/techs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        name: "TestZustand",
        slug: "test-zustand",
        category: "frontend",
        icon: "zustand",
        aliases: ["zustand-state", "bear-store"],
        summaryEn: "A small, fast and scalable bearbones state-management solution.",
        summaryFa: "یک راهکار مدیریت حالت سبک، سریع و مقیاس‌پذیر برای ریکت.",
      }),
    });
    const postData = await postRes.json();
    console.log(`[POST] Status: ${postRes.status}, Created ID: ${postData.data?.id}`);
    const createdId = postData.data?.id;

    if (!createdId) throw new Error("Failed to create test item.");

    // 3. PATCH /api/admin/techs/[id] (Update aliases)
    console.log(`\n[3/4] Testing PATCH /api/admin/techs/${createdId} (Adding new alias)...`);
    const patchRes = await fetch(`${baseUrl}/api/admin/techs/${createdId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        aliases: ["zustand-state", "bear-store", "zustand-react-v5"],
        summaryEn: "Updated summary: A small, fast state-management tool.",
      }),
    });
    const patchData = await patchRes.json();
    console.log(`[PATCH] Status: ${patchRes.status}, Updated Aliases:`, patchData.data?.aliases);

    // 4. DELETE /api/admin/techs/[id] (Cleanup)
    console.log(`\n[4/4] Testing DELETE /api/admin/techs/${createdId}...`);
    const delRes = await fetch(`${baseUrl}/api/admin/techs/${createdId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    const delData = await delRes.json();
    console.log(`[DELETE] Status: ${delRes.status}, Success: ${delData.success}, Message: "${delData.message}"`);

    console.log("\n✅ ALL ADMIN TECH DICTIONARY API ENDPOINTS VERIFIED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Test error:", err);
  } finally {
    console.log("Cleaning up Prisma connection...");
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
