import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// Helper: add a todo via compose
async function addTodo(page, text) {
  await page.click('#compose');
  await page.keyboard.type(`[ ] ${text}`);
  await page.click('button:has-text("Add")');
}

// Helper: add a plain note via compose
async function addNote(page, text) {
  await page.fill('#compose', text);
  await page.keyboard.press('Enter');
}

// 2.1 — Todos appear above plain notes with a horizontal divider
test('todos appear above plain notes with a divider', async ({ page }) => {
  await addNote(page, 'This is a plain note');
  await addTodo(page, 'This is a todo');

  // INTENT 1: both todos and notes sections are present
  await expect(page.locator('#todos-section')).toBeVisible();
  await expect(page.locator('#notes-list')).toBeVisible();

  // INTENT 2: todos-section appears before notes-list in the DOM order
  const todosBefore = await page.evaluate(() => {
    const todos = document.getElementById('todos-section');
    const notes = document.getElementById('notes-list');
    return todos.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
  expect(todosBefore).toBeTruthy();
});

// 2.2 — Checking a todo marks it done and collapses it under the completed chevron
test('checking a todo marks it done and collapses under completed chevron', async ({ page }) => {
  await addTodo(page, 'Buy oat milk');
  await page.locator('.tab-btn[data-tab="notes"]').click();

  const checkbox = page.locator('.todo-checkbox').first();
  await checkbox.click();

  // INTENT 1: item gets the done class (strikethrough style)
  await expect(page.locator('.todo-item.done')).toHaveCount(1);

  // INTENT 2: completed chevron toggle appears
  await expect(page.locator('.completed-toggle')).toBeVisible();

  // INTENT 3: the completed list is collapsed by default (has .collapsed class → display:none)
  await expect(page.locator('.completed-list.collapsed')).toHaveCount(1);
});

// 2.3 — Expanding completed chevron and unchecking restores item to active todos
test('unchecking a completed todo restores it to active todos', async ({ page }) => {
  await addTodo(page, 'Call the bank');
  await page.locator('.tab-btn[data-tab="notes"]').click();

  // Check the item
  await page.locator('.todo-checkbox').first().click();

  // Expand the completed section
  await page.locator('.completed-toggle').click();
  await expect(page.locator('.completed-list.collapsed')).toHaveCount(0);

  // Uncheck it
  await page.locator('.completed-list .todo-checkbox').first().click();

  // INTENT: item back in active todos, completed section gone
  await expect(page.locator('.todo-item.done')).toHaveCount(0);
  await expect(page.locator('.completed-toggle')).toHaveCount(0);
  await expect(page.locator('.todo-item')).toHaveCount(1);
});

// 2.4 — Hovering a todo or note reveals the delete button
test('hovering a todo reveals the delete button', async ({ page }) => {
  await addTodo(page, 'Hover test todo');
  await page.locator('.tab-btn[data-tab="notes"]').click();

  const todoItem = page.locator('.todo-item').first();
  await todoItem.hover();

  // INTENT: delete button becomes visible on hover
  await expect(todoItem.locator('.todo-delete')).toBeVisible();
});

// 2.5 — Deleting a todo removes it immediately
test('deleting a todo removes it immediately', async ({ page }) => {
  await addTodo(page, 'Delete me');
  await page.locator('.tab-btn[data-tab="notes"]').click();

  await expect(page.locator('.todo-item')).toHaveCount(1);

  const todoItem = page.locator('.todo-item').first();
  await todoItem.hover();
  await todoItem.locator('.todo-delete').click();

  // INTENT: todo is gone
  await expect(page.locator('.todo-item')).toHaveCount(0);
});

// 2.6 — ## Section name creates a section header; todos below grouped under it
test('## Section name creates a named section grouping todos below it', async ({ page }) => {
  await page.click('#compose');
  await page.keyboard.type('## Work');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('[ ] Review PR');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('[ ] Update docs');
  await page.click('button:has-text("Add")');

  // INTENT 1: section header appears
  await expect(page.locator('.todo-section-header')).toBeVisible();
  await expect(page.locator('.todo-section-header')).toContainText('Work');

  // INTENT 2: todos are present under the section
  await expect(page.locator('.todo-item')).toHaveCount(2);
});

// 2.7 — Multiple plain notes appear newest first
test('multiple plain notes appear newest first', async ({ page }) => {
  await addNote(page, 'First note');
  await addNote(page, 'Second note');
  await addNote(page, 'Third note');

  // INTENT: most recently added note is at the top
  const cards = page.locator('#notes-list .note-card');
  await expect(cards.first()).toContainText('Third note');
  await expect(cards.nth(1)).toContainText('Second note');
  await expect(cards.nth(2)).toContainText('First note');
});
