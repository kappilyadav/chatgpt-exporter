# Supported languages

The extension supports 35 languages: the 34 offered by the Chrome Web Store, plus Hindi (already in the extension before the store languages were added). Arabic and Hebrew are right-to-left.

| Code | Language (English) | Native name | Notes |
| --- | --- | --- | --- |
| `en` | English | English | Source language |
| `ar` | Arabic | العربية | Right-to-left |
| `bg` | Bulgarian | български | |
| `ca` | Catalan | català | |
| `cs` | Czech | čeština | |
| `da` | Danish | dansk | |
| `de` | German | Deutsch | |
| `el` | Greek | Ελληνικά | |
| `es` | Spanish | español | |
| `fi` | Finnish | suomi | |
| `fr` | French | français | |
| `he` | Hebrew | עברית | Right-to-left. The Web Store dashboard calls it `iw`; `_locales/iw` is shipped as a copy |
| `hi` | Hindi | हिन्दी | Not a Web Store language |
| `hr` | Croatian | hrvatski | |
| `hu` | Hungarian | magyar | |
| `id` | Indonesian | Indonesia | |
| `it` | Italian | italiano | |
| `ja` | Japanese | 日本語 | |
| `ko` | Korean | 한국어 | |
| `nl` | Dutch | Nederlands | |
| `no` | Norwegian | norsk | Chrome reports Norwegian Bokmål as `nb`; `_locales/nb` is shipped as a copy |
| `pl` | Polish | polski | |
| `pt_BR` | Portuguese (Brazil) | português (Brasil) | |
| `pt_PT` | Portuguese (Portugal) | português (Portugal) | |
| `ro` | Romanian | română | |
| `ru` | Russian | русский | |
| `sk` | Slovak | slovenčina | |
| `sl` | Slovenian | slovenščina | |
| `sv` | Swedish | svenska | |
| `th` | Thai | ไทย | |
| `tr` | Turkish | Türkçe | |
| `uk` | Ukrainian | українська | |
| `vi` | Vietnamese | Tiếng Việt | |
| `zh_CN` | Chinese (Simplified) | 中文（中国） | |
| `zh_TW` | Chinese (Traditional) | 中文（台灣） | |

## Using this for the website

- Language codes match the file names in `scripts/i18n/` (one flat `key: text` JSON file per language, `en.json` is the master).
- Native names are also in `src/core/i18n.js` (the `NAMES` map) and are what the language picker shows. They are never translated.
- Reuse the extension's wording for shared terms (Export, Select, Upgrade, Free plan, Pro, Account) so the site and the extension read the same.
- The site's own text (headlines, pricing, FAQ) is not in these files and needs its own translations.
- Browser language codes map to these codes as follows: `zh-TW`/`zh-HK`/`zh-Hant` → `zh_TW`; other `zh` → `zh_CN`; `pt-PT` and other non-Brazil `pt` → `pt_PT`; `pt`/`pt-BR` → `pt_BR`; `nb`/`nn` → `no`; `iw` → `he`; `in` → `id`. Regional variants such as `es-MX` or `de-AT` fall back to the base language. See `normalize()` in `src/core/i18n.js`.
