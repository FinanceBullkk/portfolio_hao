import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicPages = [
  '/index.html',
  '/about.html',
  '/certificate-pipeline.html',
  '/tms.html',
  '/registration.html',
  '/recruitment.html',
  '/assets/proof/certstudio-walkthrough.html',
  '/assets/proof/registration-walkthrough.html',
  '/assets/proof/tms-walkthrough.html',
  '/assets/proof/recruitment-walkthrough.html',
];

for (const path of publicPages) {
  test(`WCAG serious/critical scan: ${path}`, async ({ page }) => {
    // Scroll-reveal transitions can leave text at an intermediate opacity while
    // axe samples the DOM (especially when several workers start together).
    // Scan the settled, reduced-motion presentation so a transient animation
    // frame cannot be mistaken for the page's accessible colour contrast.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
      return reveals.every((element) => getComputedStyle(element).opacity === '1');
    });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  });
}

test('reduced motion reveals content immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/certificate-pipeline.html', { waitUntil: 'networkidle' });
  const hiddenRevealCount = await page.locator('[data-reveal]').evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).opacity === '0').length);
  expect(hiddenRevealCount).toBe(0);
});
