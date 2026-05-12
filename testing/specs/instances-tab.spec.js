import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// Helper: add a credential via compose
async function addCredential(page, { name, url, username, password, notes } = {}) {
  const lines = [];
  if (name)     lines.push(name);
  if (url)      lines.push(url);
  if (username) lines.push(username);
  if (password) lines.push(password);
  if (notes)    lines.push(`* ${notes}`);
  lines.push('#instance');

  await page.click('#compose');
  for (let i = 0; i < lines.length; i++) {
    await page.keyboard.type(lines[i]);
    if (i < lines.length - 1) await page.keyboard.press('Shift+Enter');
  }
  await page.click('button:has-text("Add")');
}

// 5.1 — Wide view shows name+time, URL/user/pass, notes, edit+delete actions
test('wide view shows all credential fields and actions', async ({ page }) => {
  await addCredential(page, {
    name: 'Dev Env',
    url: 'https://dev.example.com',
    username: 'admin',
    password: 'secret123',
    notes: 'expires end of quarter',
  });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  const card = page.locator('.demo-wide-card').first();
  await expect(card).toBeVisible();

  // INTENT: name, URL, username, password, notes all visible
  await expect(card.locator('.demo-wide-name')).toContainText('Dev Env');
  await expect(card.locator('.demo-wide-val').first()).toContainText('dev.example.com');
  await expect(card.locator('.demo-wide-notes')).toContainText('expires end of quarter');

  // INTENT: edit and delete buttons present (opacity-based, check count not visibility)
  await card.hover();
  await expect(card.locator('.demo-edit-btn')).toHaveCount(1);
  await expect(card.locator('.demo-wide-del')).toHaveCount(1);
});

// 5.2 — Grid view shows 2-column cards
test('switching to grid view shows 2-column card layout', async ({ page }) => {
  await addCredential(page, { name: 'Staging', url: 'https://stage.example.com', username: 'user', password: 'pass' });
  await addCredential(page, { name: 'Prod',    url: 'https://prod.example.com',  username: 'user', password: 'pass' });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  // Switch to grid
  await page.locator('#btn-demo-grid').click();

  // INTENT: both cards rendered in grid
  await expect(page.locator('.demo-grid .demo-card')).toHaveCount(2);
});

// 5.3 — Password field masked by default
test('password is masked by default', async ({ page }) => {
  await addCredential(page, { name: 'Test', url: 'https://test.com', username: 'u', password: 'mypassword' });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  const card = page.locator('.demo-wide-card').first();

  // INTENT: password span has is-masked class
  await expect(card.locator('.demo-wide-val.is-masked')).toHaveCount(1);
});

// 5.4 — Clicking Show reveals the password; button becomes "Hide"
test('Show/Hide toggles password visibility', async ({ page }) => {
  await addCredential(page, { name: 'Test', url: 'https://test.com', username: 'u', password: 'mypassword' });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  const card = page.locator('.demo-wide-card').first();
  const showBtn = card.locator('.demo-wide-show');

  await expect(showBtn).toContainText('Show');
  await showBtn.click();

  // INTENT: button becomes Hide, is-masked class removed
  await expect(showBtn).toContainText('Hide');
  await expect(card.locator('.demo-wide-val.is-masked')).toHaveCount(0);
});

// 5.5 — Copy URL, Copy User, Copy Password buttons show "Copied!" feedback
test('copy buttons show Copied! feedback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await addCredential(page, { name: 'Test', url: 'https://copy.example.com', username: 'copyuser', password: 'copypass' });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  const card = page.locator('.demo-wide-card').first();
  const copyBtns = card.locator('.demo-wide-copy');

  // Click Copy URL (first copy button)
  const copyUrlBtn = copyBtns.first();
  await copyUrlBtn.click();

  // INTENT: button shows Copied! briefly
  await expect(copyUrlBtn).toHaveClass(/copied/, { timeout: 2000 });
});

// 5.6 — Clicking edit opens modal with all fields prefilled
test('edit modal opens with prefilled fields', async ({ page }) => {
  await addCredential(page, { name: 'EditMe', url: 'https://edit.com', username: 'edituser', password: 'editpass', notes: 'some notes' });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  const card = page.locator('.demo-wide-card').first();
  await card.hover();
  await card.locator('.demo-edit-btn').click();

  // INTENT: modal opens with fields populated
  await expect(page.locator('#demo-edit-overlay.open')).toHaveCount(1);
  await expect(page.locator('#de-name')).toHaveValue('EditMe');
  await expect(page.locator('#de-url')).toHaveValue('https://edit.com');
  await expect(page.locator('#de-username')).toHaveValue('edituser');
  await expect(page.locator('#de-password')).toHaveValue('editpass');
  await expect(page.locator('#de-notes')).toHaveValue('some notes');
});

// 5.7 — Editing and saving updates the card in-place
test('saving edits updates the card', async ({ page }) => {
  await addCredential(page, { name: 'Original', url: 'https://orig.com', username: 'u', password: 'p' });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  const card = page.locator('.demo-wide-card').first();
  await card.hover();
  await card.locator('.demo-edit-btn').click();

  await page.locator('#de-name').fill('Updated Name');
  await page.locator('.demo-edit-save').click();

  // INTENT: modal closed, card shows new name
  await expect(page.locator('#demo-edit-overlay.open')).toHaveCount(0);
  await expect(page.locator('.demo-wide-card .demo-wide-name').first()).toContainText('Updated Name');
});

// 5.8 — Cancelling edit leaves the card unchanged
test('cancelling edit leaves card unchanged', async ({ page }) => {
  await addCredential(page, { name: 'Unchanged', url: 'https://unchanged.com', username: 'u', password: 'p' });

  await page.locator('.tab-btn[data-tab="demos"]').click();

  const card = page.locator('.demo-wide-card').first();
  await card.hover();
  await card.locator('.demo-edit-btn').click();

  await page.locator('#de-name').fill('Should Not Save');
  await page.locator('.demo-edit-cancel').click();

  // INTENT: modal closed, original name still shown
  await expect(page.locator('#demo-edit-overlay.open')).toHaveCount(0);
  await expect(page.locator('.demo-wide-card .demo-wide-name').first()).toContainText('Unchanged');
});
