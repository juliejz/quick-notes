# Quick Notes — QA Test Plan
_Last updated: 2026-05-08_

---

## Numbering convention

Test case numbers follow the format `[module].[case]`, where the module number is fixed per feature area. Modules are ordered by user workflow — from the primary input (compose) through each destination tab, then settings and infrastructure. Numbers are not sequential across modules by design — gaps are intentional and indicate a different feature area.

| Module | Feature area |
|--------|--------------|
| 1 | Compose & Routing |
| 2 | Notes Tab |
| 3 | Inspiration Tab |
| 4 | 1:1 Notes Tab |
| 5 | Instances Tab |
| 6 | Inline Link |
| 7 | Tab Customization |
| 8 | Theme & Data Persistence |
| 9 | Nav & Cloud Sync |
| 10 | PWA & Offline |

---

## 1. Automatable — High regression risk

### Compose & Routing

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

### Notes Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 2.1 | Add todos and plain notes | Both Tasks and Notes columns are visible | |
| 2.2 | Check a todo | Item turns grey with strikethrough; collapses under "Completed N" chevron | |
| 2.3 | Expand "Completed" chevron, uncheck an item | Item restored to active todos | |
| 2.4 | Hover a todo or note | ✕ delete button appears | |
| 2.5 | Delete a todo or note | Item removed immediately | |
| 2.6 | Add a note with `## Section name` on a line | Section header appears; todos below are grouped under it | |
| 2.7 | Add multiple plain notes | Newest appears at the top | |

### Inspiration Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 3.1 | Add two or more inspiration items | Cards render in 2-column grid | |
| 3.2 | Inspect card | No bullet dot; matches Notes card style | |
| 3.3 | Check stored tags | Routing tag (`#insp` or custom) stripped; only free-form tags shown | |
| 3.4 | Click Copy on an inspiration card | Text copied to clipboard; button shows "Copied!" for ~1.5s | |
| 3.5 | Delete all items | Empty state shows correct tab label and routing tag (dynamic from tabsConfig) | |
| 3.6 | Empty state | "Customize your tag settings here" link visible; clicking opens customize modal | |

### 1:1 Notes Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 4.1 | Add notes with different `@person` tags | Grouped by person; most recently active person appears first | |
| 4.2 | Click "Copy all" for a person | All items copied as `• bullet list` | |
| 4.3 | Delete an item | Item removed; group collapses if last item | |

### Instances Tab

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 5.1 | Add a credential; check Wide view | Row shows name+time, URL/user/pass, notes, edit+delete actions | |
| 5.2 | Switch to Grid view | 2-column cards with Copy URL / Copy User / Show+Copy Password | |
| 5.3 | Password field | Masked by default | |
| 5.4 | Click Show on password | Password revealed; button becomes "Hide" | |
| 5.5 | Copy URL / User / Password buttons | Correct value copied; "Copied!" shown for ~1.5s | |
| 5.6 | Click edit (pencil) on a card | Modal opens with all fields prefilled | |
| 5.7 | Edit fields and Save | Card updated in-place with new values | |
| 5.8 | Edit fields and Cancel | Card unchanged | |

### Theme & Data Persistence

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 8.1 | Click Light toggle | App switches to light theme | |
| 8.2 | Reload page | Theme preference persists | |
| 8.3 | Add items across all tabs, reload | All data persists (stored in localStorage) | |

---

## 2. Automatable — Low regression risk

### Tab Customization

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 7.1 | Rename a tab (e.g. "Inspiration" → "Ideas") | Tab bar label updates immediately | |
| 7.2 | Rename a tab | Empty state text reflects new name | |
| 7.3 | Change routing tag (e.g. `#insp` → `#idea`) | New tag routes correctly; old tag no longer routes to that tab | |
| 7.4 | Hide a tab | Tab disappears from nav bar | |
| 7.5 | Use the same routing tag on two tabs | Conflict warning displayed | |
| 7.6 | Reset to defaults | Original tab names, order, and tags restored | |
| 7.7 | Reload page after any config change | Config persists (stored in localStorage) | |

---

## 3. Manual only — High regression risk

### Inline Link

_Run whenever compose area logic is touched._

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 6.1 | Select text → right-click → "Add link" → enter URL → confirm | Chip appears in compose box showing label only | |
| 6.2 | Select text → paste a bare `https://…` URL | Chip appears; cursor position stays correct | |
| 6.3 | After adding chip: check raw URL is not visible in compose box | No raw URL text visible, no invisible characters pushing cursor | |
| 6.4 | Edit text before the chip | Chip region shifts correctly, link preserved | |
| 6.5 | Edit text after the chip | Chip unaffected | |
| 6.6 | Delete the chip label text entirely | Link region removed | |
| 6.7 | Submit note with chip | Saved card shows clickable `<a>` link with correct label and URL | |
| 6.8 | Type a bare URL in plain text, submit | URL auto-linkified as clickable `<a>` in the saved card | |

---

## 4. Manual only — Low regression risk

### Tab Customization

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 7.8 | Reorder tabs via drag | New order persists after page reload | |

### Notes Tab — Drag & Drop

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 2.8 | Drag a section above/below another section | Sections reorder correctly | |
| 2.9 | Drag a todo into a different section | Todo appears under new section; removed from original | |
| 2.10 | Drag a todo out of a section into the default section | Todo no longer grouped under any section | |
| 2.11 | Drag a todo to a different position within the same section | Order updates correctly | |

### PWA & Offline

_Run only when `sw.js` or `manifest.json` is changed._

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 10.1 | Open in Chrome → install via address bar icon | App installs; appears in Launchpad | |
| 10.2 | Open installed app from Dock | Opens in standalone mode (no URL bar, no browser chrome) | |
| 10.3 | Load app, go offline (DevTools → Network → Offline), reload | App loads from SW cache | |
| 10.4 | After a new deploy: reload while online | Latest `index.html` fetched immediately (network-first SW) | |
| 8.4 | Close PWA from Dock and reopen | Data and theme still present | |

### Nav & Cloud Sync

_Run only when nav area or Firebase logic is changed._

| # | Test case | Expected result | Pass |
|---|-----------|-----------------|------|
| 9.1 | Sign in with Google | Avatar (photo or initial fallback) appears in nav | |
| 9.2 | Block avatar image URL (DevTools) | Falls back to initial letter, no broken image icon | |
| 9.3 | Trigger a data save | Green sync dot flashes to the left of avatar; no layout shift | |
| 9.4 | Inspect nav alignment | Theme toggle and avatar are vertically centered on the same baseline | |
