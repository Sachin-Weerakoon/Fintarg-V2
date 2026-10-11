import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const feRequire = createRequire(path.resolve('frontend/package.json'));
const { chromium } = feRequire('playwright');
const axeCore = feRequire('axe-core');

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

async function runAxeAudit() {
  console.log('♿ Starting Axe Core Accessibility Audit (WCAG AA)...');
  const executablePath = 'C:\\Users\\sachi\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(executablePath) ? executablePath : undefined,
  });

  const authContext = await browser.newContext();
  const anonContext = await browser.newContext();

  const userEmail = `axe-test-${Date.now()}@fintarg.local`;
  try {
    await authContext.request.post('http://localhost:3000/api/auth/login', {
      data: {
        mode: 'signup',
        name: 'Axe Auditor',
        email: userEmail,
        password: 'Password123!',
        workMode: 'both',
      },
    });
  } catch (err) {
    console.warn('Auth setup warning:', err.message);
  }

  const authPage = await authContext.newPage();
  const anonPage = await anonContext.newPage();

  const auditReport = [];

  for (const pageDef of PAGES) {
    const page = pageDef.auth ? authPage : anonPage;
    await page.setViewportSize({ width: 1440, height: 900 });

    try {
      await page.goto('http://localhost:3000' + pageDef.path, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      // Inject axe-core
      await page.evaluate(axeCore.source);

      // Run axe evaluation
      const results = await page.evaluate(async () => {
        return await window.axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
        });
      });

      const violations = results.violations || [];
      const criticalOrSerious = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');

      console.log(`♿ ${pageDef.name.padEnd(12)}: ${violations.length} total issues (${criticalOrSerious.length} critical/serious)`);
      auditReport.push({
        page: pageDef.name,
        path: pageDef.path,
        totalViolations: violations.length,
        criticalSeriousCount: criticalOrSerious.length,
        issues: violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })),
      });
    } catch (err) {
      console.error(`Error auditing ${pageDef.name}:`, err.message);
    }
  }

  await browser.close();

  console.log('\n📋 Axe Audit Summary:');
  console.table(auditReport.map(r => ({
    Page: r.page,
    Path: r.path,
    'Total Violations': r.totalViolations,
    'Critical / Serious': r.criticalSeriousCount,
  })));
}

runAxeAudit().catch(err => {
  console.error('Fatal error in axe audit:', err);
  process.exit(1);
});
