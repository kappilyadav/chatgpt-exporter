# Chrome Web Store submission notes (not shipped in the zip)

## Listing
- **Name:** ChatGPT Exporter  (see "Trademark risk" below)
- **Summary (<=132 chars):** Export ChatGPT chats to PDF, Markdown, Word, HTML, Text, JSON, CSV or PNG. Select messages, copy to Docs or Notion.
- **Category:** Productivity
- **Language:** English
- **Single purpose:** Export the conversation currently open on chatgpt.com to a file or the clipboard.
- **Privacy policy URL:** https://chatgptexporterfree.com/privacy
- **Homepage / support URL:** https://chatgptexporterfree.com  /  https://chatgptexporterfree.com/help

## Detailed description (paste into the "Description" field)
Export any ChatGPT conversation in one click. Save chats as PDF, Markdown, Word (.docx), HTML, plain text, JSON, CSV or a PNG image, or copy them straight into Google Docs, Word or Notion.

HOW IT WORKS
Open a chat on chatgpt.com and use the SELECT and EXPORT buttons that appear in the corner. Pick a format and you are done. Everything is built inside your browser.

FEATURES
- 8 formats: PDF, Markdown, Word (.docx), HTML, Text, JSON, CSV and PNG
- Select exactly which messages to export: tick them, Shift+click a range, or choose All / Questions / Answers
- Copy as Markdown, text, JSON, CSV or rich text for Docs, Word and Notion
- Bulk export many chats into a single ZIP
- Keeps code blocks, tables, math (LaTeX), images, web sources, reasoning and Canvas documents
- Customisable PDFs: page size, margins, light or dark theme, fonts, page numbers, table of contents
- File-name templates, download sub-folder, date formats, your own name and labels
- Right-click menu and keyboard shortcuts (Alt+Shift+S select, Alt+Shift+E quick export, Alt+Shift+P PDF)
- Interface in English, Spanish, French, German, Portuguese, Hindi, Chinese and Japanese

PRIVACY
Your conversations are converted locally in your browser and are never sent to us. No ads, no analytics, no remote code.

FREE AND PRO
The free plan includes a monthly number of exports. An optional account at chatgptexporterfree.com unlocks unlimited exports.

ChatGPT Exporter is an independent tool and is not affiliated with, endorsed by or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.

## Permission justifications (paste into the "Privacy practices" tab)
- **Host access chatgpt.com, chat.openai.com:** Adds the Select/Export buttons to ChatGPT pages and reads the conversation the user chooses to export.
- **Host access *.oaiusercontent.com:** Fetches images from ChatGPT's own file servers so they can be embedded in exports.
- **storage:** Saves user settings, the monthly free-plan export counter, the connected-account token and plan status, and temporarily holds data for the PDF/PNG render page.
- **unlimitedStorage:** Very long conversations used for PDF/PNG rendering can exceed the default storage quota.
- **downloads:** Saves the exported file to the user's computer.
- **contextMenus:** Adds the right-click "Export this chat" menu.
- **clipboardWrite:** Powers the Copy feature (Markdown, text, JSON, CSV, rich text).
- **externally_connectable (chatgptexporterfree.com):** Lets the extension's own website hand the extension a sign-in token when the user clicks "Connect extension".
- **Remote code:** None. All extension code is bundled (KaTeX is bundled in vendor/). The exported HTML files reference a KaTeX CDN script for the user's own file; that is output, not extension code.

## Data disclosure (Privacy practices > "What user data do you collect?")
Tick: **Authentication information** (account token / sign-in) and **Personally identifiable information** (email, name, only if the user creates an account).
Do NOT tick: web history, user activity, website content. Conversation content is processed locally and not transmitted to the developer.
Certify all three: not sold to third parties; not used for unrelated purposes; not used for creditworthiness/lending.

## Before you submit
1. Set CHROME_STORE_URL and EXTENSION_ID in the website's src/config.ts once the listing exists (the extension ID appears in the developer dashboard).
2. Upload dist/chat-exporter-1.1.0.zip (python scripts/package.py builds and verifies it).
3. Store images are generated: `node store-assets/build.js` writes them to `store-assets/out/` (5 screenshots 1280x800, small promo 440x280, marquee 1400x560, all 24-bit PNG). The 128px store icon is `icons/icon128.png`.
4. Deploy the website first: the privacy URL, the login/connect flow and /api/extension/status must be live, and Polar must be switched to live mode (see below).

## Trademark risk
The name starts with "ChatGPT". OpenAI's brand guidelines discourage product names that begin with its marks, and the Web Store can reject or remove such listings. Safer alternatives: "Exporter for ChatGPT", "Chat Exporter for ChatGPT". The website domain is not affected by this.

## Go-live checklist for payments
Polar is in sandbox mode. Before launch: create the two products in the live Polar org, put the live product IDs in wrangler.jsonc, set POLAR_SERVER=production, create a live access token and webhook, and set the Worker secrets.
