# Quick Notes — Context & Rules
_Last updated: 2026-04-23_

---

## I. Overview

### 1.1 What this is
A personal PWA — a focused, single-purpose scratchpad installed on the MacBook Dock. No accounts, no sync, no clutter. Everything lives in `localStorage`.

**One job:** capture and revisit short notes as fast as possible.

### 1.2 Dock installation
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
python3 -m http.server 3000
# open http://localhost:3000 in Chrome
```

### 2.2 File structure
```
quick-notes/
├── index.html              # The app itself (PWA entry point)
├── project.html            # Standalone project page — browse UI options locally
├── manifest.json           # PWA config
├── sw.js                   # Service worker (offline support)
├── icon-192.png            # PWA icon (192×192)
├── icon-512.png            # PWA icon (512×512)
├── mockups/                # UI explorations, grouped by design variable
│   └── {variable-name}/    # One subfolder per tab (e.g. app-layout, note-card)
│       ├── option-01.html
│       ├── option-02.html
│       └── option-03.html
└── CLAUDE.md               # This file
```

**Mockups → tabs mapping:**
Each subfolder under `mockups/` maps to one tab in the project page. The folder name becomes the tab label (e.g. a folder named `app-layout` appears as the "App Layout" tab). Options within a folder are numbered sequentially — the folder name carries the semantic meaning, not the file name.

When adding a new design direction to explore, create a new subfolder and add it as a new `tab` value in `data/projects.json` in the Design Hub repo. If only one subfolder exists, the tab bar is hidden and options are shown directly.

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

Each tab in the project page represents one **design variable** — a specific design question being explored (e.g. "App Layout", "Note Card Style", "Empty State"). Options within a tab are different answers to the same question. Tabs let you explore multiple independent design dimensions in parallel without mixing them together.

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

### 2.3 manifest.json
```json
{
  "name": "Quick Notes",
  "short_name": "Notes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#131312",
  "theme_color": "#131312",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 2.4 Service worker (sw.js)
Cache-first strategy for offline use. At minimum, cache `index.html` and all local assets on install. No external requests need caching.

```js
const CACHE = 'quick-notes-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
);

self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
```

### 2.5 Required HTML head tags
```html
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#131312" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Quick Notes" />
```

### 2.6 Data persistence
All notes stored in `localStorage` under a single key. No backend, no external dependencies.

```js
const STORAGE_KEY = 'quick-notes';

function load() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
function save(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
```

Each note is a plain object: `{ id, text, createdAt }`.

---

## III. Feature Spec

### 3.1 Core interactions
- **Add** — type in the compose area, press Enter (or click add button) to save
- **Delete** — click ✕ on a note to remove it
- **Persist** — notes survive app close and reopen via localStorage
- **Empty state** — subtle placeholder when no notes exist

### 3.2 Out of scope (keep it simple)
- No editing of saved notes
- No tags, folders, or search
- No sync across devices
- No markdown rendering
- No drag-to-reorder

---

## IV. Design Language

Matches Jing's Design Hub exactly — same tokens, same typeface, same editorial tone. The app should feel like it belongs in the same family.

### 4.1 Design tokens

| Token      | Dark              | Light         |
|------------|-------------------|---------------|
| `--surface`  | `#131312`         | `#ffffff`     |
| `--surface2` | `#1F201D`         | `#fbfbf9`     |
| `--border`   | `#52524B`         | `#deded8`     |
| `--accent`   | `#9ef53a`         | `#3A9A1C`     |
| `--on-accent`| `#0e0e0c`         | `#ffffff`     |
| `--text`     | `#eeeee8`         | `#111110`     |
| `--muted`    | `#8a8a82`         | `#66665e`     |

Always use `var(--token)` — never hardcode colours.

### 4.2 Typography
- **Headings / wordmark:** DM Serif Display (Google Fonts), italic as accent
- **Body / notes / UI:** system sans-serif (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif`)

### 4.3 Theme
- Default to dark, respect `prefers-color-scheme`
- Persist user's manual choice in `localStorage` under key `'theme'`
- Light/Dark toggle in the nav — same segmented control style as Design Hub

### 4.4 Visual rules
- Grain texture overlay on body (same SVG noise as Design Hub)
- Near-zero border-radius on inputs (`8px` max), `12px` on note cards
- No shadows on cards — use border instead (`1px solid var(--border)`)
- Lime green (`--accent`) used only for: active states, the add button, note bullet/marker
- No purple, no blue, no gradients

### 4.5 Layout

**App (`index.html`):**
- Content max-width: `980px`, centered with `padding: 0 32px` — matches Design Hub
- Nav: logo left, theme toggle right — same structure as Design Hub
- Compose area pinned near top, notes list scrolls below

**Project page (`project.html`):**
- Same max-width, grid, thumbnail card rules, and mockup overlay as Design Hub's project detail page
- Full rules: `/Users/jing.zhu/Documents/🎡 Side projects/Jing's design hub/project-docs/_project-page.md`

### 4.6 Nav / logo
```
✦  Quick Notes   (italic serif wordmark)         [Light] [Dark]
```
The ✦ mark in `--accent`, wordmark in DM Serif Display italic.

---

## V. Window & PWA Behaviour

- **No browser chrome:** `display: standalone` removes the URL bar and tabs
- **Offline-capable:** service worker ensures the app opens even with no internet
- **Theme color:** matches `--surface` (`#131312` dark / `#ffffff` light) so the title bar blends with the app background on macOS
