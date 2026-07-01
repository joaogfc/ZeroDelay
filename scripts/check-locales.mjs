// Validate the extension's JSON and keep locales in sync — no dependencies.
//
// 1. Every relevant .json (manifest + _locales/**/messages.json) must parse.
// 2. en and pt_BR must have the exact same set of message keys.
// 3. Each message's placeholders ($n$ and named) must match across locales.
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

// --- 2 & 3. Compare en vs pt_BR -------------------------------------------
const REQUIRED = ['en', 'pt_BR'];

for (const locale of REQUIRED) {
    if (!(locale in localeFiles)) {
        errors.push(`missing required locale: _locales/${locale}/messages.json`);
    }
}

const en = localeFiles.en;
const ptBR = localeFiles.pt_BR;

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

if (en && ptBR) {
    const enKeys = new Set(Object.keys(en));
    const ptKeys = new Set(Object.keys(ptBR));

    for (const k of enKeys) {
        if (!ptKeys.has(k)) errors.push(`key "${k}" is in en but missing from pt_BR`);
    }
    for (const k of ptKeys) {
        if (!enKeys.has(k)) errors.push(`key "${k}" is in pt_BR but missing from en`);
    }

    // Placeholder parity only for keys present in both.
    for (const k of enKeys) {
        if (!ptKeys.has(k)) continue;
        const a = placeholdersIn(en[k]).join(',');
        const b = placeholdersIn(ptBR[k]).join(',');
        if (a !== b) {
            errors.push(`key "${k}": placeholders differ (en: [${a}] vs pt_BR: [${b}])`);
        }
    }
}

// --- Report ---------------------------------------------------------------
if (errors.length) {
    console.error(`check:locales — ${errors.length} problem(s) found:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
}

console.log('check:locales — OK (JSON valid, en/pt_BR keys and placeholders in sync)');
