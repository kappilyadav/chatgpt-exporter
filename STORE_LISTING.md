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
**Name** (manifest `name`, 54 chars, max 75):
`ChatGPT Exporter: Save ChatGPT to PDF, Word & Markdown`

**Summary** (manifest `description`, 123 chars, max 132). Rewritten twice after the "excessive keywords" rejection (Yellow Argon, flagged the format list in the Summary): it now has no format list at all.
`Export any ChatGPT conversation to a clean, shareable file. Pick the messages you want, customize the layout, stay private.`

**Category:** Productivity. **Language:** English.
**Homepage URL:** https://chatgptexporterfree.com  **Support URL:** https://chatgptexporterfree.com/help
**Privacy policy URL:** https://chatgptexporterfree.com/privacy
**Single purpose:** Export the conversation currently open on chatgpt.com to a file or the clipboard.

**Description** (rewritten after the rejection; keep it natural, name the formats at most once, no keyword lists):

```
ChatGPT Exporter adds an Export button to chatgpt.com so you can save any conversation as a tidy, shareable file. Open a chat, click Export, pick a format, and your file downloads right away. Eight formats are supported, including PDF, Word and Markdown.

SAVE JUST WHAT YOU NEED
Tick individual messages, Shift+click to select a range, or use the presets for questions only, answers only, or everything. Need many chats at once? Export them together as a single ZIP.

CONTENT STAYS INTACT
Code blocks keep their language, tables stay tables, and math formulas, images and links come through as they appear in the chat. Web-search sources, Deep Research citations, Canvas documents and the model's reasoning can each be included or left out.

PDFS YOUR WAY
Choose page size and orientation, margins, light or dark theme, font and size, page numbers, a table of contents, and whether each prompt starts on a new page. Add your name and a date to the header if you like.

COPY INSTEAD OF DOWNLOAD
Send the conversation straight to your clipboard and paste it into Google Docs, Word or Notion.

MAKE IT YOURS
Name files with your own template, save into a sub-folder, set your own labels, and use the right-click menu or keyboard shortcuts (Alt+Shift+S to select, Alt+Shift+E to export, Alt+Shift+P for a PDF). The interface is available in English, Spanish, French, German, Portuguese, Hindi, Chinese and Japanese.

PRIVATE BY DESIGN
Conversations are converted inside your browser and are not sent to our servers. There are no ads, no analytics and no remote code.

FREE TO START
The free plan includes a monthly allowance of exports. An optional account on chatgptexporterfree.com unlocks unlimited exports.

HOW TO USE
1. Open a conversation on chatgpt.com.
2. Click EXPORT to choose a format, or SELECT to choose messages.
3. Your file downloads instantly.

Questions? Visit https://chatgptexporterfree.com/help or write to support@chatgptexporterfree.com.

ChatGPT Exporter is an independent tool, not affiliated with, endorsed by or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.
```

### Keyword rules to stay compliant (Spam and Placement policy)
- Do not repeat the list of formats; name them once at most.
- No "looking for X? how to Y?" keyword paragraphs.
- No tags, hashtags or search phrases in the description.
- Every claim must be true for this extension (ChatGPT only, desktop Chrome).

## Images to upload (store-assets/out/)
Screenshots (1280x800, real captures of the extension running on chatgpt.com, rendered from the real extension code: `node store-assets/harness/capture.js` (3x renders on a mock chat page, needs puppeteer-core) then `node store-assets/compose.js` (2x render downsampled to 1280x800)), in this order: hero-1-features, hero-2-formats, 1-export-menu, 2-select-messages, 5-export-result, 3-pdf-settings, 4-formats, 6-private. Promo tiles: promo-small-440x280, promo-marquee-1400x560 (`node store-assets/promo.js`).

## Long description (alternative, more detailed: paste instead of the main one)
Same compliance rules as above: formats are named once, no keyword lists, no search phrases. Both descriptions in this file are now the cleaned versions.

```
ChatGPT Exporter adds an Export button to chatgpt.com so you can save any conversation as a tidy, shareable file. Open a chat, click Export, pick a format, and your file downloads right away. Eight formats are supported, including PDF, Word and Markdown.

KEY FEATURES

Export what you need
• Tick individual messages or Shift+click to select a range
• Presets for questions only, answers only, everything, none, or invert
• Export many chats together as a single ZIP

Content stays intact
• Code blocks keep their language, and tables stay tables
• Math formulas, images and links come through as they appear in the chat
• Web-search sources and Deep Research citations become a numbered source list
• Canvas documents and the model's reasoning can each be included or hidden

PDFs your way
• Page size and orientation, margins, light or dark theme
• Font family and size, page numbers, table of contents
• Start every prompt on a new page, wrap long code lines
• Your name, dates and per-message timestamps in the header

Copy instead of download
• Send the conversation to your clipboard and paste it into Google Docs, Word or Notion

Make it yours
• Name files with your own template and save into a sub-folder
• Set your own labels for you and the AI
• Right-click menu and keyboard shortcuts: Alt+Shift+S to select, Alt+Shift+E to export, Alt+Shift+P for a PDF
• Interface in English, Spanish, French, German, Portuguese, Hindi, Chinese and Japanese

PRIVATE BY DESIGN
Conversations are converted inside your browser and are not sent to our servers. There are no ads, no analytics and no remote code. An optional account only checks your plan status.

FREE TO START
The free plan includes a monthly allowance of exports. An optional account on chatgptexporterfree.com unlocks unlimited exports.

WHO IT HELPS
• Professionals keeping brainstorms and client work as polished files
• Students archiving study sessions with sources, formulas and tables
• Developers keeping code with its language, or exporting data for analysis
• Writers sending drafts to their favorite documents app

HOW TO USE
1. Open a conversation on chatgpt.com.
2. Click EXPORT to choose a format, or SELECT to choose messages.
3. Your file downloads instantly.

Questions? Visit https://chatgptexporterfree.com/help or write to support@chatgptexporterfree.com.

ChatGPT Exporter is an independent tool, not affiliated with, endorsed by or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.
```

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
2. Upload `dist/chat-exporter-1.1.2.zip` (`python scripts/package.py` builds and verifies it).
3. After the listing exists, set CHROME_STORE_URL and EXTENSION_ID in the website's src/config.ts.
4. If the name is rejected for the trademark, fall back to "Exporter for ChatGPT: Save Chats to PDF, Word & Markdown".
