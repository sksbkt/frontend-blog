import { chromium } from 'playwright';

async function runVisualInspection() {
  console.log('🚀 Spawning visible Playwright Chromium browser...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: ['--start-maximized', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: null, // Full-screen display
  });

  const page = await context.newPage();

  // Log all asset network requests related to gaming or storage
  page.on('response', (res) => {
    const url = res.url();
    const contentType = res.headers()['content-type'] || '';
    if (contentType.includes('image') || url.includes('gaming') || url.includes('supabase')) {
      console.log(`[Network ${res.status()}] ${url}`);
    }
  });

  console.log('🔗 Navigating to http://127.0.0.1:3000/projects ...');
  await page.goto('http://127.0.0.1:3000/projects');
  await page.waitForLoadState('networkidle');

  // Locate the specific Gaming Front card (article element containing Gaming)
  let gamingCard = page.locator('article').filter({ hasText: /gaming/i }).first();
  if (await gamingCard.count() === 0) {
    gamingCard = page.locator('article, div').filter({ hasText: /gaming/i }).first();
  }
  await gamingCard.waitFor({ state: 'visible', timeout: 15000 });

  // Scroll card into view
  await gamingCard.scrollIntoViewIfNeeded();

  // Extract the cover image element
  const img = gamingCard.locator('img').first();
  const rawSrc = await img.getAttribute('src');
  const currentSrc = await img.evaluate((el: HTMLImageElement) => el.currentSrc);
  const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
  const naturalHeight = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);

  console.log('\n========================================================');
  console.log('🔎 GAMING FRONT IMAGE INSPECTION RESULTS');
  console.log('========================================================');
  console.log('1. DOM "src" attribute:    ', rawSrc);
  console.log('2. Browser resolved URL:   ', currentSrc);
  console.log('3. Image dimensions:       ', `${naturalWidth}x${naturalHeight}`);

  if (rawSrc?.startsWith('/_next/image')) {
    const params = new URLSearchParams(rawSrc.split('?')[1]);
    console.log('4. Next.js image proxy target:', params.get('url'));
  }
  console.log('========================================================\n');

  console.log('Browser remains open for 15 seconds for manual DevTools review...');
  await page.waitForTimeout(15000);

  await browser.close();
}

runVisualInspection().catch(console.error);
