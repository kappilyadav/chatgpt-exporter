# ChatGPT Exporter

A Manifest V3 Chrome extension that exports **ChatGPT** conversations.
Exports are built locally in your browser. An optional account (from chatgptexporterfree.com) unlocks unlimited exports; the free plan has a monthly quota.

Get the extension: https://chromewebstore.google.com/detail/obkhbkkjfndlphjfmhddogjbdkobhddm
Website: https://chatgptexporterfree.com

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and pick this folder (the one containing `manifest.json`)
4. Open a chat on `chatgpt.com`

The page gets a **SELECT** and **EXPORT** button in the bottom-right corner. Reload any already-open chat tabs after installing.

## Using it

| Control | What it does |
| --- | --- |
| **SELECT** | Opens the *Select Messages* side panel. The ▾ menu applies a preset first: *All (default)*, *Questions*, *Answers*, *None*. |
| **EXPORT** | Exports straight away with the current preset using the last-used format. The ▾ menu picks a format or copies to the clipboard. |
| **Side panel** | Tick individual messages, **Shift+click** for a range, *All / Questions / Answers / None / Invert*, *Expand* long previews, pick a format, **Export**. |
| **Copy** icon | Copies the selection (Markdown / text / JSON / CSV, or rich text for pasting into Google Docs, Word or Notion). |
| **Box** icon | Bulk-export many chats into one ZIP. |
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

Conversation data stays in the browser. Requests go to chatgpt.com (and its image CDNs, to embed pictures); the account check only asks chatgptexporterfree.com whether your plan is active.

## Layout

```
manifest.json            MV3 manifest
background.js            context menu, shortcuts, downloads, cross-origin image fetch, print launcher
src/core/                namespace+defaults, i18n (+ generated locales.js), utils, settings, html→md, markdown engine, zip, assets
src/adapters/            chatgpt.js
src/exporters/           markdown · text · json · csv · html · docx · pdf/png (render job) · index (pipeline)
src/ui/                  dock + side panel, settings form, bulk export dialog, styles
print/                   PDF / PNG render page (KaTeX bundled in vendor/katex)
popup/  options/         toolbar popup and options page
scripts/package.py       builds the Chrome Web Store zip into dist/
scripts/i18n/*.json      translation sources, one flat file per language (en.json is the master list of keys)
scripts/build_locales.py turns them into _locales/ (for Chrome and the Web Store) and src/core/locales.js (for the UI)
scripts/test-i18n.js     checks every language, in the real extension inside Chrome
_locales/                generated; the manifest name/summary come from here
```

## Translations

The interface, the right-click menu, exported-file headings and the store name/summary are translated into 35 languages
(the 34 offered by the Web Store plus Hindi). To change a string or add a language:

1. Edit `scripts/i18n/en.json` (new keys) and the matching `scripts/i18n/<code>.json` files. Use Chrome's locale codes (`pt_BR`, `zh_TW`, ...).
2. Run `python3 scripts/build_locales.py`. It fails on a missing key, a broken `{placeholder}`, a name over 75 characters or a summary over 132.
3. Run `node scripts/test-i18n.js` (needs `npm i puppeteer-core` and Google Chrome; `--static` skips the browser part).

Code reads text with `CE.t('key', {vars})`; static HTML uses `data-i18n="key"`. Arabic and Hebrew switch the UI to right-to-left automatically.
`python scripts/package.py` rebuilds the translations first. `STORE_LISTING_TRANSLATIONS.md` has the translated store listings to paste into the dashboard.

## Packaging for the Chrome Web Store

```
python scripts/package.py
```

Creates `dist/chat-exporter-<version>.zip` (runtime files only, forward-slash paths, `manifest.json` at the root) and verifies that every
file the manifest and pages reference is inside the archive. Bump `version` in `manifest.json` before each release.

## Known limits

* The DOM selectors / private-API shapes of ChatGPT change often. If a site update breaks reading, the exporter shows an error and falls back to DOM scraping; `src/adapters/*.js` is where to adjust.
* PDF is produced through Chrome's print dialog (choose *Save as PDF*), which keeps everything offline. Silent one-click PDF would need the `debugger` permission, so it is intentionally not used.
* ChatGPT e-mail/Notion/Google-Docs *direct* uploads are not included (they need private APIs or OAuth). Use **Copy → rich text** or the `.docx`/Markdown files instead.
* Math inside `.docx` is stored as LaTeX text, not native Word equations.

## License

[MIT](LICENSE). Bundled KaTeX (`vendor/katex`) is MIT-licensed by its authors; see `vendor/katex/LICENSE`.
