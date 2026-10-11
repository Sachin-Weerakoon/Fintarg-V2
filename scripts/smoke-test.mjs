import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  const feRequire = createRequire(path.resolve('frontend/package.json'));
  ({ chromium } = feRequire('playwright'));
}

const VIEWPORTS = [
  { width: 390, height: 844, name: 'mobile-390' },
  { width: 1440, height: 900, name: 'desktop-1440' },
];

const PAGES = [
  { name: 'Welcome', path: '/welcome', auth: false },
  { name: 'Dashboard', path: '/', auth: true },
  { name: 'Financial', path: '/financial', auth: true },
  { name: 'Analysis', path: '/analysis', auth: true },
  { name: 'Goals', path: '/goals', auth: true },
  { name: 'Documents', path: '/documents', auth: true },
  { name: 'Advanced', path: '/advanced', auth: true },
  { name: 'Settings', path: '/settings', auth: true },
];

async function runSmokeTests() {
  console.log('🚀 Starting Fintarg V2 Visual Smoke Tests (390px & 1440px, Light & Dark)...');
  
  const executablePath = 'C:\\Users\\sachi\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(executablePath) ? executablePath : undefined,
  });

  const authContext = await browser.newContext();
  const anonContext = await browser.newContext();

  // Create an authenticated session for protected routes
  console.log('🔐 Authenticating smoke test session...');
  const userEmail = `smoke-test-${Date.now()}@fintarg.local`;
  try {
    const signupRes = await authContext.request.post('http://localhost:3000/api/auth/login', {
      data: {
        mode: 'signup',
        name: 'Smoke Tester',
        email: userEmail,
        password: 'Password123!',
        workMode: 'both',
      },
    });
    console.log('Auth setup response:', signupRes.status());
  } catch (err) {
    console.warn('Authentication request warning:', err.message);
  }

  const authPage = await authContext.newPage();
  const anonPage = await anonContext.newPage();
  let passedCount = 0;
  let totalCount = 0;

  for (const pageDef of PAGES) {
    const page = pageDef.auth ? authPage : anonPage;
    for (const vp of VIEWPORTS) {
      for (const mode of ['light', 'dark']) {
        totalCount++;
        await page.setViewportSize({ width: vp.width, height: vp.height });
        
        try {
          const res = await page.goto('http://localhost:3000' + pageDef.path, {
            waitUntil: 'domcontentloaded',
            timeout: 25000,
          });

          // Apply theme mode class
          await page.evaluate((isDark) => {
            if (isDark) {
              document.documentElement.classList.add('dark-mode');
              document.body.classList.add('dark-mode');
            } else {
              document.documentElement.classList.remove('dark-mode');
              document.body.classList.remove('dark-mode');
            }
          }, mode === 'dark');

          await page.waitForTimeout(100);

          // Verify no horizontal document overflow at 390px/1440px
          const hasHorizontalOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth + 2;
          });

          if (hasHorizontalOverflow) {
            console.error(`❌ [FAIL] ${pageDef.name} (${vp.name}, ${mode}): Detected unexpected horizontal page scroll!`);
          } else {
            passedCount++;
            console.log(`✅ [PASS] ${pageDef.name.padEnd(12)} | ${vp.name.padEnd(14)} | ${mode.padEnd(5)} | No overflow, status ${res ? res.status() : 200}`);
          }
        } catch (error) {
          console.error(`❌ [FAIL] ${pageDef.name} (${vp.name}, ${mode}): ${error.message}`);
        }
      }
    }
  }

  await browser.close();
  console.log(`\n📊 Smoke Test Results: ${passedCount}/${totalCount} tests passed.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal smoke test runner error:', err);
  process.exit(1);
});
