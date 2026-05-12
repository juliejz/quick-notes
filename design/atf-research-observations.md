# ATF Research Observations — From Writing Playwright Tests
_Last updated: 2026-05-05_

> This document has nothing to do with Quick Notes development.
> It exists because Jing is using Quick Notes as a hands-on exercise to experience the write → run → troubleshoot testing loop firsthand — building first-person intuition for ATF's competitive research (Vision project). Observations here are about the testing process itself, not the app.

---

## The test scenario that generated these observations

**Test case 1.1** — Submit plain text in the compose box, verify it becomes a plain note in the Notes tab.

The test was written in two rounds. Round 1 (from the test plan description alone) produced one assertion:
- **INTENT 3:** The submitted text appears in the notes list

Round 2 (after reading the app's page structure) added two more:
- **INTENT 1:** The Notes tab is now the active tab — because tab state could fail to switch even if the note was saved
- **INTENT 2:** No todo item was created — because the notes list and todo list are completely independent containers, so routing logic could malfunction and write to both simultaneously

INTENT 3 came from the test plan. INTENT 1 and 2 only became visible after understanding how the app's structure represents those business concepts.

---

## 1. Knowing the intent ≠ writing a test that covers it — and AI makes this worse

Writing INTENT 3 was straightforward. Once the test passed, there was no obvious signal to keep going — it was green, the selector looked reasonable, the text showed up. Done.

Getting to INTENT 1 and 2 required two things at the same time: knowing which behaviors were worth protecting, and knowing how the app's page structure represented those behaviors. The first version skipped both.

This gap doesn't go away with AI assistance — it gets harder to see. When an AI generates a test, the human's job shifts from "write the test" to "judge whether the generated test is good enough." That judgment requires understanding both the product and the app's structure — arguably harder than writing the test in the first place. And because the generated test passes and looks correct, the gap is invisible unless the human already knows what to look for.

This is also why coverage rate doesn't solve the problem. A test with only INTENT 3 will still show the underlying function as 100% covered. Coverage measures whether code was executed, not whether the right behaviors were verified.

---

## 2. The AI intent gap is not an information problem — it's a judgment problem

A first assumption was that AI generators miss important assertions because they can't access the test plan or product context. That assumption is wrong: when an AI runs as part of a Playwright agentic loop, it can read the codebase, the page structure, and any documentation in the repo — the same information a human engineer would have.

The real gap is different: **having the context is not the same as knowing which parts of it describe behaviors worth protecting.**

The page structure showed that `.tab-btn.active` controls which tab is active. The test plan said "switches to Notes tab." An AI can read both. But neither source says "tab switching is a regression risk worth explicitly verifying" — that judgment requires knowing which failures are costly.

**What "worth protecting" actually means**

A first instinct might be that silent failures (where the user doesn't notice) are more worth protecting than visible ones. But this framing is incomplete. The more accurate definition: **a behavior is worth protecting if the cost of it failing is high** — regardless of whether the user notices immediately.

Cost can be high in two ways:
- **Visible failure** — the user notices immediately and reports it. High urgency, easy to catch.
- **Silent failure** — the error accumulates in the background. The user thinks everything worked, but data is in the wrong state. By the time it's discovered, the damage may be widespread.

Both are worth protecting. The key variable is not visibility — it's consequence.

Applied to our app:
- **Routing logic (intent 2):** If `[ ] task` input accidentally creates both a todo and a plain note, the page looks fine — there's content. But the data structure is wrong, and a user managing their todos is working with corrupted state. High cost, silent failure.
- **Tab switching (intent 1):** If the tab doesn't switch after submit, the user assumes the content wasn't saved and may submit again. High cost, visible failure.

Both are high-value. But neither is obvious from reading the page structure or the test plan alone — they require knowing which failures have consequences worth explicitly guarding against. An AI with full context can still default to the most obvious assertion and miss these, not because it lacked access, but because it had no basis to weight one behavior over another.

**A useful analogy:** The page structure is a map. Business intent is knowing which roads are dangerous. An AI has the map — but without knowing which failures are costly, it can only guess which roads to check.

---

## 3. Record new generates actions, not assertions — and always passes

Playwright's "Record new" feature records browser interactions and converts them into code. After trying it on test 1.2 (todo routing), the generated output was:

```js
await page.getByRole('textbox', { name: 'New entry' }).click();
await page.getByRole('textbox', { name: 'New entry' }).fill('[ ] to do\n');
```

No assertions. The test replays the actions but never checks whether the outcome was correct. As a result, it always passes — even if the app is completely broken.

The subtler problem: **a test with no assertions is indistinguishable from a passing test in the UI.** VS Code showed a green checkmark. Without knowing to look for assertions, a non-technical user would reasonably conclude the feature was verified.

This is the baseline problem that tools like mabl are solving. mabl doesn't just record actions — it generates assertions alongside them, and its self-healing keeps those assertions from breaking when the UI changes. The gap between "recorded a test" and "wrote a useful test" is exactly where the value of an AI testing platform lives.

---

## 4. Playwright's AI agents require an AI to function — and their value depends on which AI

Playwright's three AI agents (Planner, Generator, Healer) are not standalone tools. They are agentic loops — scaffolding that gives an AI access to Playwright-specific actions (run tests, read the page structure, repair selectors). Without an AI, none of them work.

Their value is relative to the baseline capabilities of the AI they're paired with — specifically, whether the AI already has shell access (the ability to run terminal commands directly):

| Agent | Value to AI without shell (e.g. Copilot, ChatGPT) | Value to AI with shell (e.g. Claude Code) |
|---|---|---|
| Generator | High — upgrades from "write only" to "write + run + fix" | None — already has this loop |
| Planner | Medium — provides structured test planning it couldn't do before | None — same reasoning happens in conversation |
| Healer | High — enables selector repair it couldn't trigger | Small — can repair manually when prompted, but not automatically |

Healer is the exception: it reduces the maintenance cost of a test suite when selectors break after UI changes. But it only activates within a test run that was already triggered — it does not continuously monitor or schedule test runs on its own.

This means none of the Playwright agents solve the **continuous running** problem. Tests still only run when someone triggers them. Solving this requires CI/CD (e.g. GitHub Actions) or a hosted platform like mabl that manages scheduling and execution as part of the service.

---

## 5. Playwright's free feature set is technically complete — the gaps are structural, not functional

After working through the full Playwright toolchain (writing tests, running, video recording, HTML reports, selector tools, AI agents), the conclusion is that its free feature set already covers most technical testing needs. There is no obvious missing capability at the feature level.

The real gaps are structural:

- **Continuous execution** — Playwright is not a service. Tests only run when triggered. Solving this requires setting up CI/CD separately, which adds engineering overhead.
- **Non-technical users** — Writing tests and interpreting reports requires an engineering background. There is no abstraction layer for QA or product people who aren't comfortable with code and terminal.
- **Business intent coverage** — Playwright has no way to know what behaviors are worth protecting. It can run whatever tests exist, but cannot judge whether those tests cover what actually matters. (See observations 1–2.)

Paid platforms like mabl are not selling features that Playwright lacks — they are selling the removal of friction around these three structural gaps. The value proposition is operational (who can use it, when does it run, does it stay maintained) rather than technical (what can it do).

This also reframes how to evaluate competitors: the question is not what features they have, but which of these three gaps they actually close — and how durably. As general-purpose AI tools gain more direct environment access, the tooling gaps narrow. The gaps around business intent and continuous execution are structurally harder to close.
