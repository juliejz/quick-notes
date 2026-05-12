import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// Helper: add an inspiration item via compose
async function addInsp(page, text) {
  await page.fill('#compose', text);
  await page.keyboard.press('Enter');
}

// 3.1 — Two or more inspiration items render in a 2-column grid
test('inspiration items render in a 2-column grid', async ({ page }) => {
  await addInsp(page, 'Use contrast ratio checker #insp');
  await addInsp(page, 'Try Figma variables for theming #insp');

  // INTENT 1: both cards are present
  await expect(page.locator('#insp-container .note-card')).toHaveCount(2);

  // INTENT 2: cards are inside a grid container
  await expect(page.locator('#insp-container .insp-grid')).toBeVisible();
});

// 3.2 — Inspiration cards have no bullet dot
test('inspiration cards have no bullet dot', async ({ page }) => {
  await addInsp(page, 'Minimalist layout references #insp');

  const card = page.locator('#insp-container .note-card').first();
  await expect(card).toBeVisible();

  // INTENT: card uses .note-card style (same as Notes), no bullet element
  const bulletCount = await card.locator('.bullet, .dot, li').count();
  expect(bulletCount).toBe(0);
});

// 3.3 — Routing tag stripped; only free-form tags shown as pills
test('routing tag stripped and free-form tags shown as pills', async ({ page }) => {
  await addInsp(page, 'Color palette tools #insp #design #tools');

  const card = page.locator('#insp-container .note-card').first();

  // INTENT 1: free-form tags appear as pills
  await expect(card.locator('.tag-pill')).toHaveCount(2);
  await expect(card.locator('.tag-pill').nth(0)).toContainText('design');
  await expect(card.locator('.tag-pill').nth(1)).toContainText('tools');

  // INTENT 2: routing tag not shown as a pill
  const pillTexts = await card.locator('.tag-pill').allTextContents();
  expect(pillTexts.every(t => !t.includes('insp'))).toBeTruthy();
});

// 3.4 — Copy button copies text and shows "Copied!" feedback
test('copy button copies text and shows Copied! feedback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await addInsp(page, 'Great prompt: explain like I\'m five #insp');

  const card = page.locator('#insp-container .note-card').first();
  const copyBtn = card.locator('.action-btn');

  await expect(copyBtn).toContainText('Copy');
  await copyBtn.click();

  // INTENT: button text changes to "Copied!" briefly (1.5s window)
  await expect(copyBtn).toContainText('Copied!', { timeout: 2000 });
});

// 3.5 — Deleting all items shows empty state with correct label and routing tag
test('empty state shows correct label and routing tag after deleting all items', async ({ page }) => {
  await addInsp(page, 'Temporary item #insp');

  // Delete it
  const card = page.locator('#insp-container .note-card').first();
  await card.hover();
  await card.locator('.delete-btn').click();

  // INTENT: empty state appears with dynamic label and routing tag
  const emptyState = page.locator('#insp-container .empty-state');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText('inspiration');
  await expect(emptyState).toContainText('#insp');
});

// 3.6 — Empty state "Customize" link opens the customize modal
test('empty state customize link opens the customize modal', async ({ page }) => {
  // Navigate to Inspiration tab (empty by default)
  await page.locator('.tab-btn[data-tab="insp"]').click();

  const link = page.locator('#insp-container .empty-state a');
  await expect(link).toBeVisible();
  await link.click();

  // INTENT: customize modal opens
  await expect(page.locator('#customize-overlay, [id*="customize"]').first()).toBeVisible();
});
