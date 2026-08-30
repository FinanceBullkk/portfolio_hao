import { expect, test } from '@playwright/test';

const rootPages = [
  { name: 'home', path: '/index.html', proof: ['/assets/proof/registration-walkthrough.html', '/assets/proof/certstudio-walkthrough.html', '/assets/proof/tms-walkthrough.html', '/assets/proof/recruitment-walkthrough.html'] },
  { name: 'about', path: '/about.html', proof: [] },
  { name: 'CertStudio', path: '/certificate-pipeline.html', proof: ['/assets/proof/certstudio-walkthrough.html'] },
  { name: 'TMS', path: '/tms.html', proof: ['/assets/proof/tms-walkthrough.html'] },
  { name: 'Registration', path: '/registration.html', proof: ['/assets/proof/registration-walkthrough.html'] },
  { name: 'Recruitment', path: '/recruitment.html', proof: ['/assets/proof/recruitment-walkthrough.html'] },
];

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

test('TMS workflow tour is manual and keeps hidden panels out of the tab order', async ({ page }) => {
  await page.goto('/tms.html', { waitUntil: 'networkidle' });
  const inactivePanels = page.locator('.flow-demo-panel[aria-hidden="true"]');
  await expect(inactivePanels).not.toHaveCount(0);
  const inertStates = await inactivePanels.evaluateAll((panels) => panels.map((panel) => (panel as HTMLElement).inert));
  expect(inertStates.every(Boolean)).toBe(true);
  const next = page.locator('.flow-demo-nav[data-dir="1"]');
  await next.click();
  await expect(page.locator('.flow-demo-panel.active')).toHaveCount(1);
  await expect(page.locator('.flow-demo-panel.active')).toHaveAttribute('aria-hidden', 'false');
});

test('editorial layout holds at intermediate widths', async ({ page }) => {
  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.width, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    await expect(page.locator('.flagship')).toBeVisible();
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
