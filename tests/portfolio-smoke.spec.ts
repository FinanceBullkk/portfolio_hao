import { expect, test } from '@playwright/test';

const rootPages = [
  { name: 'home', path: '/index.html', proof: ['/assets/proof/proxy-browser-profile-management-walkthrough.html', '/assets/proof/registration-walkthrough.html'] },
  { name: 'about', path: '/about.html', proof: [] },
  { name: 'Proxy & Browser Profile Management', path: '/proxy-browser-profile-management.html', proof: ['/assets/proof/proxy-browser-profile-management-walkthrough.html'] },
  { name: 'CertStudio', path: '/certificate-pipeline.html', proof: [] },
  { name: 'Registration', path: '/registration.html', proof: ['/assets/proof/registration-walkthrough.html'] },
];

const caseStudyPages = rootPages.filter(({ name }) => !['home', 'about'].includes(name));

for (const pageInfo of rootPages) {
  test.describe(`${pageInfo.name} page`, () => {
    test('loads without browser errors or horizontal overflow', async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      page.on('requestfailed', (request) => failedRequests.push(`${request.url()} (${request.failure()?.errorText ?? 'failed'})`));

      await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(dimensions.width, `horizontal overflow: ${dimensions.width} > ${dimensions.viewport}`).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
      expect(failedRequests, failedRequests.join('\n')).toEqual([]);
    });

    test('theme toggle is labelled, keyboard reachable, and persistent', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'domcontentloaded' });

      const toggle = page.locator('.theme-toggle');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');
      await toggle.focus();
      await expect(toggle).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('skip link lands on the main content', async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      const skip = page.locator('.skip-link');
      await skip.focus();
      await expect(skip).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main-content')).toBeFocused();
    });

    for (const proofPath of pageInfo.proof) {
      test(`proof CTA opens ${proofPath}`, async ({ page }) => {
        await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
        // Source links stay relative so the portfolio also works from a
        // repository sub-path (for example GitHub Pages). Resolve the href
        // before asserting the public pathname.
        const relativeProofPath = proofPath.slice(1);
        const cta = page.locator(`[data-proof-cta][href$="${relativeProofPath}"]`).first();
        await expect(cta).toBeVisible();
        const href = await cta.getAttribute('href');
        expect(href).toBeTruthy();
        expect(new URL(href!, page.url()).pathname).toBe(proofPath);
        await cta.click();
        await expect(page).toHaveURL(new RegExp(`${proofPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
        await expect(page.locator('[data-proof-page]')).toBeVisible();
      });
    }
  });
}

for (const pageInfo of caseStudyPages) {
  test(`${pageInfo.name} keeps a concise recruiter view and the deep dive optional`, async ({ page }) => {
    await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
    const deepDive = page.locator('.case-deep-dive');
    if (pageInfo.proof.length) {
      await expect(page.locator('[data-proof-cta]').first()).toBeVisible();
    } else {
      await expect(page.locator('[data-proof-cta]')).toHaveCount(0);
      await expect(page.getByRole('link', { name: /Production app \(access required\)/ }).first()).toBeVisible();
    }
    await expect(page.locator('.lede')).toBeVisible();
    await expect(page.locator('.case-summary')).toHaveCount(0);
    await expect(deepDive).not.toHaveAttribute('open', '');
    await expect(deepDive.locator('.cs-section').first()).not.toBeVisible();
    await deepDive.locator('summary').click();
    await expect(deepDive).toHaveAttribute('open', '');
    await expect(deepDive.locator('.cs-section').first()).toBeVisible();
  });
}

test('minimal portfolio layout holds at intermediate widths', async ({ page }) => {
  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.width, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    await expect(page.locator('.hero-card')).toBeVisible();
    await expect(page.locator('.product-card')).toHaveCount(3);
  }
});

test('primary navigation controls keep a mobile-sized target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  const sizes = await page.locator('.nav a, .theme-toggle').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(sizes.length).toBeGreaterThan(0);
  expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
});

test('Corgi77 mounts in isolated demo mode and completes a slotted booking', async ({ page }) => {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  const externalRequests: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url());
  });
  await page.goto('/assets/proof/registration-walkthrough.html', { waitUntil: 'networkidle' });
  const demo = page.frameLocator('iframe[title="Corgi77 Registration interactive product demo"]');
  await expect(demo.getByRole('heading', { name: 'Events' })).toBeVisible();
  await demo.getByRole('button', { name: /English Proficiency Assessment Q3 2026/i }).click();
  await expect(demo.getByRole('heading', { name: 'English Proficiency Assessment Q3 2026' })).toBeVisible();
  const runtimeFrame = page.locator('iframe[title="Corgi77 Registration interactive product demo"]');
  await expect.poll(async () => runtimeFrame.evaluate((node) => node.contentWindow?.location.hash)).toContain('/events/evt-english-q3');
  await runtimeFrame.evaluate((node) => node.contentWindow?.location.reload());
  await expect(demo.getByRole('heading', { name: 'English Proficiency Assessment Q3 2026' })).toBeVisible();
  await demo.getByRole('button', { name: 'Choose a time' }).first().click();
  await demo.getByRole('button', { name: /^Continue/ }).click();
  await expect(demo.getByRole('heading', { name: /Choose your 2 exam slots/i })).toBeVisible();
  await demo.getByRole('button', { name: /^Select Speaking/i }).first().click();
  await demo.getByRole('button', { name: /^Select 3 Skills/i }).first().click();
  await demo.getByRole('button', { name: /^Continue/ }).click();
  await demo.getByRole('button', { name: 'Confirm registration' }).click();
  await expect(demo.getByRole('heading', { name: 'Your exam schedule' })).toBeVisible();
  await expect(demo.getByText(/Registration successful/i)).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
  expect(externalRequests, externalRequests.join('\n')).toEqual([]);
});

test('Corgi77 simple registration stays inside the public demo state', async ({ page }) => {
  await page.goto('/assets/proof/registration-walkthrough.html', { waitUntil: 'networkidle' });
  const demo = page.frameLocator('iframe[title="Corgi77 Registration interactive product demo"]');
  await demo.getByRole('button', { name: /Pronunciation Improvement Program/i }).click();
  await demo.getByRole('button', { name: 'Register to attend' }).first().click();
  await demo.getByRole('button', { name: 'Confirm registration' }).click();
  await expect(demo.getByRole('heading', { name: /You.re registered/i })).toBeVisible();
  await demo.getByRole('button', { name: 'View event' }).click();
  await expect(demo.getByText(/You.re on the list/i)).toBeVisible();
});

test('proxy and browser profile demo completes the allowed control path without external requests', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url());
  });
  await page.goto('/assets/proof/proxy-browser-profile-management-walkthrough.html', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Check synthetic proxy' }).click();
  await expect(page.locator('#proxy-status')).toHaveText('Available');
  await page.getByRole('button', { name: 'Bind account and profile' }).click();
  await page.getByRole('button', { name: 'Issue scoped handoff' }).click();
  await page.getByRole('button', { name: 'Launch local profile' }).click();
  await expect(page.locator('#launch-status')).toHaveText('Running');
  await expect(page.locator('#audit-log')).toContainText('LOCAL_PROFILE_READY');
  expect(externalRequests, externalRequests.join('\n')).toEqual([]);
});

test('proxy and browser profile demo denies a revoked Relay handoff and resets on refresh', async ({ page }) => {
  await page.goto('/assets/proof/proxy-browser-profile-management-walkthrough.html', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Check synthetic proxy' }).click();
  await page.getByRole('button', { name: 'Bind account and profile' }).click();
  await page.getByRole('button', { name: 'Revoke Relay PC' }).click();
  await page.getByRole('button', { name: 'Issue scoped handoff' }).click();
  await expect(page.locator('#demo-live')).toContainText('Handoff denied');
  await expect(page.locator('#audit-log')).toContainText('RELAY_RECIPIENT_REVOKED');
  await expect(page.getByRole('button', { name: 'Launch local profile' })).toBeDisabled();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#proxy-status')).toHaveText('Not checked');
  await expect(page.locator('#audit-log')).toContainText('No actions yet');
});
