// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)

import(chrome.runtime.getURL('common.js')).then(common => {
    if (!common.isLiveChat(location.href)) {
        main(common);
        if (window.top === window) initDonation(common);
    }
});


function main(common) {
    function loadSettings() {
        chrome.storage.local.get(common.storage, data => {
            const enabled = common.value(data.enabled, common.defaultEnabled);
            const playbackRate = common.limitValue(data.playbackRate, common.defaultPlaybackRate, common.minPlaybackRate, common.maxPlaybackRate, common.stepPlaybackRate);
            const showPlaybackRate = common.value(data.showPlaybackRate, common.defaultShowPlaybackRate);
            const showLatency = common.value(data.showLatency, common.defaultShowLatency);
            const showHealth = common.value(data.showHealth, common.defaultShowHealth);
            const showEstimation = common.value(data.showEstimation, common.defaultShowEstimation);
            const showCurrent = common.value(data.showCurrent, common.defaultShowCurrent);
            const bufferTarget = common.limitValue(data.bufferTarget, common.defaultBufferTarget, common.minBufferTarget, common.maxBufferTarget, common.stepBufferTarget);
            const auto = common.value(data.auto, common.defaultAuto);
            const skip = common.value(data.skip, common.defaultSkip);
            const skipThreathold = common.value(data.skipThreathold, common.defaultSkipThreathold);

            sendLoadSettingsEvent(enabled, playbackRate, showPlaybackRate, showLatency, showHealth, showEstimation, showCurrent, bufferTarget, auto, skip, skipThreathold);
        });
    }

    function sendLoadSettingsEvent(enabled, playbackRate, showPlaybackRate, showLatency, showHealth, showEstimation, showCurrent, bufferTarget, auto, skip, skipThreathold) {
        const detailObject = {
            enabled,
            playbackRate,
            showPlaybackRate,
            showLatency,
            showHealth,
            showEstimation,
            showCurrent,
            bufferTarget,
            auto,
            skip,
            skipThreathold,
            copiedLabel: common.label.supportCopied,
        };
        const detail = navigator.userAgent.includes('Firefox') ? cloneInto(detailObject, document.defaultView) : detailObject;
        document.dispatchEvent(new CustomEvent('_live_catch_up_load_settings', { detail }));
    }

    let detect_interval;

    chrome.storage.onChanged.addListener(loadSettings);

    // Forward the "jump to live" storage signal to the engine. Any change to the
    // nonce means "seek to live now"; the value itself is irrelevant.
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[common.goLiveSignalKey]) {
            document.dispatchEvent(new CustomEvent('_live_catch_up_go_live'));
        }
    });

    document.addEventListener('_live_catch_up_init', () => {
        clearInterval(detect_interval);
        detect_interval = setInterval(() => {
            const player = document.getElementById("movie_player");
            if (!player) {
                return;
            }

            clearInterval(detect_interval);

            loadSettings();
        }, 500);
    });

    document.addEventListener('_live_catch_up_stall', () => onStallDetected(common));

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

    chrome.storage.local.get(['donateInstalledAt'], d => {
        if (!d.donateInstalledAt) chrome.storage.local.set({ donateInstalledAt: Date.now() });
    });

    // The engine pings while a live is actually playing; only that time counts as
    // "watching the transmission" (idle browsing on YouTube doesn't accrue usage).
    let lastActive = 0;
    document.addEventListener('_live_catch_up_active', () => { lastActive = Date.now(); });

    setTimeout(() => maybeShowBanner(common), 8000);
    setInterval(() => {
        if (document.hidden || Date.now() - lastActive > 5000) return;
        chrome.storage.local.get(['enabled', 'donateUsageSeconds'], d => {
            if (!common.value(d.enabled, common.defaultEnabled)) return;
            chrome.storage.local.set({ donateUsageSeconds: (d.donateUsageSeconds || 0) + TICK });
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

function showDonationBanner(common) {
    const L = common.label;
    let autoHide;

    const card = document.createElement('div');
    card.style.cssText = [
        'position:fixed', 'z-index:2147483646', 'right:16px', 'bottom:16px', 'max-width:300px',
        'display:flex', 'align-items:center', 'gap:10px', 'padding:12px 14px', 'border-radius:12px',
        'background:#1c1c1c', 'color:#f1f1f1', 'border:1px solid #3a3a3a',
        'box-shadow:0 10px 30px rgba(0,0,0,.45)',
        'font:500 13px/1.4 Roboto,"Segoe UI",system-ui,sans-serif',
        'opacity:0', 'transform:translateY(8px)', 'transition:opacity .25s,transform .25s',
    ].join(';');

    const text = document.createElement('span');
    text.textContent = L.donateBannerText;
    text.style.cssText = 'flex:1;min-width:0';

    const cta = document.createElement('button');
    cta.textContent = L.donateBannerCta;
    cta.style.cssText = 'flex:none;cursor:pointer;border:0;border-radius:999px;padding:7px 14px;'
        + 'font:600 12px Roboto,system-ui,sans-serif;background:#ff0033;color:#fff';

    const close = document.createElement('button');
    close.textContent = '✕';
    close.setAttribute('aria-label', L.donateBannerClose);
    close.style.cssText = 'flex:none;cursor:pointer;border:0;background:transparent;color:#aaa;font-size:14px;padding:2px 4px';

    const remove = () => {
        if (!donationBannerEl) return;
        donationBannerEl = null;
        clearTimeout(autoHide);
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
        setTimeout(() => card.remove(), 250);
    };

    cta.addEventListener('click', () => { chrome.runtime.sendMessage({ type: 'donate-open' }); remove(); });
    close.addEventListener('click', remove);

    card.append(text, cta, close);
    document.body.append(card);
    donationBannerEl = card;
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
    autoHide = setTimeout(remove, 15000);
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
    let autoHide;

    const card = document.createElement('div');
    card.style.cssText = [
        'position:fixed', 'z-index:2147483646', 'left:16px', 'bottom:16px', 'max-width:330px',
        'display:flex', 'align-items:center', 'gap:12px', 'padding:13px 15px', 'border-radius:12px',
        'background:#1c1c1c', 'color:#f1f1f1', 'border:1px solid #3a3a3a',
        'box-shadow:0 10px 30px rgba(0,0,0,.45)',
        'font:500 13px/1.4 Roboto,"Segoe UI",system-ui,sans-serif',
        'opacity:0', 'transform:translateY(8px)', 'transition:opacity .25s,transform .25s',
    ].join(';');

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0';
    const title = document.createElement('div');
    title.textContent = L.stallTitle;
    title.style.cssText = 'font-weight:700';
    const desc = document.createElement('div');
    desc.textContent = L.stallDesc;
    desc.style.cssText = 'font-size:12px;color:#bbb;margin-top:2px';
    body.append(title, desc);

    const cta = document.createElement('button');
    cta.textContent = `${L.stallSwitch} ${common.modeMeta[target].title}`;
    cta.style.cssText = 'flex:none;cursor:pointer;border:0;border-radius:999px;padding:8px 14px;'
        + 'font:600 12px Roboto,system-ui,sans-serif;background:#ff0033;color:#fff';

    const close = document.createElement('button');
    close.textContent = '✕';
    close.setAttribute('aria-label', L.donateBannerClose);
    close.style.cssText = 'flex:none;cursor:pointer;border:0;background:transparent;color:#aaa;font-size:14px;padding:2px 4px';

    const remove = () => {
        if (!stallOfferEl) return;
        stallOfferEl = null;
        clearTimeout(autoHide);
        card.style.opacity = '0';
        card.style.transform = 'translateY(8px)';
        setTimeout(() => card.remove(), 250);
    };

    cta.addEventListener('click', () => { chrome.storage.local.set(common.presets[target]); remove(); });
    close.addEventListener('click', remove);

    card.append(body, cta, close);
    document.body.append(card);
    stallOfferEl = card;
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
    autoHide = setTimeout(remove, 14000);
}
