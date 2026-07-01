// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)
//
// Minimal MV3 service worker: records the install time and, once the user has
// used the extension for a while, shows a tiny optional "support available" dot
// on the toolbar icon. It never changes how the extension works.

import * as common from './common.js';

const BADGE_TEXT = '•';
const BADGE_COLOR = '#ff2d52';

function ensureInstalledAt() {
    chrome.storage.local.get(['donateInstalledAt'], d => {
        if (!d.donateInstalledAt) chrome.storage.local.set({ donateInstalledAt: Date.now() });
    });
}

function evalBadge() {
    chrome.storage.local.get(common.donateKeys, d => {
        if (common.donateEligible(d, Date.now())) {
            chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
            chrome.action.setBadgeText({ text: BADGE_TEXT });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    });
}

function boot() {
    ensureInstalledAt();
    chrome.alarms.create('donate-eval', { periodInMinutes: 30 });
    evalBadge();
}

chrome.runtime.onInstalled.addListener(boot);
chrome.runtime.onStartup.addListener(boot);


chrome.alarms.onAlarm.addListener(a => {
    if (a.name === 'donate-eval') evalBadge();
});

// Usage time / snooze / opt-out changes should update the dot promptly.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && common.donateKeys.some(k => k in changes)) evalBadge();
});

chrome.runtime.onMessage.addListener(msg => {
    if (!msg) return;
    if (msg.type === 'donate-open') {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?donate=1') });
    } else if (msg.type === 'donate-seen') {
        chrome.action.setBadgeText({ text: '' });
    }
});

/**
 * Handle a keyboard command. The engine only reads `chrome.storage`, so each
 * shortcut writes storage and content.js/inject.js react to the change.
 * @param {'toggle-enabled'|'go-live'} command - Command id from the manifest.
 */
function onCommand(command) {
    if (command === 'toggle-enabled') {
        chrome.storage.local.get([...common.storage, common.lastModeKey], data => {
            const { apply, remember } = common.toggleEnabledAction(data, data[common.lastModeKey]);
            const patch = { ...apply };
            if (remember) patch[common.lastModeKey] = remember;
            chrome.storage.local.set(patch);
        });
    } else if (command === 'go-live') {
        common.emitGoLive(v => chrome.storage.local.set(v));
    }
}

if (chrome.commands?.onCommand) chrome.commands.onCommand.addListener(onCommand);
