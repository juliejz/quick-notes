# Error Log — Quick Notes
_Bugs that took multiple attempts to fix. Read before touching related code._

---

## Playwright test pitfalls — written 2026-05-08/09

_43 tests written across 7 spec files: compose (9), notes-tab (7), inspiration-tab (6), oon-tab (3), instances-tab (8), theme (3), customize-tab (7). All passing. Notes below are pitfalls that caused test failures during authoring._

---

## 4. Opacity-based overlays look "visible" to Playwright

**Symptom:** Tests checking `expect(overlay).not.toBeVisible()` always fail; tests checking `expect(overlay).toBeVisible()` always pass — even when the overlay is visually closed.

**Root cause:** Several overlays in the app (customize modal `#customize-overlay`, OON modal `#oon-modal-overlay`, demo edit modal `#demo-edit-overlay`) use `opacity:0; pointer-events:none` for the closed state and add `.open` to show them. They are always in the DOM with non-zero size, so Playwright's `toBeVisible()` returns true regardless of open/closed state.

**Fix in tests:** Check for the `.open` class instead of visibility:
```js
// Open:  await expect(page.locator('#customize-overlay.open')).toHaveCount(1);
// Closed: await expect(page.locator('#customize-overlay.open')).toHaveCount(0);
```

---

## 5. `filter({ hasText })` doesn't match input values — only text content

**Symptom:** `.customize-row.filter({ hasText: 'Inspiration' })` returned 0 elements, causing tests to hang waiting for the element indefinitely.

**Root cause:** Playwright's `hasText` filter checks an element's `textContent`, not the `value` attribute of child inputs. The customize rows only have text in `<input value="...">` elements, which contribute nothing to `textContent`.

**Fix in tests:** Use `nth()` with the known tab order (Notes=0, Inspiration=1, 1:1 Notes=2, Instances=3):
```js
page.locator('.customize-row').nth(1).locator('input[data-field="label"]')
```

---

## 6. Customize tag input updates `_custDraft` only on blur, inside a 150ms setTimeout

**Symptom:** After `fill()` or `pressSequentially()` on a routing tag input and immediately saving, the saved config still had the old tag value.

**Root cause:** `onCustTagInput` (the `oninput` handler) only shows autocomplete suggestions — it does **not** update `_custDraft`. The actual draft update happens in `onCustTagBlur`, inside `setTimeout(..., 150)`. If you click Save without waiting, `saveCustomize()` runs before the timeout fires and reads the stale `_custDraft` value.

**Fix in tests:** Explicitly blur the input with `press('Tab')`, then wait for the timeout to fire:
```js
await tagInput.pressSequentially('#idea');
await tagInput.press('Tab');
await page.waitForTimeout(200);
await saveCustomize(page);
```

---

## 7. App bug: `validateCustConflict` ran before `_custDraft.tags` was updated — conflict warning never appeared

**Symptom:** Test 7.5 (duplicate routing tag shows conflict warning) failed — `.cust-conflict.visible` had count 0 even after typing a conflicting tag.

**Root cause:** Inside `onCustTagBlur`'s `setTimeout`, `validateCustConflict(idx)` was called BEFORE `_custDraft[idx].tags = parsed`. So the conflict check always ran against the OLD tag value, finding no conflict.

**Fix in app (`index.html`):** Move the draft update before the validation call:
```js
// Before (broken):
validateCustConflict(idx);
_custDraft[idx].tags = parsed;

// After (fixed):
_custDraft[idx].tags = parsed;
el.value = parsed.join(', ');
validateCustConflict(idx);
```

---

## 8. Wide-view instance cards have a different delete button class than grid-view cards

**Symptom:** Test asserting `.demo-delete-btn` exists on a wide-view card failed — element not found.

**Root cause:** The two view modes use different class names. Wide view (`renderDemoWideCard`): `.demo-wide-del`. Grid view (`renderDemoGridCard`): `.demo-delete-btn`.

**Fix in tests:** Use `.demo-wide-del` when testing wide view (the default).

---

## 9. `toContainText` fails in strict mode when the locator matches multiple elements

**Symptom:** `expect(page.locator('.tab-btn')).toContainText('Ideas')` threw a strict mode violation — there are 4 tab buttons.

**Fix in tests:** Use a more specific locator:
```js
expect(page.locator('.tab-btn[data-tab="insp"]')).toContainText('Ideas')
```

---

## 10. Clipboard API silently fails in headless Playwright without permission grant

**Symptom:** Copy button test — button click seemed to do nothing; "Copied!" state never appeared.

**Root cause:** The browser's clipboard API (`navigator.clipboard.writeText`) is blocked in headless mode without explicit permission.

**Fix in tests:** Grant permissions at the test level (not just once at the suite level):
```js
test('...', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  ...
});
```

---

## 11. `[ ]` in compose — Enter key creates a new list item, not a submit

**Symptom:** Test submitting a `[ ] task` by pressing Enter didn't work — the app created a new `[ ]` line instead of submitting.

**Root cause:** The compose box has auto-list behavior: if the current line starts with `[ ]`, pressing Enter appends another `[ ]` line on the next line instead of submitting.

**Fix in tests:** Use `Shift+Enter` between lines, then click the Add button:
```js
await page.keyboard.type('[ ] task one');
await page.keyboard.press('Shift+Enter');
await page.keyboard.type('[ ] task two');
await page.click('button:has-text("Add")');
```

---

## 1. Nav avatar not vertically centred with theme toggle

**Symptom:** Avatar top edge aligned with toggle top edge but bottom didn't match — clearly not centred. Showed up on GitHub Pages; localhost looked fine (likely because localhost used the `auth-initial` div fallback rather than the real `<img>`).

**Root cause:** The `<img class="auth-avatar">` sits inside a chain of wrappers:
```
.nav-right (flex, align-items:center)
  └ #auth-slot (flex, align-items:center)
      └ .auth-menu-wrap (flex, align-items:center)
          └ div[onclick] ← culprit
              └ <img class="auth-avatar">
```
The `div[onclick]` wrapper had no explicit display/line-height, so it carried the default `line-height` of the document (~20px), making it taller than the 28px avatar. `align-items: center` on parent flex containers centres the *div*, not the image inside it, so the image appeared top-biased.

**Fix:** Add `display:flex; align-items:center; line-height:0` to the `div[onclick]` wrapper in the JS template that builds the auth slot HTML.

**Attempts that didn't work:**
- Adding `display:flex; align-items:center` to `.auth-menu-wrap` — helped but not enough
- Adding `display:flex; align-items:center` to `#auth-slot` inline style — same
- Adding `display:block` to `.auth-avatar` — removes `vertical-align:baseline` on the img but the wrapper div's line-height still added phantom height

---

## 2. Inserting a hyperlink into the compose box pushed cursor far right with invisible characters

**Symptom:** After using "Add link" or paste-URL-over-selection, the compose box showed the label correctly but an invisible string of characters occupied horizontal space, pushing the cursor far to the right (sometimes wrapping to a new line).

**Root cause:** The compose box uses a backdrop pattern — the `<textarea>` has `color: transparent` and an absolutely-positioned backdrop div renders the visible text. Any approach that stored the full URL in the textarea (e.g. `[label](https://very-long-url)` or a compact encoding like `[label](\x01ID\x01)`) caused the textarea layout to differ from the visual backdrop, since the URL characters are invisible but still occupy pixel space. The cursor position reflects the actual textarea content, not the visual backdrop.

**Fix:** Don't change the textarea value at all when a link is inserted. Instead:
- Store link regions in a side array `_pendingLinks = [{start, end, label, url}]`
- The textarea value stays as just the label text (unchanged)
- `syncBackdrop()` reads `_pendingLinks` and renders those regions as accent-coloured chips
- The compose `input` event handler calls `_updatePendingLinks()` to shift/invalidate regions as the user types
- `expandLinks()` reconstructs `[label](url)` markdown from `_pendingLinks` just before `handleAdd()` parses and saves

**Attempts that didn't work:**
- Rendering the full `[label](url)` in the backdrop with muted styling — URL still occupies visual space and spills across lines
- Compact encoding `[label](\x01ID\x01)` in the textarea — shorter than the URL but still adds ~10 invisible chars, cursor still visibly displaced
- Making the backdrop chip `color: transparent` for the URL portion — invisible but characters still took up layout space

---

## 12. PWA on Dock opened a 404 — `start_url: "/"` resolved to GitHub Pages user root, not the project subpath

**Symptom:** Clicking the Quick Notes icon in the Dock launched a window showing GitHub's 404 page (`juliejz.github.io/`). Opening the app from a browser tab (`/quick-notes/`) worked fine.

**Root cause:** `manifest.json` had `"start_url": "/"`. On GitHub Pages, the app is served from a project subpath (`juliejz.github.io/quick-notes/`), but the user's GitHub root (`juliejz.github.io/`) has no site — hence 404. The "Open in app" button worked because it passes the current page URL, bypassing the manifest entirely; the Dock icon goes through the manifest's `start_url` since that's what was registered at PWA install time.

**Fix in `manifest.json`:** use a relative path so the same manifest works in local dev (served from `/`) and on Pages (served from `/quick-notes/`):
```json
"start_url": "./",
"scope": "./"
```
`./` resolves relative to the manifest's location, so the resolved start URL is whatever directory the manifest lives in.

**Re-installing the PWA is required to pick up the change.** The OLD installed app shim has the old `start_url` baked in — Chrome does not auto-refresh it. Full clean-up sequence:
1. Delete the installed app from `~/Applications/Chrome Apps.localized/Quick Notes.app` (Finder → drag to trash → empty trash)
2. Visit `chrome://apps` and remove it from there too if listed
3. **Cmd+Q to fully quit Chrome** (not just close the window — Chrome keeps state in memory)
4. Reopen Chrome, visit the app, verify in DevTools → Application → Manifest that `Start URL` shows `./` (or the resolved subpath URL), then install via the address-bar install icon

**Attempts that didn't work:**
- Reinstalling via Chrome's install icon without first deleting the existing `.app` — Chrome treated it as an update and kept the old `start_url`
- Bumping the service worker cache version — doesn't matter, the manifest cache lives outside the SW (Chrome's own PWA install storage)

---

## 3. "Add link" popup — clicking Add button had no effect

**Symptom:** Right-click → Add link → URL popup appeared → clicking "Add" did nothing; popup stayed open or closed with no change.

**Root cause:** A `mousedown` dismiss listener was attached to `document` (to close the popup on outside clicks). This listener fired on the same `mousedown` event as the "Add" button click — before the `click` event — and called `_removeCtx()` which removed the popup from DOM. The subsequent `click` event either never fired (element removed mid-sequence) or found stale references.

**Fix:**
1. Change the "Add" button listener from `click` to `mousedown` with `ev.stopPropagation()` + `ev.preventDefault()` — runs before the document dismiss listener can fire, and prevents focus-stealing
2. Snapshot `el.selectionStart` / `el.selectionEnd` at the same `mousedown` moment (before any focus changes)
3. Use direct `el.value = ...` assignment instead of `el.setRangeText()` with explicit positions
