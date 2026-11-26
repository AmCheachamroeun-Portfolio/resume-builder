# Audit and redesign plan

Audit of the repository at commit `1a1d6cf`. Findings come from reading the code and from running
the production build at 375, 390, 768, 1024, 1280, 1440 and 1920 pixels wide.

## Baseline

- Lint, type check, 58 unit tests and the production build passed.
- 40 of 40 browser tests passed (using an installed Chrome).
- No horizontal overflow and no console errors on any page.

## Keep

- Local-first storage in IndexedDB, with validation and schema migrations.
- One HTML renderer for thumbnails, preview and PDF, with its own pagination.
- AI consent, minimal data sent, server-side fact checks, rate limits.
- All 12 templates, undo and redo, JSON backups, English and Khmer.
- The thumbnail fix that stops links being nested inside links.

## Problems found

| Area          | Finding                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Editor        | At 1024px the preview shrinks to about 37%.                                                                          |
| Editor        | The assistant slides over the document, hiding what it is changing.                                                  |
| Editor        | Ctrl/Cmd+Z in the assistant's text boxes undoes the resume instead of the typing.                                    |
| Editor        | The section list has no completion state and shows two buttons on every row.                                         |
| Editor        | On phones there is no way to change theme or language from the editor.                                               |
| Saving        | Two tabs editing one resume overwrite each other without warning. A deleted resume can be saved back by an open tab. |
| Saving        | A failed save waits for a manual retry and offers no way to rescue the text.                                         |
| Preview       | Every keystroke measures the pages twice, because fonts are re-checked on each change.                               |
| AI            | Cancelling in the browser does not stop the Gemini request on the server. There is no cancel button.                 |
| AI            | A wrong key, a missing model and a bad request all show the same "not configured" message.                           |
| ATS check     | Khmer job descriptions are ignored. Multi-word skills and common aliases are not matched.                            |
| ATS check     | The large score suggests a precision the rules do not have.                                                          |
| Visual        | Warm cream and green palette, serif headings and default select and slider styling feel inconsistent.                |
| Landing       | Long, with small previews and several similar sections.                                                              |
| Gallery       | Twelve solid buttons compete with the documents; no filters or comparison.                                           |
| Accessibility | Two controls have names that do not contain their visible text.                                                      |
| Missing       | PDF and Word import, Word export, cover letters, version history, tailored copies.                                   |

## Plan

1. **Design and redesign** - semantic tokens, new mark, landing, gallery, editor, phone views.
2. **Reliability** - saving, AI errors and cancellation, export dialog, performance, accessibility.
3. **New features** - import, tailoring, cover letters, Word export, version history, library, ATS.
4. **Release** - tests, screenshots, documentation, deployment notes.

## Constraints

- No new backend, database, account system or cloud storage.
- Stored data keeps its names (`resumecraft` database and backup format), so existing drafts open.
- The Gemini API is not reachable from the audit environment. Model availability was checked in
  Google's documentation only; live behaviour needs `pnpm verify:ai` with a real key.
