# Chat Exporter — ChatGPT · Claude · Gemini

A Manifest V3 Chrome extension that exports conversations from **ChatGPT**, **Claude** and **Gemini**.
Everything runs locally in your browser: no server, no account, no analytics.

It combines the feature sets of the two "ChatGPT Exporter" extensions it was modelled on, and extends them to Claude and Gemini.

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and pick this folder (the one containing `manifest.json`)
4. Open a chat on `chatgpt.com`, `claude.ai` or `gemini.google.com`

The page gets a **SELECT** and **EXPORT** button in the bottom-right corner. Reload any already-open chat tabs after installing.

## Using it

| Control | What it does |
| --- | --- |
| **SELECT** | Opens the *Select Messages* side panel. The ▾ menu applies a preset first: *All (default)*, *Questions*, *Answers*, *None*. |
| **EXPORT** | Exports straight away with the current preset using the last-used format. The ▾ menu picks a format or copies to the clipboard. |
| **Side panel** | Tick individual messages, **Shift+click** for a range, *All / Questions / Answers / None / Invert*, *Expand* long previews, pick a format, **Export**. |
| **Copy** icon | Copies the selection (Markdown / text / JSON / CSV, or rich text for pasting into Google Docs, Word or Notion). |
| **Box** icon | Bulk-export many chats into one ZIP (ChatGPT & Claude). |
| **Gear** icon | All settings (also available from the extension's options page). |
| Right-click page | *Export this chat → …* context menu. |
| Keyboard | `Alt+Shift+S` panel · `Alt+Shift+E` quick export · `Alt+Shift+P` PDF (rebind at `chrome://extensions/shortcuts`). |

## Formats

| Format | Notes |
| --- | --- |
| **Markdown** | Optional YAML front matter, footnote-style source list, thought process as block quote or `<details>`. |
| **PDF** | Rendered by the extension's own preview page, then *Save as PDF* in the print dialog. Page size, orientation, margins, light/dark theme, font family & size, page numbers, table of contents, page break per prompt, wrapping of code, KaTeX math. |
| **HTML** | One self-contained file (images embedded, math rendered with KaTeX from a CDN when opened online). |
| **Word (.docx)** | Headings, lists, tables, code, links, images, quotes, page numbers. Math is kept as `$LaTeX$` text. |
| **Text / JSON / CSV** | CSV is UTF-8 with BOM for Excel; JSON includes ids, roles, timestamps, thoughts and sources. |
| **PNG** | Whole conversation as an image. Long chats are split at message boundaries into several images in one ZIP (and drop to 1× scale above ~30,000 px) so export stays fast. |

## Content handled

* Code blocks (with language), tables, lists, block quotes, links, images
* Math (LaTeX / KaTeX)
* ChatGPT: reasoning ("thought process"), web-search citations → numbered sources, Canvas documents, Deep Research reports, attachments, group-chat author names
* Claude: extended thinking, artifacts (create / update / rewrite), web-search sources, attachments, the *currently selected* branch of edited messages
* Gemini: thought process (auto-expanded), uploaded & generated images, full history (auto-scrolls to load older turns)

## Settings

Language (EN, ES, FR, DE, PT, HI, ZH, JA for the main UI), panel theme, remembered selection preset, close panel after export, confirmations,
include thoughts / sources / canvas / images / tool output / per-message timestamps / role icons,
your name & email in the header, labels for you / the AI, date source (created / modified / export time) & format,
file-name template (`{title} {date} {time} {platform} {model} {id}`), prefix, download sub-folder, "Exported with" footer,
Markdown front matter, JSON pretty-print, CSV delimiter, and all PDF options above.

## How conversations are read

| Site | Primary source | Fallback |
| --- | --- | --- |
| ChatGPT | The site's own `/backend-api/conversation/{id}` call (your logged-in session) – exact Markdown, timestamps, citations | DOM scrape |
| Claude | The site's own `/api/organizations/{org}/chat_conversations/{id}` call | DOM scrape |
| Gemini | DOM (no stable JSON API) | – |

No data leaves the browser. Requests only go to the site you are already on (and its image CDNs, to embed pictures).

## Layout

```
manifest.json            MV3 manifest
background.js            context menu, shortcuts, downloads, cross-origin image fetch, print launcher
src/core/                namespace+defaults, i18n, utils, settings, html→md, markdown engine, zip, assets
src/adapters/            chatgpt.js · claude.js · gemini.js
src/exporters/           markdown · text · json · csv · html · docx · pdf/png (render job) · index (pipeline)
src/ui/                  dock + side panel, settings form, bulk export dialog, styles
print/                   PDF / PNG render page (KaTeX bundled in vendor/katex)
popup/  options/         toolbar popup and options page
scripts/package.py       builds the Chrome Web Store zip into dist/
```

## Packaging for the Chrome Web Store

```
python scripts/package.py
```

Creates `dist/chat-exporter-<version>.zip` (runtime files only, forward-slash paths, `manifest.json` at the root) and verifies that every
file the manifest and pages reference is inside the archive. Bump `version` in `manifest.json` before each release.

## Known limits

* The DOM selectors / private-API shapes of ChatGPT, Claude and Gemini change often. If a site update breaks reading, the exporter shows an error and falls back to DOM scraping; `src/adapters/*.js` is where to adjust.
* PDF is produced through Chrome's print dialog (choose *Save as PDF*), which keeps everything offline. Silent one-click PDF would need the `debugger` permission, so it is intentionally not used.
* Gemini bulk export and ChatGPT/Claude e-mail/Notion/Google-Docs *direct* uploads are not included (they need private APIs or OAuth). Use **Copy → rich text** or the `.docx`/Markdown files instead.
* Math inside `.docx` is stored as LaTeX text, not native Word equations.

## License

[MIT](LICENSE). Bundled KaTeX (`vendor/katex`) is MIT-licensed by its authors; see `vendor/katex/LICENSE`.
