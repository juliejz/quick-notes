import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// Default tab order: Notes(0), Inspiration(1), 1:1 Notes(2), Instances(3)
// filter({ hasText }) doesn't match input values — use nth() to locate rows

// Helper: open the customize modal
async function openCustomize(page) {
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  // overlay uses opacity transition, not display:none — check for .open class
  await expect(page.locator('#customize-overlay.open')).toHaveCount(1);
}

// Helper: save and close
async function saveCustomize(page) {
  await page.locator('.cust-save-btn').click();
  await expect(page.locator('#customize-overlay.open')).toHaveCount(0);
}

// 7.1 — Renaming a tab updates the tab bar label immediately
test('renaming a tab updates the tab bar label', async ({ page }) => {
  await openCustomize(page);

  // Inspiration is index 1 (Notes=0, Inspiration=1)
  const nameInput = page.locator('.customize-row').nth(1).locator('input[data-field="label"]');
  await nameInput.fill('Ideas');

  await saveCustomize(page);

  // INTENT: insp tab button now shows "Ideas"
  await expect(page.locator('.tab-btn[data-tab="insp"]')).toContainText('Ideas');
});

// 7.2 — Renaming a tab updates the empty state text
test('renaming a tab updates the empty state text', async ({ page }) => {
  await openCustomize(page);

  const labelInput = page.locator('.customize-row').nth(1).locator('input[data-field="label"]');
  await labelInput.clear();
  await labelInput.pressSequentially('Moodboard');
  await saveCustomize(page);

  await page.locator('.tab-btn[data-tab="insp"]').click();

  // INTENT: empty state reflects new label (displayed in lowercase "No moodboard yet")
  await expect(page.locator('#insp-container .empty-state')).toContainText('moodboard');
});

// 7.3 — Changing the routing tag routes content correctly
test('changing routing tag routes with the new tag', async ({ page }) => {
  await openCustomize(page);

  const tagInput = page.locator('.customize-row').nth(1).locator('input[data-field="tags"]');
  await tagInput.clear();
  await tagInput.pressSequentially('#idea');
  // onCustTagBlur updates _custDraft inside a 150ms setTimeout — blur first, wait, then save
  await tagInput.press('Tab');
  await page.waitForTimeout(200);
  await saveCustomize(page);

  // Add an item with the NEW tag
  await page.fill('#compose', 'New idea #idea');
  await page.keyboard.press('Enter');

  // INTENT: routes to insp tab
  await page.locator('.tab-btn[data-tab="insp"]').click();
  await expect(page.locator('#insp-container .note-card')).toHaveCount(1);

  // Add with the OLD tag — should NOT go to insp
  await page.fill('#compose', 'Old tag item #insp');
  await page.keyboard.press('Enter');

  await page.locator('.tab-btn[data-tab="insp"]').click();
  // Still only 1 card (old tag no longer routes here)
  await expect(page.locator('#insp-container .note-card')).toHaveCount(1);
});

// 7.4 — Hiding a tab removes it from the nav bar
test('hiding a tab removes it from the nav bar', async ({ page }) => {
  await openCustomize(page);

  await page.locator('.customize-row').nth(1).locator('.hide-toggle').click();
  await saveCustomize(page);

  // INTENT: no Inspiration tab button visible
  await expect(page.locator('.tab-btn[data-tab="insp"]')).toHaveCount(0);
});

// 7.5 — Using the same routing tag on two tabs shows a conflict warning
test('duplicate routing tag shows conflict warning', async ({ page }) => {
  await openCustomize(page);

  // Set Instances (index 3) tag to #insp (same as Inspiration)
  const tagInput = page.locator('.customize-row').nth(3).locator('input[data-field="tags"]');
  await tagInput.clear();
  await tagInput.pressSequentially('#insp');
  await tagInput.press('Tab'); // trigger onblur
  // onCustTagBlur runs validateCustConflict inside a 150ms setTimeout
  await page.waitForTimeout(200);

  // INTENT: conflict warning for the changed row (cust-conflict-3) becomes visible
  await expect(page.locator('.cust-conflict.visible')).toHaveCount(1);
});

// 7.6 — Reset to defaults restores original tab names and tags
test('reset to defaults restores original config', async ({ page }) => {
  // First rename Inspiration
  await openCustomize(page);
  await page.locator('.customize-row').nth(1).locator('input[data-field="label"]').fill('Ideas');
  await saveCustomize(page);

  await expect(page.locator('.tab-btn[data-tab="insp"]')).toContainText('Ideas');

  // Now reset
  await openCustomize(page);
  await page.locator('.cust-reset').click();
  // After reset, rows re-render to defaults — save immediately
  await page.locator('.cust-save-btn').click();
  await expect(page.locator('#customize-overlay.open')).toHaveCount(0);

  // INTENT: original label restored
  await expect(page.locator('.tab-btn[data-tab="insp"]')).toContainText('Inspiration');
});

// 7.7 — Config changes persist after page reload
test('customization config persists after reload', async ({ page }) => {
  await openCustomize(page);
  await page.locator('.customize-row').nth(1).locator('input[data-field="label"]').fill('Saved Ideas');
  await saveCustomize(page);

  await page.reload();

  // INTENT: label still "Saved Ideas" after reload
  await expect(page.locator('.tab-btn[data-tab="insp"]')).toContainText('Saved Ideas');
});
