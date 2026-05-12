# Quick Notes — Context & Rules
_Last updated: 2026-05-12_

---

## I. Overview

### 1.1 What this is
A personal PWA — a focused, single-purpose scratchpad installed on the MacBook Dock. No accounts required, no clutter. Data lives in `localStorage` (instant, offline-safe); optional Google sign-in adds background sync to Firebase Firestore so notes follow you across machines. See §3.8 for the sync model, §VI for the product evolution.

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
├── manifest.json           # PWA config
├── sw.js                   # Service worker (offline support)
├── icon.svg                # PWA icon (SVG, any size)
├── icon.png                # PWA icon (1024×1024 PNG, used in manifest)
├── favicon.png             # Browser tab favicon (cropped tightly from icon.png, 256×256)
├── pitfalls.md             # Tricky bugs that took multiple attempts — read before touching related code
├── package.json            # Playwright + npm scripts
├── playwright.config.js    # Playwright config (testDir → testing/specs)
├── testing/
│   ├── test-plan.md        # Human-readable QA plan
│   └── specs/              # Playwright .spec.js files (one per tab + compose, theme, customize)
├── design/                 # Design exploration — not part of the app
│   ├── project.html        # Browse UI options locally
│   ├── atf-research-observations.md
│   └── mockups/            # UI explorations, grouped by design variable
│       └── {variable-name}/    # One subfolder per tab (e.g. overall-layout, instance-tab)
│           ├── option-01.html
│           ├── option-02.html
│           └── option-03.html
├── .github/
│   └── workflows/
│       └── playwright.yml  # Manual-trigger CI: runs Playwright, uploads HTML report as artifact
└── CLAUDE.md               # This file
```

**gitignored:** `node_modules/`, `playwright-report/`, `test-results/` — all regenerated locally or in CI.

**Mockups → tabs mapping:**
Each subfolder under `design/mockups/` maps to one tab in `design/project.html`. The folder name becomes the tab label (kebab-case → Title Case, e.g. `overall-layout` → "Overall Layout"). Options within a folder are numbered sequentially. If only one subfolder exists, the tab bar is hidden and options are shown directly.

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
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
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

**localStorage** is the primary read/write layer (instant, offline-safe). Five keys:

```js
const NOTES_KEY = 'quick-notes';    // plain notes
const TODOS_KEY = 'quick-todos';    // todo checklist items
const INSP_KEY  = 'quick-insp';     // inspiration / prompts
const OON_KEY   = 'quick-oon';      // 1:1 notes
const DEMOS_KEY = 'demo-instances'; // credential cards
```

**Firestore** is the cloud sync layer (Firebase compat SDK v10). Every save triggers a debounced (800 ms) write to:
```
users/{uid}/data/all
```
A single document holds all five collections plus `updatedAt`. On sign-in, `loadFromFirestore(uid)` pulls this document and overwrites localStorage, then re-renders.

The green sync dot (opacity transition, never shifts layout) flashes during the Firestore write.

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

**Instance ghost hint** — when `#instance` is typed in the compose box, a ghost overlay shows the expected field order (Name, URL, Username, Password, `* notes`) as placeholder text to guide input.

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
- **`## Section name`** on any line creates a named section header; todos that follow are grouped under it

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

### 3.8 Cloud sync
**Built and live.** Firebase (Firestore + Google Auth) backs the app.

- Sign in with Google → auth handled by `firebase.auth().signInWithPopup()`
- On sign-in: `loadFromFirestore(uid)` pulls `users/{uid}/data/all`, overwrites localStorage, re-renders
- Every save: debounced 800 ms write to the same document (all five collections + `updatedAt`)
- localStorage is always written first → instant UI, Firestore write is non-blocking
- Signed-out state: app works fully offline with localStorage only; no sync dot shown
- Firestore project: `quick-notes-9606c`

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
- **Cache busting:** only bump `CACHE` version in `sw.js` when static assets (`manifest.json`, `icon.svg`, `favicon.png`) change — never for `index.html` changes, since it uses network-first. In dev, use DevTools → Application → Service Workers → Unregister then hard reload

---

## VI. Product evolution (non-technical log)

A plain-language summary of how Quick Notes evolved as a product — what got built, what got cut, and the thinking behind each decision. For PMs, designers, or anyone curious about the *why* without diving into code. (For the technical journey with bugs and fixes, see Section VII.)

---

### v0.1 — The MVP: "a Dock-installable scratchpad"
**The problem I had:** during work, small thoughts and todos kept appearing — in meetings, between tasks, in 1:1s. Notion was too heavy, Stickies too dumb, Apple Notes too cluttered with personal stuff. I wanted something **on the Dock, one click away, with zero ceremony.**

**What v0.1 did:** four tabs (Notes, Inspiration, 1:1 Notes, Instances) tuned for the four actual things I capture during a workday. One input box, type something, hit enter, done.

**Key product decision:** **No accounts, no settings, no onboarding.** Open it and start typing. Personal tools die the moment they ask you to set them up.

---

### v0.2 — Cloud sync (so I don't lose stuff)
**Why:** I switch between two MacBooks. Losing a note because I typed it on the wrong machine was infuriating.

**What changed:** added Google sign-in. Once signed in, everything syncs in the background to my own private cloud space. Signed out, the app still works perfectly — sync is a bonus, not a requirement.

**Key product decision:** **The app must always work offline and signed-out.** Sync is the icing, never the cake. This kept the "zero ceremony" feel intact — new users (or future-me on a fresh machine) get a working app immediately, sign-in is optional.

---

### v0.3 — Smarter compose: hyperlinks without markdown
**The problem:** I kept pasting links into notes, and the raw `https://abc.def.ghi/...` URLs made the notes look ugly. But typing markdown `[label](url)` by hand is annoying.

**What changed:** two natural ways to add a link to selected text:
1. Right-click → "Add link" → paste URL
2. Select text → paste a URL on top of it

The link shows up as a clean green chip in the input. The URL is hidden until you save.

**Key product decision:** **Designers shouldn't have to know markdown.** The feature works the way pasting a link works in Notion or Linear — selection-based, no syntax to remember.

---

### v0.4 — Polish pass (and learning to live with hard problems)
**What changed:** nav avatar alignment, loading transitions, sync indicator, small visual fixes.

**Key product decision:** **Started a `pitfalls.md` file.** Some bugs took me 3–4 attempts to fix because I forgot what I tried last time. Writing them down (with the wrong attempts) saved hours later. Lesson worth carrying to any product work: capture the *journey*, not just the *answer*.

---

### v0.5 — Customizable tabs
**Why:** I realized different people might use the four tabs differently — what I called "Inspiration", a colleague might call "Ideas". The routing tags (`#insp`, `#instance`) felt arbitrary.

**What changed:** a "Customize" modal lets users rename tabs, reorder them, hide ones they don't use, and change which tag routes to which tab.

**Key product decision (the interesting one):** **Some routing is NOT user-configurable.** `[ ]` always means a todo. `@name` always means a 1:1 note. Why? Because those aren't *labels*, they're *behaviour* — letting users rewrite them would break the parser's mental model. Lesson: configurability is good for surface (names, order), bad for grammar (the rules that make the tool legible).

---

### v0.6 — The feature I built and removed
**What got built:** rich link previews. Paste a URL → app fetches the page's preview image + title → renders a card like Slack does.

**Why it got removed within a week:**
1. **It broke the product's tone.** Quick Notes is a text scratchpad. Suddenly it looked like Pinterest.
2. **It made things slow.** Notes started depending on network calls.
3. **It worked unreliably.** Many sites block preview fetching.

**Key product decision:** **"Cool" is not "fits."** A feature can be well-built and still be wrong for the product. Cutting it took 5 minutes; I wish I'd had the judgment to skip it earlier. Lesson: every feature has a tax — speed, simplicity, visual consistency. Ask whether the value pays the tax.

---

### v0.7 — QA test plan + automated tests
**Why:** I wanted to study how testing automation works (relevant to my day job researching test workflows). Quick Notes was small enough to be a complete test bed.

**What changed:** wrote a human-readable test plan (`testing/test-plan.md`) covering every user flow, then turned it into 43 automated tests that run in a real browser and verify the app works end-to-end.

**Key product decision:** **The test plan came before the test code.** First I wrote what *a person* would check ("type `[ ]` and Enter creates a todo"). Then automation translated that into code. This ordering matters — start from user behaviour, not from implementation details.

**Bonus outcome:** writing tests uncovered a real bug — the "duplicate tag warning" had been silently broken for ~9 days. Tests aren't just safety nets, they're a kind of design review.

---

### v0.8 — The "should I show this to colleagues" moment
**The trigger:** my boss saw it and suggested sharing with more colleagues.

**What I considered:** integrating ServiceNow's enterprise login (Entra ID) and storing data in corporate OneDrive instead of personal Google. Technically doable.

**What I decided:** **don't.** Reasons:
1. Requires IT approval + a corporate security review — high cost
2. If colleagues use it, I become an unofficial maintainer of a tool I built for myself
3. The signal from "boss likes it" is "you have craft," not "ship this to the org"

**Key product decision:** **Distinguish between a product and a portfolio piece.** This is a portfolio piece. It demonstrates judgment. Pushing it to be a product would dilute both the tool (loses focus) and the signal (turns craft into pitch). Lesson: not every well-built thing wants to be scaled.

---

### What I deliberately did NOT build (and why)

| Feature | Why not |
|---|---|
| Edit saved notes | Friction is a feature — if a note matters, retype it. Forces clarity. |
| Search / filter | List is short by design. Search invites hoarding. |
| Full markdown rendering | Quick Notes ≠ a writing tool. Plain text + links is enough. |
| Drag-to-reorder | Adds complexity for a problem I don't have. |
| Rich link previews | Built, removed (v0.6). Wrong tone. |
| Enterprise SSO | Built mentally, rejected (v0.8). Wrong scope. |
| Auto-deploy on green tests | Solo app, no users at risk. Manual is fine. |

---

### Product principles that emerged

1. **Capture speed > feature richness.** Every decision optimizes for "open app → typed thought → saved" time.
2. **Local first, cloud second.** Sync is additive; nothing depends on it.
3. **Friction is sometimes the feature.** Saying no to edit/search/reorder keeps the list short and the tool fast.
4. **Build, judge, cut.** Some features can only be evaluated after building. The willingness to remove a working feature is more important than the willingness to add one.
5. **Don't scale what doesn't want to scale.** A personal tool that helps one person well is more valuable than a half-product that helps many people poorly.

---

## VII. Development journey (technical)

How this project went from MVP to current state — features shipped, things that broke, how they were fixed, and key decisions along the way. Cross-references `pitfalls.md` for the detailed bug post-mortems.

---

### Phase 1 — MVP: bare PWA (29 Apr 2026)
_Commit: `0d20c34` Initial commit_

**What shipped:** single-page app, localStorage only, four tabs (Notes, Inspiration, 1:1 Notes, Instances), basic compose box with tag routing.

**Key decisions:**
- **No backend, no framework.** Plain HTML + vanilla JS in one `index.html`. Reason: this is a solo tool, not a product — every dependency adds maintenance, every framework adds learning tax.
- **`display: standalone` PWA from day one** so it could be installed on the Dock like a native app — that was the whole point, not a "maybe later."
- **Design language inherited from Jing's Design Hub** (same tokens, DM Serif Display wordmark, lime accent). Cheaper than designing from scratch and keeps the personal-tools family visually coherent.

---

### Phase 2 — Cloud sync (29 Apr 2026)
_Commit: `49277ad` Add Firebase sync, update theme toggle, auth dropdown_

**What shipped:** Firebase Firestore + Google Auth. localStorage stays primary (instant UI), Firestore is debounced background sync. Sync dot in the nav flashes during writes.

**Key decisions:**
- **Originally planned GitHub Gist sync, switched to Firebase.** Gist requires a personal access token in the client — bad security, awkward UX. Firebase auth handles it cleanly.
- **Single document `users/{uid}/data/all`** holds all five collections + `updatedAt`. Reason: simpler than per-collection writes, and the data volume for a personal app fits well under Firestore's 1MB doc limit.
- **localStorage-first, Firestore-async.** Means the app stays fully functional offline and signed-out — auth/sync is an addition, never a dependency.

---

### Phase 3 — Compose box polish: inline hyperlinks (30 Apr 2026)
_Commit: `f88cdb1` Add inline URL linking, fix Ideas tab layout, nav polish_

**What shipped:** two ways to embed a hyperlink — right-click "Add link", or paste-URL-over-selection. The label renders as an accent chip; URL is hidden until submit, then expands to `[label](url)` markdown.

**What broke (the hard part):**

**Bug — invisible characters pushed cursor off-screen** (`pitfalls.md` #2)
First attempt: store `[label](https://very-long-url)` in the textarea, render only the label in the backdrop layer. Failed — the textarea uses `color: transparent` with a backdrop overlay, so URL characters were invisible but still **occupied layout space**, pushing the cursor far right or wrapping to a new line.

Tried 3 fixes that didn't work:
1. Render full markdown in backdrop with muted styling — URL still takes pixel space
2. Compact encoding `[label](\x01ID\x01)` — still ~10 invisible chars
3. Make URL portion `color: transparent` — invisible ≠ zero width

**Final fix:** stop changing textarea content entirely. Store link regions in a side array `_pendingLinks = [{start, end, label, url}]`; textarea value stays as just the label. `expandLinks()` reconstructs the markdown only at submit time. **Key lesson:** when a layout layer and an interaction layer have different coordinate systems, don't try to align them — keep them separate.

**Bug — "Add link" popup's Add button did nothing** (`pitfalls.md` #3)
A `document.mousedown` dismiss listener was firing before the Add button's `click` event, removing the popup from the DOM mid-interaction. Fix: switch the Add button to `mousedown` with `stopPropagation` so it runs **before** the dismiss listener. Snapshot `selectionStart`/`selectionEnd` at the same moment, before focus changes invalidate them.

---

### Phase 4 — Nav avatar alignment hell (30 Apr 2026)
_Commits: `88c2211`, `1ef4e30`, `44b5138` — three commits for one pixel-level bug_

**What broke** (`pitfalls.md` #1): avatar `<img>` wouldn't vertically centre with the theme toggle. Looked fine on localhost (fallback `auth-initial` div was rendering, not the real image), broke on GitHub Pages (real `<img>` rendered).

Tried 3 fixes that didn't work:
1. `display:flex; align-items:center` on `.auth-menu-wrap` — helped, not enough
2. Same on `#auth-slot` — same result
3. `display:block` on `.auth-avatar` — fixed `vertical-align` but wrapper still wrong height

**Root cause:** four nested flex wrappers around the avatar, and `align-items:center` centres the *div*, not the image inside the div. The innermost `div[onclick]` wrapper had default `line-height: ~20px`, making it taller than the 28px avatar — so the image sat top-biased within its own wrapper.

**Final fix:** `display:flex; align-items:center; line-height:0` on the innermost wrapper. **Key lesson:** when something looks off in nested flex, check the *innermost* container's line-height before adjusting outer parents — phantom line-height is the silent killer.

---

### Phase 5 — Service worker rewrite: stop fighting the cache (30 Apr 2026)
_Commits: `29dceef` Bump cache to v5, `3a36f8c` Network-first SW for index.html_

**The problem:** every time `index.html` changed and got deployed to GitHub Pages, the installed PWA kept serving the cached old version. Workaround was bumping `CACHE = 'quick-notes-v5'` in `sw.js` on every deploy — error-prone, easy to forget.

**Decision:** split caching strategy by file type.
- **`index.html` → network-first.** Always fetch latest, update cache as side-effect, fall back to cache only when offline. Deploys are picked up immediately, no cache bump needed.
- **Static assets (`manifest.json`, `icon.svg`, `favicon.png`) → cache-first.** They rarely change; only bump `CACHE` version when they do.

**Key lesson:** "one cache strategy for everything" is the wrong default for PWAs. The shell (HTML) and the assets have totally different change frequencies — they should be cached differently.

---

### Phase 6 — Customize modal: configurable tabs (30 Apr 2026)
_Commit: `e2dde30` Dynamic empty state text from tabsConfig + customize link_

**What shipped:** modal where you can rename tabs, reorder, change routing tags, hide/show — driven by `quick-tabs-config` in localStorage. Empty state text reads tab labels + routing tags dynamically.

**Key decision:** **only routing tags for Inspiration / Instances are user-configurable.** `[ ]`/`#todo` → Notes and `@name` → 1:1 are hardcoded because they're behavioural (parsing rules), not labels. Letting users change those would invite contradictions in the parser.

---

### Phase 7 — Pull back from over-building: rich embeds removed (1 May 2026)
_Commit: `edceee7` Remove rich embed feature; add QA test plan_

**What happened:** built a rich link preview feature (fetch URL → render OG image + title card). Then removed it.

**Why removed:**
- CORS issues — many sites block OG metadata fetching from browser-side requests
- Made notes visually noisy — turned a text scratchpad into a Pinterest board
- Added a network dependency to a tool that's supposed to feel instant

**Key lesson:** "would be cool" ≠ "fits the product." This app's job is *fast capture*, not pretty display. Removing the feature was a better decision than the feature itself.

In the same commit: started `testing/test-plan.md` as a human-readable QA checklist.

---

### Phase 8 — Playwright test suite (8–9 May 2026)
_Commit: `1b37047` Add Playwright test suite and fix customize tag conflict bug_

**Why:** first-hand research into the write→test→troubleshoot loop for ATF work at ServiceNow. Quick Notes was the test bed.

**What shipped:** 43 tests across 7 spec files (compose 9, notes 7, inspiration 6, oon 3, instances 8, theme 3, customize 7). All passing.

**Pitfalls hit while writing tests** (all in `pitfalls.md` #4–11):

| # | Pitfall | Why it tripped me up |
|---|---|---|
| 4 | `toBeVisible()` returns true for `opacity:0` overlays | Several modals use opacity, not display, for closed state — need `.open` class check instead |
| 5 | `filter({hasText})` doesn't match `<input value="...">` | textContent ≠ input value — had to use `nth()` with known tab indices |
| 6 | Tag input updates draft only on blur inside 150ms setTimeout | Had to `press('Tab')` + `waitForTimeout(200)` before saving |
| 7 | **App bug** — conflict validation ran before draft update | Test caught a real ordering bug in the app; fixed in `index.html` |
| 8 | Wide-view and grid-view cards use different delete-button classes | Inconsistent class naming bit back during testing |
| 9 | `toContainText` strict-mode error on multi-match locators | Had to scope locators tighter (`[data-tab="insp"]`) |
| 10 | Clipboard API silently fails headless without permission | Needed `context.grantPermissions(['clipboard-read', 'clipboard-write'])` per test |
| 11 | Enter in `[ ]` line creates new item, doesn't submit | Compose has auto-list behaviour — use `Shift+Enter` + Add button click |

**Pitfall #7 is the headline:** writing the test exposed a real bug — `validateCustConflict()` was called before `_custDraft[idx].tags = parsed`, so the duplicate-tag warning **never appeared** in production. Fixed both the app and the test in the same commit.

**Key lesson:** the value of writing tests isn't just regression protection — the process of asserting "this should happen" forces you to articulate edge cases you handwaved while building. Half these pitfalls are testing-tool quirks; the most valuable one (#7) is a real product bug that had been live for ~9 days.

In the same commit, repo restructured: `design/` (mockups + project.html) separated from `testing/` and root app files.

---

### Phase 9 — CI + structural cleanup (12 May 2026)
_Commit: `b37828f` Tidy repo structure_

**What shipped:**
- Deleted unused root-level `tests/` and `specs/` scaffolds (Playwright init leftovers)
- Moved 7 spec files into `testing/specs/`, updated `playwright.config.js` `testDir`
- Changed GitHub Actions workflow from auto `on: push` to `on: workflow_dispatch` (manual trigger only)

**Key decisions:**
- **Manual CI trigger, not auto on push.** Reason: solo project, no users at risk, no reason to spend CI minutes on every typo commit. Manual gives the "save a test report" benefit without the noise.
- **Not full CI/CD on purpose.** Tests don't gate deployment. GitHub Pages auto-deploys on push regardless of test status. For a personal tool, that's the right tradeoff.
- **Considered enterprise SSO + OneDrive sync to share with colleagues at ServiceNow.** Ruled out — Entra ID app registration requires IT approval, and the value (let colleagues use my personal scratchpad) didn't justify the bureaucracy. Decision recorded so future-me doesn't re-evaluate.

---

### Cross-cutting principles that emerged

Looking back at the journey, a few principles repeated:

1. **localStorage first, network second.** Every feature degrades gracefully offline. Firebase sync is additive, never required.
2. **Friction is sometimes a feature.** No editing of notes (except demo creds), no search, no markdown rendering. Each "missing" feature was considered and rejected — the app stays fast because it stays small.
3. **Record the why, not just the fix.** `pitfalls.md` exists so the same bug doesn't waste another evening. Same reason this section exists.
4. **Remove features that don't fit.** Rich embeds, GitHub Gist sync, enterprise SSO — all considered, all cut. The product survives by what it refuses to do.

### What's intentionally NOT here
- Editing of saved notes/todos/ideas (only Demo Instances editable) — friction is a feature
- Search / filter — list is short by design
- Markdown rendering beyond auto-linkified URLs
- Drag-to-reorder
- Rich link previews / OG card embeds — built, removed (Phase 7)
- Enterprise SSO (Entra ID + OneDrive sync) — explored, ruled out (Phase 9)
- Auto-trigger CI / test-gated deploys — manual is enough for a solo tool (Phase 9)
