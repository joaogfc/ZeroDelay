// Produces the Web Store package build/zerodelay-<version>.zip with manifest.json
// at the ZIP root. Pure Node — no `zip` binary, no dependencies (uses node:zlib
// for DEFLATE + CRC-32 and writes the ZIP container by hand).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));

// Whitelist: only what the shipped extension actually loads at runtime (same
// approach as scripts/build-firefox.cjs). With a blacklist, any stray file in
// the working tree (editor config, notes, .env) would silently leak into the
// package uploaded to the store.
const SHIP_FILES = [
    'manifest.json',
    'background.js',
    'common.js',
    'content.js',
    'inject.js',
    'engine/controller.js',
    'pix.js',
    'popup.js',
    'popup.css',
    'popup.html',
    'LICENSE',
    'THIRD-PARTY-NOTICES.md',
];
const SHIP_DIRS = [
    '_locales',
    'icons',
    'vendor',
];

function* walk(dir) {
    for (const name of readdirSync(dir).sort()) {
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) yield* walk(abs);
        else yield abs;
    }
}

// Minimal ZIP writer (DEFLATE entries, fixed 1980-01-01 timestamp = reproducible).
function makeZip(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    const dosTime = 0, dosDate = 0x21;

    for (const { name, data } of files) {
        const nameBuf = Buffer.from(name, 'utf8');
        const comp = deflateRawSync(data);
        const crc = crc32(data) >>> 0;

        const lfh = Buffer.alloc(30);
        lfh.writeUInt32LE(0x04034b50, 0);   // local file header signature
        lfh.writeUInt16LE(20, 4);           // version needed to extract
        lfh.writeUInt16LE(0, 6);            // flags
        lfh.writeUInt16LE(8, 8);            // compression: deflate
        lfh.writeUInt16LE(dosTime, 10);
        lfh.writeUInt16LE(dosDate, 12);
        lfh.writeUInt32LE(crc, 14);
        lfh.writeUInt32LE(comp.length, 18);
        lfh.writeUInt32LE(data.length, 22);
        lfh.writeUInt16LE(nameBuf.length, 26);
        lfh.writeUInt16LE(0, 28);          // extra length
        parts.push(lfh, nameBuf, comp);

        const cdh = Buffer.alloc(46);
        cdh.writeUInt32LE(0x02014b50, 0);   // central directory header signature
        cdh.writeUInt16LE(20, 4);           // version made by
        cdh.writeUInt16LE(20, 6);           // version needed
        cdh.writeUInt16LE(0, 8);
        cdh.writeUInt16LE(8, 10);
        cdh.writeUInt16LE(dosTime, 12);
        cdh.writeUInt16LE(dosDate, 14);
        cdh.writeUInt32LE(crc, 16);
        cdh.writeUInt32LE(comp.length, 20);
        cdh.writeUInt32LE(data.length, 24);
        cdh.writeUInt16LE(nameBuf.length, 28);
        cdh.writeUInt16LE(0, 30);          // extra
        cdh.writeUInt16LE(0, 32);          // comment
        cdh.writeUInt16LE(0, 34);          // disk number start
        cdh.writeUInt16LE(0, 36);          // internal attrs
        cdh.writeUInt32LE(0, 38);          // external attrs
        cdh.writeUInt32LE(offset, 42);     // local header offset
        central.push(cdh, nameBuf);

        offset += lfh.length + nameBuf.length + comp.length;
    }

    const cd = Buffer.concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);      // end of central directory signature
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(cd.length, 12);
    eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...parts, cd, eocd]);
}

const version = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')).version;

const toEntry = abs => ({ name: relative(root, abs).split(/[\\/]/).join('/'), data: readFileSync(abs) });

const files = [];
for (const f of SHIP_FILES) {
    const abs = join(root, f);
    if (!existsSync(abs)) {
        console.error(`✗ missing shipped file: ${f} — aborting.`);
        process.exit(1);
    }
    files.push(toEntry(abs));
}
for (const d of SHIP_DIRS) {
    const abs = join(root, d);
    if (!existsSync(abs)) {
        console.error(`✗ missing shipped dir: ${d} — aborting.`);
        process.exit(1);
    }
    for (const file of walk(abs)) files.push(toEntry(file));
}
files.sort((a, b) => a.name < b.name ? -1 : 1); // reproducible entry order

mkdirSync(join(root, 'build'), { recursive: true });
const outName = `zerodelay-${version}.zip`;
const zip = makeZip(files);
writeFileSync(join(root, 'build', outName), zip);

console.log(`✓ build/${outName} — ${files.length} files, ${(zip.length / 1024).toFixed(1)} KB (manifest.json at ZIP root)`);
for (const f of files) console.log('  · ' + f.name);
