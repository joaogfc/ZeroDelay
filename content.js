// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)

import(chrome.runtime.getURL('common.js')).then(common => {
    if (!common.isLiveChat(location.href)) {
        main(common);
        if (window.top === window) {
            initDonation(common);
            initHexa(common);
        }
    }
});

let storageListenersAttached = false;

function main(common) {
    function loadSettings() {
        chrome.storage.local.get(common.storage, data => {
            sendLoadSettingsEvent(common.resolveSettings(data));
        });
    }

    function sendLoadSettingsEvent(settings) {
        const detailObject = {
            ...settings,
            copiedLabel: common.label.supportCopied,
            // Localized aria-labels shipped to the engine (page world has no chrome.i18n).
            a11yLabels: {
                playbackRate: common.label.a11yPlaybackRate,
                latency: common.label.a11yLatency,
                health: common.label.a11yHealth,
                estimation: common.label.a11yEstimation,
                current: common.label.a11yCurrent,
            },
        };
        // Firefox: without cloneInto the page world sees `detail` as null (X-ray
        // vision). Feature-detect the function — UA sniffing breaks under
        // privacy.resistFingerprinting or a user-overridden UA.
        const detail = (typeof cloneInto === 'function') ? cloneInto(detailObject, document.defaultView) : detailObject;
        document.dispatchEvent(new CustomEvent('_live_catch_up_load_settings', { detail }));
    }

    let detect_interval;

    // Reload only when an engine setting actually changed — the donation
    // counter and control keys write storage frequently, and re-sending
    // settings to every YouTube frame on each of those writes is pure churn.
    function onEngineSettingsChanged(changes, area) {
        if (area === 'local' && common.storage.some(k => k in changes)) loadSettings();
    }

    /** Tell the engine (inject.js) to jump to the live edge now. */
    function dispatchGoLive() {
        document.dispatchEvent(new CustomEvent('_live_catch_up_go_live'));
    }

    // Legacy/global signal: still forwarded for compatibility, but the "go-live"
    // shortcut no longer writes it (see background.js) — every tab reacting to
    // this key is exactly the behavior that shortcut was moved away from (PR #16).
    function onGoLiveSignalChanged(changes, area) {
        if (area === 'local' && changes[common.goLiveSignalKey]) dispatchGoLive();
    }

    // Active-tab-only path: background.js sends this directly to the tab the
    // "go-live" shortcut was pressed on (PR #16).
    function onRuntimeMessage(msg) {
        if (msg?.type === 'go-live') dispatchGoLive();
    }

    // Guard against double-registration if the content script re-inits in the
    // same page — listeners would otherwise stack up (PR #17).
    if (!storageListenersAttached) {
        storageListenersAttached = true;
        chrome.storage.onChanged.addListener(onEngineSettingsChanged);
        chrome.storage.onChanged.addListener(onGoLiveSignalChanged);
        chrome.runtime.onMessage.addListener(onRuntimeMessage);
    }

    document.addEventListener('_live_catch_up_init', () => {
        clearInterval(detect_interval);
        let my_interval;
        my_interval = detect_interval = setInterval(() => {
            const player = document.getElementById("movie_player");
            if (!player) {
                return;
            }

            clearInterval(my_interval);
            if (detect_interval === my_interval) detect_interval = null;

            loadSettings();
        }, 500);
    });

    // Top frame only: the offer card must land on the visible page, not inside
    // an iframe's (clipped) body.
    if (window.top === window) {
        document.addEventListener('_live_catch_up_stall', () => onStallDetected(common));
    }

    // Inject the controller first, then the engine. `async = false` preserves
    // execution order for dynamically-inserted scripts, so window.ZeroDelay is
    // ready by the time inject.js runs.
    const injectScript = file => {
        const s = document.createElement('script');
        s.src = chrome.runtime.getURL(file);
        s.async = false;
        s.onload = () => s.remove();
        (document.head || document.documentElement).append(s);
        return s;
    };
    injectScript('engine/controller.js');
    injectScript('inject.js').id = '_live_catch_up';
}

// --------------------------------------------------------------- Donation
// Accumulates active-usage time (top frame only) and shows a single, discreet,
// dismissible coffee invite over YouTube once the user has used it for a while.
// Purely optional — it never blocks or changes playback.
function initDonation(common) {
    const TICK = 60; // seconds

    common.ensureInstalledAt();

    // The engine pings while a live is actually playing; only that time counts as
    // "watching the transmission" (idle browsing on YouTube doesn't accrue usage).
    let lastActive = 0;
    document.addEventListener('_live_catch_up_active', () => { lastActive = Date.now(); });

    setTimeout(() => maybeShowBanner(common), 8000);
    setInterval(() => {
        if (document.hidden || Date.now() - lastActive > 5000) return;
        chrome.storage.local.get(['enabled', 'donateUsageSeconds', 'donateLastCountedAt'], d => {
            if (!common.value(d.enabled, common.defaultEnabled)) return;
            // Every YouTube tab runs this loop; only one may count each minute
            // of wall-clock time, or N tabs would accrue N× the real usage.
            // (5s of slack absorbs timer jitter between the tabs.)
            const now = Date.now();
            if (now - (d.donateLastCountedAt || 0) < (TICK - 5) * 1000) return;
            chrome.storage.local.set({
                donateUsageSeconds: (d.donateUsageSeconds || 0) + TICK,
                donateLastCountedAt: now,
            });
            maybeShowBanner(common);
        });
    }, TICK * 1000);
}

let donationBannerEl = null;

function maybeShowBanner(common) {
    if (donationBannerEl) return;
    chrome.storage.local.get(common.donateKeys, d => {
        if (donationBannerEl || d.donateBannerShown) return;
        if (!common.donateEligible(d, Date.now())) return;
        chrome.storage.local.set({ donateBannerShown: true });
        showDonationBanner(common);
    });
}

// Shared chrome for the two floating cards (donation banner / stall offer):
// same look and lifecycle — CTA + close button, fade in, auto-hide, fade out.
function buildOverlayCard({ side, maxWidth, content, ctaLabel, onCta, closeLabel, autoHideMs, onRemove }) {
    let autoHide;
    let removed = false;

    const card = document.createElement('div');
    card.style.cssText = [
        'position:fixed', 'z-index:2147483646', `${side}:16px`, 'bottom:16px', `max-width:${maxWidth}`,
        'display:flex', 'align-items:center', 'gap:12px', 'padding:13px 15px', 'border-radius:12px',
        'background:#1c1c1c', 'color:#f1f1f1', 'border:1px solid #3a3a3a',
        'box-shadow:0 10px 30px rgba(0,0,0,.45)',
        'font:500 13px/1.4 Roboto,"Segoe UI",system-ui,sans-serif',
        'opacity:0', 'transform:translateY(8px)', 'transition:opacity .25s,transform .25s',
    ].join(';');

    const cta = document.createElement('button');
    cta.textContent = ctaLabel;
    cta.style.cssText = 'flex:none;cursor:pointer;border:0;border-radius:999px;padding:8px 14px;'
        + 'font:600 12px Roboto,system-ui,sans-serif;background:#ff0033;color:#fff';

    const close = document.createElement('button');
    close.textContent = '✕';
    close.setAttribute('aria-label', closeLabel);
    close.style.cssText = 'flex:none;cursor:pointer;border:0;background:transparent;color:#aaa;font-size:14px;padding:2px 4px';

    const remove = () => {
        if (removed) return;
        removed = true;
        clearTimeout(autoHide);
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
        setTimeout(() => card.remove(), 250);
        onRemove();
    };

    cta.addEventListener('click', () => { onCta(); remove(); });
    close.addEventListener('click', remove);

    card.append(content, cta, close);
    document.body.append(card);
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
    autoHide = setTimeout(remove, autoHideMs);
    return card;
}

function showDonationBanner(common) {
    const L = common.label;
    const text = document.createElement('span');
    text.textContent = L.donateBannerText;
    text.style.cssText = 'flex:1;min-width:0';

    donationBannerEl = buildOverlayCard({
        side: 'right', maxWidth: '300px', content: text,
        ctaLabel: L.donateBannerCta,
        onCta: () => chrome.runtime.sendMessage({ type: 'donate-open' }),
        closeLabel: L.donateBannerClose,
        autoHideMs: 15000,
        onRemove: () => { donationBannerEl = null; },
    });
}

// --------------------------------------------------------------- Stall offer
// When the engine reports repeated stalls, offer (once per page) a one-tap
// switch to a calmer mode that keeps more buffer — curbing "it keeps freezing"
// misuse of an over-aggressive mode. The extension keeps working regardless.
let stallOfferEl = null;
let stallOfferShown = false;

function onStallDetected(common) {
    if (stallOfferShown || stallOfferEl) return;
    chrome.storage.local.get(common.storage, data => {
        const target = common.calmerMode(common.deriveMode(data));
        if (!target) return; // already on the calmest mode (or off)
        showStallOffer(common, target);
    });
}

function showStallOffer(common, target) {
    if (stallOfferEl) return;
    stallOfferShown = true;
    const L = common.label;

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0';
    const title = document.createElement('div');
    title.textContent = L.stallTitle;
    title.style.cssText = 'font-weight:700';
    const desc = document.createElement('div');
    desc.textContent = L.stallDesc;
    desc.style.cssText = 'font-size:12px;color:#bbb;margin-top:2px';
    body.append(title, desc);

    stallOfferEl = buildOverlayCard({
        side: 'left', maxWidth: '330px', content: body,
        ctaLabel: `${L.stallSwitch} ${common.modeMeta[target].title}`,
        onCta: () => chrome.storage.local.set(common.presets[target]),
        closeLabel: L.donateBannerClose,
        autoHideMs: 14000,
        onRemove: () => { stallOfferEl = null; },
    });
}

// --------------------------------------------------------------- MODO HEXA
// Top-frame-only. Reskins the whole YouTube page green/yellow while a live
// Brazil match is on screen, and reverts otherwise. The engine (inject.js,
// page world) reports the current video via `_live_catch_up_video_meta`; here
// (isolated world) we decide and apply — the theme CSS lives in hexa/theme.js
// and toggles behind a single <html> class, so this only flips a boolean.
async function initHexa(common) {
    let hexa = null;       // set once hexa/theme.js loads
    let meta = { title: '', isLive: false, video_id: '' };
    let override = null;   // null = auto (detect), true = force on, false = force off
    let applied = false;

    const autoActive = () => meta.isLive && common.detectBrazilMatch(meta.title);
    const shouldTheme = () => (override === null ? autoActive() : override);

    function reevaluate() {
        if (!hexa) return; // buffer decisions until the theme module is ready
        const want = shouldTheme();
        if (want === applied) return;
        applied = want;
        hexa.setActive(want);
    }

    // Attach listeners SYNCHRONOUSLY (before the await): the engine dedupes its
    // meta dispatches, so a meta emitted while the module is still loading must
    // not be missed — we buffer it into `meta` and apply once hexa is ready.
    document.addEventListener('_live_catch_up_video_meta', e => {
        const d = e.detail;
        if (!d) return;
        // The manual override is scoped to the current video ("na aba"): moving
        // to a new video clears it so auto-detection takes back over.
        if (d.video_id !== meta.video_id) override = null;
        meta = { title: d.title || '', isLive: !!d.isLive, video_id: d.video_id || '' };
        reevaluate();
    });

    // Manual escape hatch: a keyboard command (default Alt+Shift+H, remappable at
    // chrome://extensions/shortcuts) flips the theme on/off over whatever auto
    // decided, for this tab. Routed via the browser-level commands API + the
    // background worker — a content-script keydown is unreliable for Alt+Shift,
    // which Windows also consumes to switch keyboard layout.
    chrome.runtime.onMessage.addListener(msg => {
        if (msg?.type === 'toggle-hexa') {
            override = !applied;
            reevaluate();
        }
    });

    try {
        hexa = await import(chrome.runtime.getURL('hexa/theme.js'));
    } catch {
        return; // theme module missing — engine keeps working, just no theme
    }
    hexa.install();  // insert the dormant <style> once
    reevaluate();    // apply whatever meta arrived while the module was loading
}
