#!/usr/bin/env python3
"""Build the Chrome Web Store upload zip.

Usage:  python scripts/package.py          (run from anywhere)
Output: dist/chat-exporter-<version>.zip

Only runtime files are included (manifest, background, icons, options, popup, print, src, vendor);
README, scripts, dist and dev folders are left out. Paths are written with forward slashes, which the
Web Store requires (Windows' built-in "Send to > Compressed folder" gets this wrong for nested folders).
"""
import json
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
os.chdir(ROOT)

TOP = ['manifest.json', 'background.js', '_locales', 'icons', 'options', 'popup', 'print', 'src', 'vendor']
MAX_NAME = 75          # Chrome Web Store limit for the name
MAX_DESCRIPTION = 132  # Chrome Web Store limit for the summary


def main():
    # Rebuild _locales/ and src/core/locales.js from scripts/i18n/*.json; fails on a missing key or broken placeholder.
    subprocess.check_call([sys.executable, os.path.join('scripts', 'build_locales.py')])
    manifest = json.load(open('manifest.json', encoding='utf-8'))
    ver = manifest['version']
    en = json.load(open('_locales/en/messages.json', encoding='utf-8'))
    for code in sorted(os.listdir('_locales')):  # includes the nb alias folder
        msgs = json.load(open('_locales/%s/messages.json' % code, encoding='utf-8'))
        if len(msgs['extName']['message']) > MAX_NAME:
            sys.exit('%s: extName is longer than %d characters' % (code, MAX_NAME))
        if len(msgs['extDescription']['message']) > MAX_DESCRIPTION:
            sys.exit('%s: extDescription is longer than %d characters' % (code, MAX_DESCRIPTION))
    for ref in re.findall(r'__MSG_(\w+)__', open('manifest.json', encoding='utf-8').read()):
        if ref not in en:
            sys.exit('manifest uses __MSG_%s__ but _locales/en has no such key' % ref)

    os.makedirs('dist', exist_ok=True)
    out = 'dist/chat-exporter-%s.zip' % ver

    files = []
    for top in TOP:
        if os.path.isfile(top):
            files.append(top)
        elif os.path.isdir(top):
            for root, _, names in os.walk(top):
                for n in names:
                    if n in ('.DS_Store','Thumbs.db'):
                        continue
                    files.append(os.path.join(root, n).replace(os.sep, '/'))
        else:
            sys.exit('missing: ' + top)
    files.sort(key=lambda f: (f != 'manifest.json', f))

    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in files:
            z.write(f, f)
    print('%s  %d KB, %d files' % (out, os.path.getsize(out) // 1024, len(files)))

    # ---- verify the archive
    z = zipfile.ZipFile(out)
    assert z.testzip() is None, 'corrupt zip'
    names = z.namelist()
    assert names[0] == 'manifest.json', 'manifest.json must be at the zip root'
    assert not any('\\' in n or n.startswith('/') for n in names), 'bad path separators'
    assert not any(n.endswith('.DS_Store') for n in names), '.DS_Store leaked'
    assert not any(re.search(r'(^|/)(test|scripts|\.git|dist|node_modules)/|README', n) for n in names), 'dev files leaked'

    m = json.loads(z.read('manifest.json'))
    need = set(m['content_scripts'][0]['js']) | set(m['icons'].values()) | {
        m['background']['service_worker'], m['action']['default_popup'], m['options_ui']['page']}
    missing = [n for n in need if n not in names]
    for page in ('popup/popup.html', 'options/options.html', 'print/print.html'):
        base = os.path.dirname(page)
        for ref in re.findall(r'(?:src|href)="([^"]+)"', z.read(page).decode('utf-8')):
            if ref.startswith('http'):
                continue
            p = os.path.normpath(os.path.join(base, ref)).replace(os.sep, '/')
            if p not in names:
                missing.append('%s -> %s' % (page, ref))
    if missing:
        sys.exit('missing references: %s' % missing)
    locales = sorted(n.split('/')[1] for n in names if n.startswith('_locales/') and n.endswith('/messages.json'))
    assert m['default_locale'] in locales, 'default_locale folder missing from the zip'
    print('verified: manifest at root, all references present, %d locales' % len(locales))


if __name__ == '__main__':
    main()
