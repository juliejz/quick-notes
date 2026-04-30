# Error Log — Quick Notes
_Bugs that took multiple attempts to fix. Read before touching related code._

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

## 3. "Add link" popup — clicking Add button had no effect

**Symptom:** Right-click → Add link → URL popup appeared → clicking "Add" did nothing; popup stayed open or closed with no change.

**Root cause:** A `mousedown` dismiss listener was attached to `document` (to close the popup on outside clicks). This listener fired on the same `mousedown` event as the "Add" button click — before the `click` event — and called `_removeCtx()` which removed the popup from DOM. The subsequent `click` event either never fired (element removed mid-sequence) or found stale references.

**Fix:**
1. Change the "Add" button listener from `click` to `mousedown` with `ev.stopPropagation()` + `ev.preventDefault()` — runs before the document dismiss listener can fire, and prevents focus-stealing
2. Snapshot `el.selectionStart` / `el.selectionEnd` at the same `mousedown` moment (before any focus changes)
3. Use direct `el.value = ...` assignment instead of `el.setRangeText()` with explicit positions
