import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// 1.1 — Plain text routes to Notes tab as a plain note
test('plain text submit creates a note in the Notes tab', async ({ page }) => {
  await page.fill('#compose', 'Remember to review the Q2 deck');
  await page.keyboard.press('Enter');

  // INTENT 1: user is now looking at the Notes tab (not another tab)
  const activeTab = page.locator('.tab-btn.active');
  await expect(activeTab).toHaveText('Notes');

  // INTENT 2: the content appears as a plain note, not a todo
  // .note-card lives in #notes-list; .todo-item lives in #todos-wrap — they are separate containers
  const note = page.locator('#notes-list .note-card').first();
  await expect(note).toBeVisible();
  // also assert no todo was created for this input
  await expect(page.locator('.todo-item')).toHaveCount(0);

  // INTENT 3 (original): the correct text is visible on the card
  await expect(note.locator('.note-text')).toContainText('Remember to review the Q2 deck');
});

// 1.2 — [ ] lines each become a separate todo in the Notes tab
test('[ ] lines create separate todos in the Notes tab', async ({ page }) => {
  await page.click('#compose');
  await page.keyboard.type('[ ] Review Q2 deck');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('[ ] Send follow-up');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('[ ] Update JIRA');
  await page.click('button:has-text("Add")');

  // INTENT 1: user is now looking at the Notes tab
  await expect(page.locator('.tab-btn.active')).toHaveText('Notes');

  // INTENT 2: each line becomes its own todo — 3 lines → 3 items
  await expect(page.locator('.todo-item')).toHaveCount(3);

  // INTENT 3: no plain note was created (routing went to todos, not notes)
  await expect(page.locator('#notes-list .note-card')).toHaveCount(0);

  // INTENT 4: the correct text appears in each todo item
  const todos = page.locator('.todo-item');
  await expect(todos.nth(0)).toContainText('Review Q2 deck');
  await expect(todos.nth(1)).toContainText('Send follow-up');
  await expect(todos.nth(2)).toContainText('Update JIRA');
});

// 1.3 — #todo tag routes all lines as todos
test('#todo tag routes all lines as todos in the Notes tab', async ({ page }) => {
  await page.click('#compose');
  await page.keyboard.type('Pick up dry cleaning');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('Call the dentist');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('#todo');
  await page.click('button:has-text("Add")');

  // INTENT 1: switched to Notes tab
  await expect(page.locator('.tab-btn.active')).toHaveText('Notes');

  // INTENT 2: both lines become todos (not plain notes)
  await expect(page.locator('.todo-item')).toHaveCount(2);
  await expect(page.locator('#notes-list .note-card')).toHaveCount(0);

  // INTENT 3: correct text in each todo; routing tag stripped
  const todos = page.locator('.todo-item');
  await expect(todos.nth(0)).toContainText('Pick up dry cleaning');
  await expect(todos.nth(1)).toContainText('Call the dentist');
});

// 1.4 — @name routes to 1:1 Notes tab, grouped under correct person
test('@name routes to 1:1 Notes tab grouped under that person', async ({ page }) => {
  await page.fill('#compose', 'Discuss Q3 roadmap @alice');
  await page.keyboard.press('Enter');

  // INTENT 1: switched to 1:1 Notes tab
  await expect(page.locator('.tab-btn.active')).toHaveText('1:1 Notes');

  // INTENT 2: note appears in the correct person group
  const group = page.locator('#oon-grid').getByText('alice', { exact: false });
  await expect(group).toBeVisible();

  // INTENT 3: note text is present
  await expect(page.locator('#oon-grid')).toContainText('Discuss Q3 roadmap');
});

// 1.5 — #insp routes to Inspiration tab
test('#insp routes to Inspiration tab', async ({ page }) => {
  await page.fill('#compose', 'Use contrast ratio checker before shipping #insp');
  await page.keyboard.press('Enter');

  // INTENT 1: switched to Inspiration tab
  await expect(page.locator('.tab-btn.active')).toHaveText('Inspiration');

  // INTENT 2: card appears in the inspiration container
  await expect(page.locator('#insp-container .note-card')).toHaveCount(1);

  // INTENT 3: routing tag stripped from displayed content
  const card = page.locator('#insp-container .note-card').first();
  await expect(card).toContainText('Use contrast ratio checker before shipping');
  await expect(card).not.toContainText('#insp');
});

// 1.6 — #instance tag shows credential ghost hint in compose
test('#instance tag shows ghost hint in compose box', async ({ page }) => {
  await page.click('#compose');
  await page.keyboard.type('#instance');

  // INTENT: ghost overlay appears with field order guidance
  const backdrop = page.locator('#compose-backdrop');
  await expect(backdrop).toContainText('* notes (optional)');
});

// 1.7 — Credential with all fields parsed correctly
test('credential with all fields creates a correctly parsed card', async ({ page }) => {
  await page.click('#compose');
  await page.keyboard.type('My Demo');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('https://demo.example.com');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('admin');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('secret123');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('* expires end of quarter');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('#instance');
  await page.click('button:has-text("Add")');

  // INTENT 1: switched to Instances tab
  await expect(page.locator('.tab-btn.active')).toHaveText('Instances');

  // INTENT 2: card created with correct fields (wide view is default)
  const card = page.locator('.demo-wide-card').first();
  await expect(card.locator('.demo-wide-name')).toContainText('My Demo');
  await expect(card.locator('.demo-wide-val').first()).toContainText('demo.example.com');
  await expect(card.locator('.demo-wide-val').nth(1)).toContainText('admin');
  await expect(card.locator('.demo-wide-notes')).toContainText('expires end of quarter');
});

// 1.8 — Credential with no name auto-generates name from URL hostname
test('credential without name auto-generates name from URL hostname', async ({ page }) => {
  await page.click('#compose');
  await page.keyboard.type('https://myinstance.service-now.com');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('sn_admin');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('pass123');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('#instance');
  await page.click('button:has-text("Add")');

  // INTENT: card name is derived from hostname, not blank
  await expect(page.locator('#demos-container')).toContainText('myinstance.service-now.com');
});

// 1.9 — Compose box clears after submit
test('compose box clears after submit', async ({ page }) => {
  await page.fill('#compose', 'This should disappear after submit');
  await page.keyboard.press('Enter');

  // INTENT: compose textarea is empty after submission
  await expect(page.locator('#compose')).toHaveValue('');
});
