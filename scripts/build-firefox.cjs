// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)

// Assembles dist/firefox: the shipped files plus manifest.firefox.json renamed
// to manifest.json. The Chrome/Edge manifest at the repo root is left untouched.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist', 'firefox');

// Only what the extension actually loads at runtime — nothing from the repo
// root is copied unless it's listed here.
const files = [
    'background.js',
    'common.js',
    'content.js',
    'inject.js',
    'engine/controller.js',
    'hexa/theme.js',
    'pix.js',
    'popup.js',
    'popup.css',
    'popup.html',
    'LICENSE',
    'THIRD-PARTY-NOTICES.md',
];

const dirs = [
    '_locales',
    'icons',
    'vendor',
    'fonts',
];

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else fs.copyFileSync(s, d);
    }
}

function build() {
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });

    for (const f of files) {
        const src = path.join(root, f);
        if (!fs.existsSync(src)) throw new Error(`missing source file: ${f}`);
        const dst = path.join(out, f);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }

    for (const dir of dirs) {
        const src = path.join(root, dir);
        if (!fs.existsSync(src)) throw new Error(`missing source dir: ${dir}`);
        copyDir(src, path.join(out, dir));
    }

    const fxManifest = path.join(root, 'manifest.firefox.json');
    if (!fs.existsSync(fxManifest)) throw new Error('missing manifest.firefox.json');
    fs.copyFileSync(fxManifest, path.join(out, 'manifest.json'));

    console.log(`built dist/firefox (${files.length} files, ${dirs.length} dirs)`);
}

build();
