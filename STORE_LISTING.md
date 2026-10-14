# Chrome Web Store listing: copy-paste kit (not shipped in the zip)

Research basis: the top competitor listing (ChatGPT Exporter - ChatGPT to PDF, MD, and more; ~200K users, 4.9 stars from 2.7K ratings) and Ubersuggest US keyword data (Oct 2026). The copy below is original; only the keyword strategy follows the market leader.

## Keyword research (US monthly searches, SD = SEO difficulty)
| Keyword | Volume | SD | Use in |
| --- | --- | --- | --- |
| chatgpt exporter | 1,600 | 44 | Name |
| chatgpt to word or pdf chrome extension | 720 | 16 | Description opener |
| how to save chatgpt conversation | 480 | 41 | Description |
| chatgpt exporter chrome extension / browser extension | 390 each | 39 / 5 | Description |
| chatgpt to word or pdf extension | 390 | 25 | Description |
| save chatgpt conversation extension | 210 | 41 | Description |
| how to save chatgpt conversation as pdf | 170 | 21 | Description / FAQ |
| chatgpt to word extension | 110 | 25 | Description |
| chatgpt to markdown (extension) | 90 | 27 | Description |
| download chatgpt chat | 90 | 37 | Description |
| save chatgpt conversation as pdf | 70 | 25 | Description |
| chatgpt to word | 70 | 21 | Name |

Takeaways: "Word" is a bigger search than "Markdown" or "text", and the leader does NOT offer Word, so put Word in the name and first lines. Keep wording natural: the Store penalises keyword stuffing.

## Fields
**Name** (manifest `name`, 53 chars, max 75):
`ChatGPT Exporter: Save ChatGPT to PDF, Word & Markdown`

**Summary** (manifest `description`, max 132):
`Save ChatGPT chats as PDF, Word, Markdown, HTML, text, JSON, CSV or PNG. Pick messages, copy to Docs or Notion. Private.`

**Category:** Productivity (Workflow & Planning if offered). **Language:** English.
**Homepage URL:** https://chatgptexporterfree.com  **Support URL:** https://chatgptexporterfree.com/help
**Privacy policy URL:** https://chatgptexporterfree.com/privacy
**Single purpose:** Export the conversation currently open on chatgpt.com to a file or the clipboard.

**Description** (paste as is):

```
ChatGPT Exporter is a free Chrome extension that saves any ChatGPT conversation as a PDF, Word document (.docx), Markdown, HTML, text, JSON, CSV or PNG image. Open a chat, click Export, done. No copy-paste, no broken formatting.

Looking for a way to save a ChatGPT conversation, turn ChatGPT into Word or PDF, or download a chat as Markdown for Notion or Obsidian? This is the quick way.

★ WHAT YOU CAN DO
• Export ChatGPT to PDF, Word (.docx), Markdown, HTML, Text, JSON, CSV or PNG
• Choose exactly which messages to save: tick them, Shift+click a range, or pick All, Questions or Answers
• Copy to the clipboard as Markdown, plain text, JSON, CSV or rich text, ready for Google Docs, Word or Notion
• Bulk export: download many chats at once in a single ZIP
• Right-click menu and keyboard shortcuts: Alt+Shift+S select, Alt+Shift+E quick export, Alt+Shift+P PDF

★ KEEPS EVERYTHING INTACT
Code blocks with language, tables, lists, links, images, math formulas (LaTeX), web-search sources, Deep Research citations, Canvas documents and the model's reasoning ("thought process"). Include or hide each one in settings.

★ PDFs THAT LOOK GOOD
Page size and orientation, margins, light or dark theme, font and size, page numbers, table of contents, page break per prompt, your name and date in the header.

★ MAKE IT YOURS
File-name templates, download sub-folder, date formats, custom labels for you and the AI, optional timestamps. Available in English, Spanish, French, German, Portuguese, Hindi, Chinese and Japanese.

★ PRIVATE BY DESIGN
Conversations are converted inside your browser and are never sent to our servers. No ads, no analytics, no remote code.

★ FREE TO START
The free plan includes monthly exports. An optional account at chatgptexporterfree.com unlocks unlimited exports.

HOW TO USE
1. Open any conversation on chatgpt.com
2. Click SELECT to choose messages, or EXPORT to save the whole chat
3. Pick a format. Your file downloads instantly

FAQ
Can I export ChatGPT to PDF? Yes. Choose PDF, then Save as PDF in the preview that opens.
Can I save a ChatGPT conversation as a Word document? Yes. Choose Word (.docx).
Does it work with Canvas, code and tables? Yes, they are preserved.
Is my data safe? Everything runs locally in your browser.

ChatGPT Exporter is an independent tool, not affiliated with, endorsed by or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.
```

## Images to upload (store-assets/out/)
Screenshots (1280x800, real captures of the extension running on chatgpt.com, rendered from the real extension code: `node store-assets/harness/capture.js` (3x renders on a mock chat page, needs puppeteer-core) then `node store-assets/compose.js` (2x render downsampled to 1280x800)), in this order: hero-1-features, hero-2-formats, 1-export-menu, 2-select-messages, 5-export-result, 3-pdf-settings, 4-formats, 6-private. Promo tiles: promo-small-440x280, promo-marquee-1400x560 (`node store-assets/promo.js`).

## Permission justifications (Privacy practices tab)
- **Host access chatgpt.com, chat.openai.com:** Adds the Select/Export buttons to ChatGPT pages and reads the conversation the user chooses to export.
- **Host access *.oaiusercontent.com:** Fetches images from ChatGPT's own file servers so they can be embedded in exports.
- **storage:** Saves user settings, the monthly free-plan export counter, the connected-account token and plan status, and temporarily holds data for the PDF/PNG render page.
- **unlimitedStorage:** Very long conversations used for PDF/PNG rendering can exceed the default storage quota.
- **downloads:** Saves the exported file to the user's computer.
- **contextMenus:** Adds the right-click "Export this chat" menu.
- **clipboardWrite:** Powers the Copy feature.
- **externally_connectable (chatgptexporterfree.com):** Lets the extension's own website hand the extension a sign-in token when the user clicks "Connect extension".
- **Remote code:** None. All extension code is bundled (KaTeX in vendor/). Exported HTML files reference a KaTeX CDN script for the user's own file; that is output, not extension code.

## Data disclosure
Tick **Authentication information** and **Personally identifiable information** (email, only if the user creates an account). Do NOT tick web history, user activity or website content. Certify all three statements: not sold, not used for unrelated purposes, not used for creditworthiness.

## Before you submit
1. Deploy the website first: /privacy, /help, the connect flow and /api/extension/status must be live, and Polar switched to live mode (set live product IDs in wrangler.jsonc, POLAR_SERVER=production, live token and webhook, Worker secrets).
2. Upload `dist/chat-exporter-1.1.0.zip` (`python scripts/package.py` builds and verifies it).
3. After the listing exists, set CHROME_STORE_URL and EXTENSION_ID in the website's src/config.ts.
4. If the name is rejected for the trademark, fall back to "Exporter for ChatGPT: Save Chats to PDF, Word & Markdown".
