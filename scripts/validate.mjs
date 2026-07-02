// Sanity-checks both manifests before packaging: required MV3 fields, no keys
// that block a Web Store upload, every referenced file exists, and the Chrome
// and Firefox manifests carry the SAME version (they ship the same release).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];

function validateManifest(file) {
    const manifest = JSON.parse(readFileSync(join(root, file), 'utf8'));
    const err = msg => errors.push(`${file}: ${msg}`);

    for (const k of ['manifest_version', 'name', 'version', 'description', 'icons']) {
        if (!(k in manifest)) err(`missing "${k}"`);
    }
    if (manifest.manifest_version !== 3) err(`manifest_version must be 3 (got ${manifest.manifest_version})`);
    if ('key' in manifest) err('"key" must not be committed in the published package');
    if ('update_url' in manifest) err('"update_url" blocks a store upload — remove it');
    if (!/^\d+(\.\d+){0,3}$/.test(String(manifest.version ?? ''))) err(`invalid version "${manifest.version}"`);

    // Every path the manifest points at must exist (background covers both the
    // Chrome service_worker form and the Firefox scripts-array form).
    const refs = [
        manifest.action?.default_popup,
        manifest.options_ui?.page,
        manifest.background?.service_worker,
        ...(manifest.background?.scripts ?? []),
        ...(manifest.content_scripts ?? []).flatMap(cs => cs.js ?? []),
        ...Object.values(manifest.icons ?? {}),
        ...(manifest.web_accessible_resources ?? []).flatMap(w => w.resources ?? []),
    ].filter(Boolean);
    for (const ref of refs) {
        if (!existsSync(join(root, ref))) err(`referenced file missing: ${ref}`);
    }
    return { manifest, refs };
}

const chrome = validateManifest('manifest.json');
const firefox = validateManifest('manifest.firefox.json');

if (chrome.manifest.version !== firefox.manifest.version) {
    errors.push(`version drift: manifest.json is ${chrome.manifest.version} but manifest.firefox.json is ${firefox.manifest.version} — run scripts/bump.mjs`);
}

if (errors.length) {
    console.error('✗ manifest validation failed:');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
}
console.log(`✓ manifests valid — ${chrome.manifest.name} v${chrome.manifest.version}, MV3, ${chrome.refs.length}+${firefox.refs.length} refs OK`);
