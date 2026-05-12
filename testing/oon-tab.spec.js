import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// Helper: add a 1:1 note via compose
async function addOon(page, text) {
  await page.fill('#compose', text);
  await page.keyboard.press('Enter');
}

// 4.1 — Notes grouped by person; most recently active person appears first
test('notes grouped by person, most recent person first', async ({ page }) => {
  await addOon(page, 'Catch up on roadmap @alice');
  await addOon(page, 'Review Q3 goals @bob');
  await addOon(page, 'Follow up on design @alice');

  await page.locator('.tab-btn[data-tab="oon"]').click();

  // INTENT 1: two person cards present
  await expect(page.locator('#oon-grid .person-card')).toHaveCount(2);

  // INTENT 2: alice (most recently active) appears first
  await expect(page.locator('#oon-grid .person-card').first().locator('.person-name')).toContainText('alice');
});

// 4.2 — "Copy all" copies all items as a bullet list
test('Copy all copies items as bullet list', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await addOon(page, 'Discuss sprint scope @carol');
  await addOon(page, 'Ask about timeline @carol');

  await page.locator('.tab-btn[data-tab="oon"]').click();

  // Open the person modal
  await page.locator('#oon-grid .person-card').first().click();
  await expect(page.locator('#oon-modal-overlay.open')).toHaveCount(1);

  // Click Copy all
  await page.locator('#oon-modal-copy-btn').click();

  // INTENT: clipboard contains bullet-formatted lines
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('•');
  expect(copied).toContain('Discuss sprint scope');
  expect(copied).toContain('Ask about timeline');
});

// 4.3 — Deleting an item removes it; group collapses if last item deleted
test('deleting the last item in a group collapses the group', async ({ page }) => {
  await addOon(page, 'One-off topic @diana');

  await page.locator('.tab-btn[data-tab="oon"]').click();
  await expect(page.locator('#oon-grid .person-card')).toHaveCount(1);

  // Open modal
  await page.locator('#oon-grid .person-card').first().click();
  await expect(page.locator('#oon-modal-overlay.open')).toHaveCount(1);

  // Delete the single item
  const item = page.locator('.oon-item').first();
  await item.hover();
  await item.locator('.oon-delete').click();

  // INTENT: modal body is now empty (app keeps modal open after last delete)
  await expect(page.locator('.oon-item')).toHaveCount(0);

  // Close modal and verify person card is gone
  await page.locator('.oon-modal-close').click();
  await expect(page.locator('#oon-grid .person-card')).toHaveCount(0);
});
