// Validate the extension's JSON and keep locales in sync — no dependencies.
//
// 1. Every relevant .json (manifest + _locales/**/messages.json) must parse.
// 2. Every locale must have exactly the same keys as en (the default_locale).
// 3. Each message's placeholders ($n$ and named) must match en, per locale.
//
// Exits 0 when everything is consistent, 1 (with a report) otherwise.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function rel(p) {
    return p.slice(root.length + 1).replaceAll('\\', '/');
}

// --- 1. Parse every relevant JSON file ------------------------------------
function parseJson(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
        errors.push(`${rel(path)}: invalid JSON — ${e.message}`);
        return null;
    }
}

const localesDir = join(root, '_locales');
const localeFiles = {}; // localeName -> parsed messages (or null)

parseJson(join(root, 'manifest.json'));

if (!existsSync(localesDir)) {
    errors.push('_locales/ directory is missing');
} else {
    for (const locale of readdirSync(localesDir)) {
        const messagesPath = join(localesDir, locale, 'messages.json');
        if (existsSync(messagesPath)) {
            localeFiles[locale] = parseJson(messagesPath);
        }
    }
}

// --- 2 & 3. Compare every locale against en (the reference) ----------------
const REQUIRED = ['en', 'pt_BR', 'es', 'fr'];

for (const locale of REQUIRED) {
    if (!(locale in localeFiles)) {
        errors.push(`missing required locale: _locales/${locale}/messages.json`);
    }
}

const en = localeFiles.en;

// Named placeholders like $count$ or positional ones like $1, referenced in a
// message string. Returns a sorted, de-duplicated list for comparison.
function placeholdersIn(messageObj) {
    const text = messageObj && typeof messageObj.message === 'string' ? messageObj.message : '';
    const found = new Set();
    for (const m of text.matchAll(/\$([a-zA-Z0-9_]+)\$|\$(\d+)/g)) {
        found.add(m[1] ?? m[2]);
    }
    return [...found].sort();
}

if (en) {
    const enKeys = Object.keys(en);
    for (const [locale, msgs] of Object.entries(localeFiles)) {
        if (locale === 'en' || !msgs) continue;
        const keys = new Set(Object.keys(msgs));

        for (const k of enKeys) {
            if (!keys.has(k)) errors.push(`[${locale}] key "${k}" is in en but missing`);
        }
        for (const k of keys) {
            if (!(k in en)) errors.push(`[${locale}] key "${k}" is not in en`);
        }

        // Placeholder parity only for keys present in both.
        for (const k of enKeys) {
            if (!keys.has(k)) continue;
            const a = placeholdersIn(en[k]).join(',');
            const b = placeholdersIn(msgs[k]).join(',');
            if (a !== b) {
                errors.push(`[${locale}] key "${k}": placeholders differ (en: [${a}] vs [${b}])`);
            }
        }
    }
}

// --- Report ---------------------------------------------------------------
if (errors.length) {
    console.error(`check:locales — ${errors.length} problem(s) found:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
}

console.log(`check:locales — OK (JSON valid; ${Object.keys(localeFiles).length} locales match en's keys and placeholders)`);
