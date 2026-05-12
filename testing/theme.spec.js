import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// 8.1 — Clicking Light toggle switches to light theme
test('clicking Light switches to light theme', async ({ page }) => {
  await page.locator('#btn-light').click();

  // INTENT: html[data-theme] becomes "light"
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

// 8.2 — Theme preference persists after reload
test('theme preference persists after reload', async ({ page }) => {
  await page.locator('#btn-light').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();

  // INTENT: still light after reload
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

// 8.3 — Data across all tabs persists after reload
test('data across all tabs persists after reload', async ({ page }) => {
  // Add one item to each tab type
  await page.fill('#compose', 'Persisted note');
  await page.keyboard.press('Enter');

  await page.fill('#compose', 'Persisted inspiration #insp');
  await page.keyboard.press('Enter');

  await page.fill('#compose', 'Persisted topic @eve');
  await page.keyboard.press('Enter');

  await page.reload();

  // INTENT: Notes tab has the note
  await expect(page.locator('#notes-list .note-card').first()).toContainText('Persisted note');

  // INTENT: Inspiration tab has the item
  await page.locator('.tab-btn[data-tab="insp"]').click();
  await expect(page.locator('#insp-container .note-card').first()).toContainText('Persisted inspiration');

  // INTENT: 1:1 tab has the person card
  await page.locator('.tab-btn[data-tab="oon"]').click();
  await expect(page.locator('#oon-grid .person-card')).toHaveCount(1);
});
