// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)

import * as common from './common.js';
import * as pix from './pix.js';

const L = common.label;

// --------------------------------------------------------------- DOM helpers
const $ = sel => document.querySelector(sel);

function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
        if (k === 'class') node.className = v;
        else if (k === 'html') { if (v) node.append(parseSvg(v)); }
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else if (v !== false && v != null) node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
}

// Parse trusted static SVG markup (our own ICONS / generated QR) into a DOM node,
// avoiding innerHTML (and the addons-linter UNSAFE_VAR_ASSIGNMENT warning). Parse
// as text/html (not image/svg+xml): the HTML parser puts <svg> in the SVG
// namespace even without an xmlns attribute, so our inline ICONS actually render;
// image/svg+xml would drop them into the null namespace and they'd stay invisible.
function parseSvg(markup) {
    return new DOMParser().parseFromString(markup, 'text/html').body.firstElementChild;
}

const getStorage = keys => new Promise(res => chrome.storage.local.get(keys, res));

/**
 * Wire ARIA radiogroup keyboard behavior: one tab-stop for the group (roving
 * tabindex) plus arrow/Home/End navigation that also activates the option.
 * @param {HTMLElement} container - The radiogroup element; receives the keydown listener.
 * @param {HTMLElement[]} items - Ordered radio elements.
 * @param {(index: number) => void} activate - Selects the item at `index`.
 * @returns {(index: number) => void} `roving(index)` - keeps the single tab-stop on the selected item when it changes externally (e.g. after a refresh).
 */
function wireRadiogroup(container, items, activate) {
    const roving = i => items.forEach((el, j) => { el.tabIndex = j === i ? 0 : -1; });
    roving(0);
    items.forEach((el, i) => el.addEventListener('click', () => roving(i)));
    container.addEventListener('keydown', e => {
        const cur = items.indexOf(document.activeElement);
        if (cur === -1) return;
        const last = items.length - 1;
        let next;
        switch (e.key) {
            case 'ArrowRight': case 'ArrowDown': next = cur >= last ? 0 : cur + 1; break;
            case 'ArrowLeft': case 'ArrowUp': next = cur <= 0 ? last : cur - 1; break;
            case 'Home': next = 0; break;
            case 'End': next = last; break;
            default: return;
        }
        e.preventDefault();
        roving(next);
        items[next].focus();
        activate(next);
    });
    return roving;
}

// --------------------------------------------------------------- Icons
// The signature "degraded → sharp" morph. Each mode icon stacks two vendored
// glyphs of the SAME concept: a Pixelarticons pixel glyph (MIT — the degraded
// state) over a Lucide vector (ISC — the sharp/synced state). CSS resolves the
// pixel into the vector on hover/focus/selection (see the .mode-icon morph
// rules in popup.css). These builders only assemble trusted static markup —
// no logic, injected via the existing parseSvg path. Support glyphs are single
// Lucide vectors (one clean library across the whole UI).
const pixel = d => `<svg class="pixel" viewBox="0 0 24 24" fill="currentColor">${d}</svg>`;
const clean = d => `<svg class="clean" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const morph = (p, c) => `<span class="ico" aria-hidden="true">${pixel(p)}${clean(c)}</span>`;
const solo = c => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c}</svg>`;

const ICONS = {
    off: morph(
        '<path d="M6 20h12v2H6zM18 6h2v2h-2zM4 6h2v2H4zm2-2h2v2H6zm10 0h2v2h-2zM4 18h2v2H4zm14 0h2v2h-2zM2 8h2v10H2zm18 0h2v10h-2zm-9-6h2v9h-2z"/>',
        '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>'),
    auto: morph(
        '<path d="M11 1h2v4h-2zm0 22h2v-4h-2zM9 5h2v4H9zm0 14h2v-4H9zm4-14h2v4h-2zm0 14h2v-4h-2zM5 9h4v2H5zm14 0h-4v2h4zM1 11h4v2H1zm22 0h-4v2h4zM5 13h4v2H5zm14 0h-4v2h4z"/>',
        '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>'),
    suave: morph(
        '<path d="M4 2h16v2H4zM2 4h2v10H2zm18 0h2v10h-2zM4 14h2v2H4zm2 2h2v2H6zm4 4h4v2h-4zm10-6h-2v2h2zm-2 2h-2v2h2zm-2 2h-2v2h2zm-6 0H8v2h2z"/>',
        '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),
    balanced: morph(
        '<path d="M5 19H3v-2h2v2Zm16 0h-2v-2h2v2ZM3 17H1v-6h2v6Zm11 0h-4v-4h1V5h2v8h1v4Zm9 0h-2v-6h2v6ZM5 11H3V9h2v2Zm16 0h-2V9h2v2ZM9 9H5V7h4v2Zm10 0h-4V7h4v2Z"/>',
        '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),
    aggressive: morph(
        '<path d="M20 4v16h2V4zM2 11v2h16v-2zm12 2v2h2v-2zm-2 2v2h2v-2zm-2 2v2h2v-2zm4-8v2h2V9zm-2-2v2h2V7zm-2-2v2h2V5z"/>',
        '<path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/>'),
    min: morph(
        '<path d="M4 13h8v6h2v2h-2v2h-2v-8H2v-4h2v2Zm12 6h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2v-2h2v2Zm-6-6h8v4h-2v-2h-8V5h-2V3h2V1h2v8Zm-8 2H4V9h2v2Zm2-2H6V7h2v2Zm2-2H8V5h2v2Z"/>',
        '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    wifi: solo('<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>'),
    gain: solo('<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>'),
    bmc: solo('<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'),
};

// Pixel-art coffee, one per PIX amount — "fancier the more you tip". `coffee`
// and `tea` are Pixelarticons (MIT); the to-go cup and cappuccino are drawn here
// on the same 24px grid. Decorative only — keyed by amount, no logic attached.
const cup = d => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${d}</svg>`;
const COFFEE = {
    1: cup('<path d="M4 4h16v2H4zm0 2h2v8H4zm2 8h10v2H6zm14-8h2v4h-2zm-2 4h2v2h-2zm-2-4h2v8h-2zM2 18h18v2H2z"/>'),
    3: cup('<path d="M4 6h16v2H4zm0 2h2v10H4zm2 10h10v2H6zM20 8h2v4h-2zm-2 4h2v2h-2zm-2-4h2v10h-2zM7 2h2v2H7zm6 0h2v2h-2zM9 0h2v2H9zm6 0h2v2h-2zm-5 8h2v4h-2zm-2 4h6v4H8z"/>'),
    5: cup('<path d="M7 3h10v2H7zM5 5h14v2H5zM6 7h2v10H6zm10 0h2v10h-2zM8 17h8v2H8zM6 10h12v4H6z"/>'),
    10: cup('<path d="M8 3h8v2H8zM6 5h12v2H6zM6 7h2v8H6zm9 0h2v8h-2zm-9 8h11v2H6zM17 9h3v2h-3zm2 2h1v2h-1zm-2 2h3v2h-3zM4 18h14v2H4zM15 0h2v2h-2zM14 2h2v2h-2zM13 4h2v3h-2z"/>'),
};

// --------------------------------------------------------------- State
let state = {};
const updaters = [];          // fn() -> sync a control's display
const modeCards = {};         // mode name -> card element
let rovingModes = null;       // wireRadiogroup roving-tabindex setter for modes

function resolve(d) {
    return {
        enabled: common.value(d.enabled, common.defaultEnabled),
        playbackRate: common.limitValue(d.playbackRate, common.defaultPlaybackRate, common.minPlaybackRate, common.maxPlaybackRate, common.stepPlaybackRate),
        showPlaybackRate: common.value(d.showPlaybackRate, common.defaultShowPlaybackRate),
        showLatency: common.value(d.showLatency, common.defaultShowLatency),
        showHealth: common.value(d.showHealth, common.defaultShowHealth),
        auto: common.value(d.auto, common.defaultAuto),
        bufferTarget: common.limitValue(d.bufferTarget, common.defaultBufferTarget, common.minBufferTarget, common.maxBufferTarget, common.stepBufferTarget),
        skip: common.value(d.skip, common.defaultSkip),
        skipThreathold: common.value(d.skipThreathold, common.defaultSkipThreathold),
    };
}

function setOne(key, val) {
    state[key] = val;
    chrome.storage.local.set({ [key]: val });
    refresh();
}

function applyPreset(name) {
    const preset = common.presets[name];
    chrome.storage.local.set(preset);
    Object.assign(state, preset);
    refresh();
}

// --------------------------------------------------------------- Render
function renderStatic() {
    $('#brand-name').textContent = L.appName;
    $('#brand-tagline').textContent = L.tagline;
    $('#modes-title').textContent = L.sectionMode;
    $('#modes-note').textContent = L.modesNote;
    $('#advanced-label').textContent = L.sectionIndicators;
    $('#reset-label').textContent = L.reset;
    $('#reset').title = L.resetHint;
    $('#mode-warning').textContent = L.minWarning;
}

function renderModes() {
    const container = $('#mode-cards');
    for (const name of common.modeOrder) {
        const meta = common.modeMeta[name];
        const card = el('button', {
            class: 'mode-card', type: 'button', role: 'radio', 'aria-checked': 'false',
            onclick: () => applyPreset(name),
        },
            el('span', { class: 'mode-icon', html: ICONS[name] }),
            el('span', { class: 'mode-body' },
                el('span', { class: 'mode-name', text: meta.title }),
                el('span', { class: 'mode-desc', text: meta.desc }),
                el('span', { class: 'mode-conn' }, el('span', { class: 'conn-icon', html: ICONS.wifi }), el('span', { text: meta.conn })),
                el('span', { class: 'mode-gain' + (name === 'off' ? ' is-none' : '') }, el('span', { class: 'gain-icon', html: ICONS.gain }), el('span', { text: meta.gain })),
            ),
            el('span', { class: 'mode-check', html: ICONS.check }),
        );
        modeCards[name] = card;
        container.append(card);
    }
    const modeItems = common.modeOrder.map(n => modeCards[n]);
    rovingModes = wireRadiogroup(container, modeItems, idx => applyPreset(common.modeOrder[idx]));
}

function buildRow({ label, control }) {
    const main = el('div', { class: 'row-main' }, el('div', { class: 'row-label', text: label }));
    return el('div', { class: 'row' }, main, el('div', { class: 'row-control' }, control));
}

function buildToggle(key) {
    const input = el('input', { type: 'checkbox', onchange: () => setOne(key, input.checked) });
    const sw = el('label', { class: 'switch' }, input, el('span', { class: 'track' }), el('span', { class: 'thumb' }));
    updaters.push(() => { input.checked = !!state[key]; });
    return sw;
}

function renderIndicators() {
    const rows = $('#indicator-rows');
    const defs = [
        { key: 'showPlaybackRate', label: L.showPlaybackRate },
        { key: 'showLatency', label: L.showLatency },
        { key: 'showHealth', label: L.showHealth },
    ];
    for (const d of defs) {
        rows.append(buildRow({ label: d.label, control: buildToggle(d.key) }));
    }
}

function renderAdvancedToggle() {
    const toggle = $('#advanced-toggle');
    const panel = $('#advanced-panel');
    toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
    });
}

function renderReset() {
    const btn = $('#reset');
    let timer, armed = false, doneTimer;

    const start = () => {
        clearTimeout(timer);
        clearTimeout(doneTimer);
        btn.classList.remove('done');
        armed = false;
        void btn.offsetWidth; // restart the fill animation
        btn.classList.add('holding');
        timer = setTimeout(() => {
            btn.classList.remove('holding');
            btn.classList.add('done');
            armed = true;
        }, 1000);
    };
    const end = commit => {
        clearTimeout(timer);
        btn.classList.remove('holding');
        if (commit && armed) {
            doReset();
            doneTimer = setTimeout(() => btn.classList.remove('done'), 700);
        } else {
            btn.classList.remove('done');
        }
        armed = false;
    };

    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', () => end(true));
    btn.addEventListener('mouseleave', () => end(false));
    btn.addEventListener('touchstart', e => { e.preventDefault(); start(); }, { passive: false });
    btn.addEventListener('touchend', e => { e.preventDefault(); end(true); });
    btn.addEventListener('touchcancel', () => end(false));
}

function doReset() {
    // Only clear engine settings — keep the donation opt-out / snooze choices.
    chrome.storage.local.remove(common.storage);
    state = resolve({});
    refresh();
}

// --------------------------------------------------------------- Support (PIX)
function renderSupport() {
    const toggle = $('#coffee-toggle');
    const panel = $('#support-panel');
    const amountsBox = $('#support-amounts');
    const custom = $('#support-custom');
    const qrBox = $('#support-qr');
    const copyBtn = $('#support-copy');

    toggle.title = L.supportTitle;
    toggle.setAttribute('aria-label', L.supportTitle);
    $('#coffee-label').textContent = L.supportBtn;
    $('#support-cta-text').textContent = L.supportCtaText;
    const ctaBtn = $('#support-cta-btn');
    ctaBtn.textContent = L.supportCtaBtn;
    $('#support-title').textContent = L.supportTitle;
    $('#support-note').textContent = L.supportNote;
    $('#support-scan').textContent = L.supportScan;
    custom.placeholder = L.supportCustomPlaceholder;
    copyBtn.textContent = L.supportCopy;

    const isBr = common.isBrazil();
    let render = () => {};   // refresh hook called by setOpen / eligibility

    if (isBr) {
        // ----- PIX (Brazil): suggested amounts + "copia e cola" code + QR ----
        let amount = pix.PIX_DEFAULT_AMOUNT;
        const chips = {};
        let copyTimer;

        const selectChip = key => {
            for (const [k, c] of Object.entries(chips)) c.setAttribute('aria-checked', String(k === key));
        };

        const updatePix = () => {
            const code = pix.buildPixCode(amount);
            copyBtn.dataset.code = code;
            copyBtn.classList.remove('copied');
            copyBtn.textContent = L.supportCopy;
            if (typeof window.qrcode === 'function') {
                try {
                    const qr = window.qrcode(0, 'M');
                    qr.addData(code);
                    qr.make();
                    qrBox.textContent = '';
                    qrBox.append(parseSvg(qr.createSvgTag({ cellSize: 4, scalable: true })));
                    qrBox.hidden = false;
                } catch {
                    qrBox.hidden = true;
                }
            } else {
                qrBox.hidden = true;
            }
        };
        render = updatePix;

        for (const value of pix.PIX_AMOUNTS) {
            const key = String(value);
            const chip = el('button', {
                class: 'support-chip', type: 'button', role: 'radio', 'aria-checked': 'false',
                onclick: () => { amount = value; custom.hidden = true; selectChip(key); updatePix(); },
            }, el('span', { class: 'chip-ico', html: COFFEE[value] || '' }), el('span', { text: 'R$ ' + value }));
            chips[key] = chip;
            amountsBox.append(chip);
        }

        chips.custom = el('button', {
            class: 'support-chip', type: 'button', role: 'radio', 'aria-checked': 'false',
            onclick: () => {
                custom.hidden = false;
                custom.focus();
                selectChip('custom');
                const v = parseFloat(custom.value);
                amount = (Number.isFinite(v) && v > 0) ? v : 0;
                updatePix();
            },
        }, L.supportCustom);
        amountsBox.append(chips.custom);

        custom.addEventListener('input', () => {
            const v = parseFloat(custom.value);
            amount = (Number.isFinite(v) && v > 0) ? v : 0;
            updatePix();
        });

        copyBtn.addEventListener('click', async () => {
            const code = copyBtn.dataset.code || pix.buildPixCode(amount);
            let ok = false;
            try {
                await navigator.clipboard.writeText(code);
                ok = true;
            } catch {
                try {
                    const ta = el('textarea', { class: '' });
                    ta.value = code;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.append(ta);
                    ta.select();
                    ok = document.execCommand('copy');
                    ta.remove();
                } catch { ok = false; }
            }
            if (ok) {
                copyBtn.classList.add('copied');
                copyBtn.textContent = L.supportCopied;
                clearTimeout(copyTimer);
                copyTimer = setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.textContent = L.supportCopy;
                }, 1600);
            }
        });

        selectChip(String(pix.PIX_DEFAULT_AMOUNT));
    } else {
        // ----- International (non-Brazil): external donation link buttons ----
        amountsBox.hidden = true;
        custom.hidden = true;
        $('#support-pix').hidden = true;

        const intl = $('#support-intl');
        intl.hidden = false;
        const labels = { bmc: L.supportBmc };
        for (const [key, url] of Object.entries(common.donateLinks)) {
            if (!url || url.includes('REPLACE')) continue;
            intl.append(el('button', {
                class: 'support-link support-link--' + key, type: 'button',
                onclick: () => chrome.tabs.create({ url }),
            },
                el('span', { class: 'support-link-icon', html: ICONS[key] || '' }),
                el('span', { class: 'support-link-text' }, labels[key] || key),
            ));
        }
    }

    const setOpen = open => {
        toggle.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        if (open) render();
    };
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    ctaBtn.addEventListener('click', () => setOpen(true));

    // ----- Gentle, optional donation invite ---------------------------------
    const nudge = $('#support-nudge');
    const nudgeActions = $('#support-nudge-actions');
    const laterBtn = $('#support-later');
    const optoutBtn = $('#support-optout');
    nudge.textContent = L.donateNudge;
    laterBtn.textContent = L.donateLater;
    optoutBtn.textContent = L.donateOptOut;

    const showNudge = on => { nudge.hidden = !on; nudgeActions.hidden = !on; };

    laterBtn.addEventListener('click', () => {
        chrome.storage.local.set({ donateSnoozeUntil: Date.now() + common.donateSnoozeDays * 86400000 });
        showNudge(false);
        setOpen(false);
    });
    optoutBtn.addEventListener('click', () => {
        chrome.storage.local.set({ donateOptOut: true });
        showNudge(false);
        setOpen(false);
    });

    const forceDonate = new URLSearchParams(location.search).get('donate') === '1';
    chrome.storage.local.get(common.donateKeys, d => {
        const now = Date.now();
        if (!d.donateInstalledAt) chrome.storage.local.set({ donateInstalledAt: now });
        // Opening the popup clears the toolbar dot.
        try { chrome.action.setBadgeText({ text: '' }); } catch { /* best-effort; ignore */ }
        try { chrome.runtime.sendMessage({ type: 'donate-seen' }); } catch { /* best-effort; ignore */ }

        if (forceDonate) {
            setOpen(true);
        } else if (common.donateEligible(d, now)) {
            showNudge(true);
            setOpen(true);
            // Simply seeing the invite softly snoozes it for a few days.
            chrome.storage.local.set({ donateSnoozeUntil: now + common.donateSoftSnoozeDays * 86400000 });
        } else {
            render(); // pre-render (PIX QR) so a manual open is instant
        }
    });
}

// --------------------------------------------------------------- Refresh
function refresh() {
    const mode = common.deriveMode(state);
    // Purely presentational hook: expose the derived signal state so CSS can drive
    // the global LIVE↔SYNCED seal (red/pulsing when syncing, gray/still when Off).
    // Reads existing state only — no storage, messages, or behavior touched.
    $('#app').dataset.signal = mode === 'off' ? 'degraded' : 'synced';
    let activeIndex = -1;
    common.modeOrder.forEach((name, i) => {
        const on = name === mode;
        modeCards[name].setAttribute('aria-checked', String(on));
        if (on) activeIndex = i;
    });
    // Keep the group's single tab-stop on the selected mode (first card if none).
    if (rovingModes) rovingModes(activeIndex >= 0 ? activeIndex : 0);
    $('#mode-warning').hidden = true;
    for (const u of updaters) u();
}

// --------------------------------------------------------------- Init
(async function init() {
    const data = await getStorage(common.storage);
    state = resolve(data);
    renderStatic();
    renderModes();
    renderIndicators();
    renderAdvancedToggle();
    renderReset();
    renderSupport();
    refresh();
})();
