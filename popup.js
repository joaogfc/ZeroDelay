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
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v === true) node.setAttribute(k, '');
        else if (v !== false && v != null) node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
}

const getStorage = keys => new Promise(res => chrome.storage.local.get(keys, res));

// --------------------------------------------------------------- Icons
const ICONS = {
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v9"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/></svg>',
    suave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6z"/></svg>',
    balanced: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18a8 8 0 0 1 16 0"/><path d="M12 18l4.5-5"/></svg>',
    aggressive: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5l8 7-8 7zM13 5l8 7-8 7z"/></svg>',
    min: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13.5H10l-1 8.5L19.5 10H14z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9z"/><path d="M5.5 15l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg>',
    wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.5c5.8-5 14.2-5 20 0"/><path d="M5 12c3.8-3.3 10.2-3.3 14 0"/><path d="M8.5 15.5c2-1.7 5-1.7 7 0"/><circle cx="12" cy="19" r="0.6" fill="currentColor"/></svg>',
    gain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></svg>',
    bmc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M7 2.5c-.5 1 .5 1.5 0 2.5M11 2.5c-.5 1 .5 1.5 0 2.5M15 2.5c-.5 1 .5 1.5 0 2.5"/></svg>',
};

// --------------------------------------------------------------- State
let state = {};
const updaters = [];          // fn() -> sync a control's display
const modeCards = {};         // mode name -> card element

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
                    qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, scalable: true });
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
            }, 'R$ ' + value);
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
    for (const [name, card] of Object.entries(modeCards)) {
        card.setAttribute('aria-checked', String(name === mode));
    }
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
