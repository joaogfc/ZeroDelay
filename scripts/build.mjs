// Produces the Web Store package build/zerodelay-<version>.zip with manifest.json
// at the ZIP root. Pure Node — no `zip` binary, no dependencies (uses node:zlib
// for DEFLATE + CRC-32 and writes the ZIP container by hand).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));

// Everything that is dev-only or not part of the shipped extension.
const SKIP_DIRS = new Set(['.git', 'node_modules', 'build', 'scripts', 'test', 'publishing', '.github']);
const SKIP_FILES = new Set([
    '.gitignore', '.gitattributes', '.DS_Store', 'Thumbs.db', 'desktop.ini',
    'ROADMAP.md', 'eslint.config.mjs', 'package.json', 'package-lock.json',
]);

function* walk(dir) {
    for (const name of readdirSync(dir).sort()) {
        // Skip by name whether it's a dir or a file — in a git submodule `.git`
        // is a gitlink *file*, not a directory, so a dir-only check misses it.
        if (SKIP_DIRS.has(name) || SKIP_FILES.has(name)) continue;
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

const files = [];
for (const abs of walk(root)) {
    files.push({ name: relative(root, abs).split(/[\\/]/).join('/'), data: readFileSync(abs) });
}

const hasManifestAtRoot = files.some(f => f.name === 'manifest.json');
if (!hasManifestAtRoot) {
    console.error('✗ manifest.json not found at package root — aborting.');
    process.exit(1);
}

mkdirSync(join(root, 'build'), { recursive: true });
const outName = `zerodelay-${version}.zip`;
const zip = makeZip(files);
writeFileSync(join(root, 'build', outName), zip);

console.log(`✓ build/${outName} — ${files.length} files, ${(zip.length / 1024).toFixed(1)} KB (manifest.json at ZIP root)`);
for (const f of files) console.log('  · ' + f.name);
