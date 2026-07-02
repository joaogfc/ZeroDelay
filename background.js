// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)
//
// Minimal MV3 service worker: records the install time and, once the user has
// used the extension for a while, shows a tiny optional "support available" dot
// on the toolbar icon. It never changes how the extension works.

import * as common from './common.js';

const BADGE_TEXT = '•';
const BADGE_COLOR = '#ff2d52';

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
    common.ensureInstalledAt();
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
 * Send a one-off message to the active tab only. Any failure (no active tab,
 * not a YouTube tab, no content script listening) is swallowed — the shortcut
 * simply does nothing rather than falling back to a global signal.
 * @param {string} type - Message type the content script listens for.
 */
function messageActiveTab(type) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tab = tabs?.[0];
        if (!tab?.id) return;
        chrome.tabs.sendMessage(tab.id, { type }, () => {
            void chrome.runtime.lastError; // no listener on that tab — ignore
        });
    });
}

/**
 * Handle a keyboard command. `toggle-enabled` writes storage, which every open
 * tab's content script reacts to. `go-live` and `toggle-hexa` are scoped to the
 * active tab only, sent directly via chrome.tabs.sendMessage (see messageActiveTab).
 * @param {'toggle-enabled'|'go-live'|'toggle-hexa'} command - Command id from the manifest.
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
        messageActiveTab('go-live');
    } else if (command === 'toggle-hexa') {
        messageActiveTab('toggle-hexa');
    }
}

if (chrome.commands?.onCommand) chrome.commands.onCommand.addListener(onCommand);
