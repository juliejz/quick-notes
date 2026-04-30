# Quick Notes — Context & Rules
_Last updated: 2026-04-30_

---

## I. Overview

### 1.1 What this is
A personal PWA — a focused, single-purpose scratchpad installed on the MacBook Dock. No accounts, no clutter. Everything lives in `localStorage`, with planned GitHub Gist sync for cloud backup.

**One job:** capture and revisit short notes as fast as possible.

### 1.2 Use cases (by tab)

**Notes** — Ad-hoc todos and plain notes that come up during solo work or 1:1s. Input a checklist with `[ ]` syntax or `#todo` to create multiple tasks at once; check them off as done, completed items collapse under a chevron until deleted.

**Inspiration** — Useful AI prompts, reference sites, and tool resources collected during work. Tagged with side tags like `#illustration` or `#layout` for later categorisation into a personal workflow doc. Copy button for quick reuse.

**1:1 Notes** — Topics to raise with a specific colleague, tagged with `@name` as they come to mind throughout the week. At end of week, copy-all per person to paste into the 1:1 doc.

**Instances** — Demo environment credentials collected from colleagues. Grid view for quick copy-paste during a demo; doc view for bulk review and cleanup of expired instances.

### 1.3 Dock installation
Installed via Chrome:
1. Open the app in Chrome
2. Chrome address bar → install icon (or menu → "Install Quick Notes…")
3. App appears in Launchpad and can be dragged to Dock

For the app to behave like a native window (no browser chrome, no tabs), the manifest must declare `"display": "standalone"`.

---

## II. Setup & Technical Spec

### 2.1 How to run locally
```bash
cd "/path/to/quick-notes"
python3 -m http.server 3456
# open http://localhost:3456 in Chrome
```

### 2.2 File structure
```
quick-notes/
├── index.html              # The app itself (PWA entry point)
├── project.html            # Standalone project page — browse UI options locally
├── manifest.json           # PWA config
├── sw.js                   # Service worker (offline support)
├── icon.svg                # PWA icon (SVG, any size)
├── icon.png                # PWA icon (1024×1024 PNG, used in manifest)
├── favicon.png             # Browser tab favicon (cropped tightly from icon.png, 256×256)
├── pitfalls.md             # Tricky bugs that took multiple attempts — read before touching related code
├── mockups/                # UI explorations, grouped by design variable
│   └── {variable-name}/    # One subfolder per tab (e.g. overall-layout, instance-tab)
│       ├── option-01.html
│       ├── option-02.html
│       └── option-03.html
└── CLAUDE.md               # This file
```

**Mockups → tabs mapping:**
Each subfolder under `mockups/` maps to one tab in `project.html`. The folder name becomes the tab label (kebab-case → Title Case, e.g. `overall-layout` → "Overall Layout"). Options within a folder are numbered sequentially. If only one subfolder exists, the tab bar is hidden and options are shown directly.

### 2.3 How this repo connects to Jing's Design Hub

This repo is part of a wider ecosystem. **Jing's Design Hub** (`jing-design-hub` repo) acts as a central portfolio — its Projects panel lists all personal projects, and clicking a project opens a detail page showing UI exploration options as thumbnail cards.

**Each project lives in its own repo and deploys to its own GitHub Pages URL.** The Design Hub just references the deployed mockup URLs — no code is shared between repos.

To add Quick Notes to the Design Hub:
1. Deploy this repo to GitHub Pages (e.g. `https://jing-zhu.github.io/quick-notes/`)
2. Open `data/projects.json` in the Design Hub repo
3. Add an entry pointing `mockup` fields at the deployed GitHub Pages URLs:

```json
{
  "id": "quick-notes",
  "title": "Quick Notes",
  "description": "A focused scratchpad PWA installed on the MacBook Dock.",
  "status": "active",
  "options": [
    {
      "number": "01",
      "tab": "UI Options",
      "title": "Option title",
      "description": "Option description",
      "mockup": "https://jing-zhu.github.io/quick-notes/mockups/option-01.html"
    }
  ]
}
```

No other changes to the Design Hub are needed.

### 2.4 project.html — designer tooling, not part of the app

Each tab in the project page represents one **design variable** — a specific design question being explored (e.g. "Overall Layout", "Instance Tab"). Options within a tab are different answers to the same question. Tabs let you explore multiple independent design dimensions in parallel without mixing them together.

To build `project.html`, replicate the project detail page UI directly from Jing's Design Hub. Read the reference implementation at:

```
/Users/jing.zhu/Documents/🎡 Side projects/Jing's design hub/index.html
```

Look for the `#page-project` section and all associated CSS and JS. Reuse the structure, styles, and logic as-is — do not rebuild from scratch.

`project.html` has nothing to do with the app's functionality. It is a **designer-only tool** — a self-contained page that replicates the Design Hub's project detail experience locally, so UI options can be browsed and compared without deploying anything first.

- Lists mockup options as thumbnail cards (same grid layout as Design Hub)
- Clicking a card opens the mockup fullscreen in an iframe overlay
- Only used during the design/exploration phase
- Has no relation to `index.html` or any app logic — it is never linked to from the app itself

**Workflow:**
1. During design exploration: open `project.html` locally to browse options
2. Once a direction is chosen and the repo is deployed: add the project to Design Hub's `data/projects.json` — the Design Hub then serves the same browsing experience via GitHub Pages URLs, and `project.html` is no longer needed day-to-day

### 2.5 manifest.json
```json
{
  "name": "Quick Notes",
  "short_name": "Notes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#131312",
  "theme_color": "#131312",
  "icons": [
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" }
  ]
}
```

### 2.6 Service worker (sw.js)
**Network-first for `index.html`** — always fetches the latest from the network, updates the cache, falls back to cache when offline. This means GitHub Pages deploys are picked up immediately without needing a cache bump.

**Cache-first for static assets** (`manifest.json`, `icon.svg`, `favicon.png`). Only bump `CACHE` version if you change these files.

```js
const CACHE = 'quick-notes-v5';
const ASSETS = ['/manifest.json', '/icon.svg', '/favicon.png'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
);
self.addEventListener('activate', e =>
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
);
self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
```

### 2.7 Required HTML head tags
```html
<link rel="icon" href="favicon.png" type="image/png" />
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#131312" id="theme-meta" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Quick Notes" />
```

### 2.8 Data persistence
Five localStorage keys — one per content type:

```js
const NOTES_KEY = 'quick-notes';    // plain notes
const TODOS_KEY = 'quick-todos';    // todo checklist items
const INSP_KEY  = 'quick-insp';     // inspiration / prompts
const OON_KEY   = 'quick-oon';      // 1:1 notes
const DEMOS_KEY = 'demo-instances'; // credential cards
```

Schemas:
- Plain note: `{ id, type: 'note', text, tags, createdAt }`
- Todo: `{ id, type: 'todo', text, done, createdAt }`
- Inspiration: `{ id, type: 'insp', text, tags, createdAt }`
- 1:1 note: `{ id, type: 'oon', person, text, tags, createdAt }`
- Demo instance: `{ id, type: 'demo', name, url, username, password, notes, tags, createdAt }`

---

## III. Feature Spec

### 3.1 Single compose input (smart parser)
One input box for everything. Content type is detected from raw text and routed automatically — no forms, no modals. After submit, the app auto-switches to the relevant tab.

**Inline URL linking** — two ways to embed a hyperlink on selected text:
1. **Right-click → Add link** — select text, right-click, choose "Add link", paste/type a URL and confirm. The label stays visible as an accent-coloured chip; the URL is hidden in the compose box and only expanded to `[label](url)` markdown on submit.
2. **Paste over selection** — select text, then paste a bare URL (`https://…`) directly. Same result as above.

Links render as clickable `<a>` elements in saved notes/ideas. Bare URLs in text are also auto-linkified on render.

**Routing priority (checked in order):**

| Trigger | Routes to |
|---------|-----------|
| Any line starts with `[ ]` or `- [ ]`, OR `#todo` tag | Notes tab → Todo checklist |
| `#insp` tag | Inspiration tab |
| `#instance` tag | Instances tab |
| `@name` mention (no credential tags) | 1:1 Notes tab |
| Anything else | Notes tab → Plain note |

**Todo batch input** — both triggers work:
1. `[ ] task` prefix on any line → each line becomes a separate todo
2. `#todo` tag on the block → all lines become todos
One submit creates multiple todos.

**Credential parsing** (when credential tag present) — positional line format:
```
Name (optional)
URL
username
password
* notes (optional)
```
- Lines are matched positionally (non-tag, non-`*` lines fill name → URL → username → password in order)
- A line starting with `*` is treated as the notes field (can appear anywhere)
- If name is omitted and URL is present, card name is auto-generated from the URL hostname
- `#instance` (and related tags) are stripped; remaining `#tag` tokens are stored as tags

**Example inputs:**
```
[ ] Review Q2 deck
[ ] Send follow-up to design team
[ ] Update JIRA tickets
```
→ Creates 3 separate todos.

```
batestd ServiceNow
https://batestd.service-now.com/navpage.do
sns_admin
Studio@247
* expires end of quarter
#instance
```
→ Creates a Demo Instance card.

### 3.2 Notes tab
Two content types stacked vertically:

**Todos (top):**
- Active todos shown as checkboxes
- Checking an item marks it done: grey + strikethrough
- Completed items collapse under a chevron toggle (▸ Completed N), stays until manually deleted
- Delete via ✕ (hover to reveal)

**Plain notes (below):**
- Newest first
- Delete via ✕

A horizontal divider separates todos from notes when both are present.

### 3.3 Inspiration tab
Prompt text + free-form side tags (e.g. `#illustration`, `#layout`).
- **2-column grid** — cards use the same style as Notes cards (no bullet dot); each card shows full text, tags, Copy button, timestamp, and delete (hover to reveal)
- The routing tag (default `#insp`) is stripped from stored tags; it's the router, not a category
- Empty state text reads the tab's current label and routing tag dynamically from `tabsConfig`, and includes a "Customize your tag settings here" link that opens the customize modal

### 3.4 1:1 Notes tab
Notes tagged with `@name` for a specific colleague.
- Grouped by person, most recently active person first
- Each group has a **Copy all** button → copies all items as `• bullet list`
- Delete per item via ✕

### 3.5 Instances tab
Demo credential cards.
- **Wide view** (default) — full-width rows; columns: name+time | URL/user/pass | notes | actions. Notes column fills remaining space and wraps to match credential column height. Edit + delete buttons in a narrow actions column at the far right.
- **Grid view** — 2-column cards with Copy URL / Copy User / Show+Copy Password. Edit button sits in the card header next to the title/timestamp; delete button top-right corner.
- Password masked by default; Show/Hide toggle per card
- Copy buttons show "Copied!" feedback for 1.5s
- **Editing** — clicking the edit (pencil) icon on any card opens a modal with fields: Name, URL, Username, Password, Notes. Save overwrites the card in-place; Cancel discards changes.

### 3.6 Tags
Parsed as any `#word` or `@word` token. Free-form — no dedicated tag management. Tags display as pills on cards. `#insp` is a router tag and is not shown as a pill.

### 3.7 Tab customisation
A "Customize" link at the end of the compose-hint row opens a modal where the user can:
- **Reorder tabs** — drag & drop rows
- **Rename tabs** — e.g. "Inspiration" → "Ideas"
- **Change routing tags** — e.g. add `#inst` as an alias for the Instances tab; conflict detection warns if the same tag is used in two tabs
- **Hide/show tabs** — eye toggle per row
- **Reset to defaults**

Config stored in `localStorage` under key `quick-tabs-config`. Tab bar, routing logic, and empty state text are driven entirely from this config at runtime.

**Fixed routing (not user-configurable):**
- `[ ]` / `#todo` → always routes to Notes tab
- `@name` mentions → always routes to 1:1 Notes tab

### 3.8 Cloud sync (planned — not yet built)
**Current:** all data in `localStorage` only. Clearing site data (DevTools or Chrome settings) wipes everything.

**Planned:** GitHub Gist sync
- User generates a GitHub PAT with `gist` scope and enters it once in the app
- App auto-creates a private Gist on first sync; stores Gist ID in localStorage
- Every save pushes data to the Gist in the background (non-blocking)
- On app open, pulls latest data from Gist; localStorage used as fallback when offline

**If the app ever goes multi-user (shared with colleagues):** migrate to Supabase — free tier covers small teams, has auth + row-level security, and the flat JSON data schema maps directly to Supabase tables.

### 3.9 Out of scope
- No editing of saved items (except Demo Instances — see 3.5)
- No search or filter
- No markdown rendering
- No drag-to-reorder

---

## IV. Design Language

Matches Jing's Design Hub exactly — same tokens, same typeface, same editorial tone. The app should feel like it belongs in the same family.

### 4.1 Design tokens

| Token        | Dark       | Light     |
|--------------|------------|-----------|
| `--surface`    | `#131312`  | `#ffffff` |
| `--surface2`   | `#1F201D`  | `#fbfbf9` |
| `--surface3`   | `#272820`  | `#f3f3ef` |
| `--border`     | `#52524B`  | `#deded8` |
| `--accent`     | `#9ef53a`  | `#3A9A1C` |
| `--on-accent`  | `#0e0e0c`  | `#ffffff` |
| `--text`       | `#eeeee8`  | `#111110` |
| `--muted`      | `#8a8a82`  | `#66665e` |

Always use `var(--token)` — never hardcode colours. Use `--on-accent` for any text or icon that sits on an `--accent` background (e.g. the + icon inside the add button).

### 4.2 Typography
- **Headings / wordmark:** DM Serif Display (Google Fonts), italic as accent
- **Body / notes / UI:** system sans-serif (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif`)
- **Monospace (URLs, passwords):** `'SF Mono', ui-monospace, 'Fira Code', monospace`

### 4.3 Theme
- Default to dark, respect `prefers-color-scheme`
- Persist user's manual choice in `localStorage` under key `'theme'`
- Light/Dark toggle in the nav — same segmented control style as Design Hub

### 4.4 Visual rules
- Grain texture overlay on body (same SVG noise as Design Hub)
- Near-zero border-radius on inputs (`8px` max), `12px` on note/demo cards
- No shadows on cards — use border instead (`1px solid var(--border)`)
- Lime green (`--accent`) used only for: active states, the add button, active tab indicator
- No purple, no blue, no gradients

### 4.5 Layout

**App (`index.html`):**
- Content max-width: `980px`, centered with `padding: 0 32px` — matches Design Hub
- Nav: logo left, theme toggle right — same structure as Design Hub
- Global compose area below nav, above tabs
- Tab nav separates Notes and Demo Instances views

**Project page (`project.html`):**
- Same max-width, grid, thumbnail card rules, and mockup overlay as Design Hub's project detail page
- Full rules: `/Users/jing.zhu/Documents/🎡 Side projects/Jing's design hub/project-docs/_project-page.md`

### 4.6 Nav / logo
```
✦  Quick Notes   (italic serif wordmark)         [Light] [Dark]  [avatar]
```
The ✦ mark in `--accent`, wordmark in DM Serif Display italic. Avatar is the signed-in user's Google photo (falls back to initial on error). A 6×6px accent dot to the left of the avatar flashes (opacity transition, never shifts layout) when data is syncing.

---

## V. Window & PWA Behaviour

- **No browser chrome:** `display: standalone` removes the URL bar and tabs
- **Offline-capable:** service worker ensures the app opens even with no internet
- **Theme color:** matches `--surface` (`#131312` dark / `#ffffff` light) so the title bar blends with the app background on macOS
- **Cache busting:** bump `CACHE` version in `sw.js` on every deploy; in dev, use DevTools → Application → Service Workers → Unregister then hard reload
