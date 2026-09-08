import { expect, test } from '@playwright/test';

test('home page presents experience and education as a readable nested timeline', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Education', exact: true })).toBeVisible();
  await expect(page.locator('.profile-entry')).toHaveCount(4);
  await expect(page.locator('.timeline-role')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Internal Vice President' })).toBeVisible();
  await expect(page.getByText('Bachelor of Business, Digital Business')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Talk about a role' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View LinkedIn' })).toHaveCount(0);
  await expect(page.getByText('3 organisations')).toHaveCount(0);
  await expect(page.locator('.hero-avatar')).toHaveCount(0);
  await expect(page.locator('.profile-skills')).toHaveCount(0);
  await expect(page.getByText('AI · Web · Automation')).toHaveCount(0);
  await expect(page.getByText('3 projects · evidence-labelled')).toHaveCount(0);
  await expect(page.locator('footer ul')).toHaveCount(0);
});

test('about page keeps its narrative focus without duplicating background panels', async ({ page }) => {
  await page.goto('/about.html', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Experience' })).toHaveCount(0);
  await expect(page.locator('.profile-panel')).toHaveCount(0);
  await expect(page.locator('.avatar-placeholder')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Tools I use to make the workflow clearer' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'What I actually did' })).toHaveCount(0);
});
