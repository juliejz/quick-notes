# Quick Notes — QA Test Plan
_Last updated: 2026-05-01_

---

## 1. Compose & Routing

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 1.1 | Type plain text, submit | Routes to Notes tab as plain note | |
| 1.2 | Type `[ ] task` lines (multiple), submit | Each line becomes a separate todo; switches to Notes tab | |
| 1.3 | Type block with `#todo` tag, submit | All lines become todos | |
| 1.4 | Type text with `@name`, submit | Routes to 1:1 Notes tab, grouped under correct person | |
| 1.5 | Type text with `#insp` (or custom routing tag), submit | Routes to Inspiration tab | |
| 1.6 | Type `#instance`, submit | Routes to Instances tab; credential ghost hint appears in compose | |
| 1.7 | Credential with all fields (name, URL, user, pass, `* notes`), submit | Card created with all fields correctly parsed | |
| 1.8 | Credential with no name line, submit | Card name auto-generated from URL hostname | |
| 1.9 | Submit any content | Compose box clears after submit | |

---

## 2. Inline Link Feature

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 2.1 | Select text → right-click → "Add link" → enter URL → confirm | Chip appears in compose box showing label only | |
| 2.2 | Select text → paste a bare `https://…` URL | Chip appears; cursor position stays correct | |
| 2.3 | After adding chip: check raw URL is not visible in compose box | No raw URL text visible, no invisible characters pushing cursor | |
| 2.4 | Edit text before the chip | Chip region shifts correctly, link preserved | |
| 2.5 | Edit text after the chip | Chip unaffected | |
| 2.6 | Delete the chip label text entirely | Link region removed | |
| 2.7 | Submit note with chip | Saved card shows clickable `<a>` link with correct label and URL | |
| 2.8 | Type a bare URL in plain text, submit | URL auto-linkified as clickable `<a>` in the saved card | |

---

## 3. Tab Customization

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 3.1 | Rename a tab (e.g. "Inspiration" → "Ideas") | Tab bar label updates immediately | |
| 3.2 | Rename a tab | Empty state text reflects new name | |
| 3.3 | Change routing tag (e.g. `#insp` → `#idea`) | New tag routes correctly; old tag no longer routes to that tab | |
| 3.4 | Reorder tabs via drag | New order persists after page reload | |
| 3.5 | Hide a tab | Tab disappears from nav bar | |
| 3.6 | Use the same routing tag on two tabs | Conflict warning displayed | |
| 3.7 | Reset to defaults | Original tab names, order, and tags restored | |
| 3.8 | Reload page after any config change | Config persists (stored in localStorage) | |

---

## 4. Notes Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 4.1 | Add todos and plain notes | Todos appear above plain notes with a horizontal divider | |
| 4.2 | Check a todo | Item turns grey with strikethrough; collapses under "Completed N" chevron | |
| 4.3 | Expand "Completed" chevron, uncheck an item | Item restored to active todos | |
| 4.4 | Hover a todo or note | ✕ delete button appears | |
| 4.5 | Delete a todo or note | Item removed immediately | |
| 4.6 | Add a note with `## Section name` on a line | Section header appears; todos below are grouped under it | |
| 4.7 | Add multiple plain notes | Newest appears at the top | |

---

## 5. Inspiration Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 5.1 | Add two or more inspiration items | Cards render in 2-column grid | |
| 5.2 | Inspect card | No bullet dot; matches Notes card style | |
| 5.3 | Check stored tags | Routing tag (`#insp` or custom) stripped; only free-form tags shown | |
| 5.4 | Click Copy on a card | Text copied to clipboard; button shows "Copied!" for ~1.5s | |
| 5.5 | Delete all items | Empty state shows correct tab label and routing tag (dynamic from tabsConfig) | |
| 5.6 | Empty state | "Customize your tag settings here" link visible; clicking opens customize modal | |

---

## 6. 1:1 Notes Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 6.1 | Add notes with different `@person` tags | Grouped by person; most recently active person appears first | |
| 6.2 | Click "Copy all" for a person | All items copied as `• bullet list` | |
| 6.3 | Delete an item | Item removed; group collapses if last item | |

---

## 7. Instances Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 7.1 | Add a credential; check Wide view | Row shows name+time, URL/user/pass, notes, edit+delete actions | |
| 7.2 | Switch to Grid view | 2-column cards with Copy URL / Copy User / Show+Copy Password | |
| 7.3 | Password field | Masked by default | |
| 7.4 | Click Show on password | Password revealed; button becomes "Hide" | |
| 7.5 | Copy URL / User / Password buttons | Correct value copied; "Copied!" shown for ~1.5s | |
| 7.6 | Click edit (pencil) on a card | Modal opens with all fields prefilled | |
| 7.7 | Edit fields and Save | Card updated in-place with new values | |
| 7.8 | Edit fields and Cancel | Card unchanged | |

---

## 8. Theme & Data Persistence

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 8.1 | Click Light toggle | App switches to light theme | |
| 8.2 | Reload page | Theme preference persists | |
| 8.3 | Add items across all tabs, reload | All data persists (stored in localStorage) | |
| 8.4 | Close PWA from Dock and reopen | Data and theme still present | |

---

## 9. PWA & Offline

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 9.1 | Open in Chrome → install via address bar icon | App installs; appears in Launchpad | |
| 9.2 | Open installed app from Dock | Opens in standalone mode (no URL bar, no browser chrome) | |
| 9.3 | Load app, go offline (DevTools → Network → Offline), reload | App loads from SW cache | |
| 9.4 | After a new deploy: reload while online | Latest `index.html` fetched immediately (network-first SW) | |

---

## 10. Nav

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 10.1 | Sign in with Google | Avatar (photo or initial fallback) appears in nav | |
| 10.2 | Block avatar image URL (DevTools) | Falls back to initial letter, no broken image icon | |
| 10.3 | Trigger a data save | Green sync dot flashes to the left of avatar; no layout shift | |
| 10.4 | Inspect nav alignment | Theme toggle and avatar are vertically centered on the same baseline | |
