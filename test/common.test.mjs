// Tests for the shared settings/model logic in common.js. Imports cleanly in
// Node because common.js now guards the absent `chrome` global.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as common from '../common.js';

test('deriveMode round-trips every preset', () => {
    for (const name of common.modeOrder) {
        assert.equal(common.deriveMode(common.presets[name]), name, `preset "${name}"`);
    }
});

test('deriveMode returns "custom" for an off-grid combination', () => {
    const custom = { enabled: true, auto: false, bufferTarget: 7.0, playbackRate: 1.25, skip: true, skipThreathold: 30 };
    assert.equal(common.deriveMode(custom), 'custom');
});

test('value() only substitutes the default for null/undefined', () => {
    assert.equal(common.value(undefined, true), true);
    assert.equal(common.value(null, true), true);
    assert.equal(common.value(false, true), false); // false is a real value, keep it
    assert.equal(common.value(0, 5), 0);
});

test('limitValue clamps, defaults and snaps to step', () => {
    // playbackRate config: default 1.25, min 1.05, max 16, step 0.05
    assert.equal(common.limitValue(undefined, 1.25, 1.05, 16, 0.05), 1.25); // missing -> default
    assert.equal(common.limitValue('abc', 1.25, 1.05, 16, 0.05), 1.25);     // NaN -> default
    assert.equal(common.limitValue(0.5, 1.25, 1.05, 16, 0.05), 1.05);       // clamp low
    assert.equal(common.limitValue(99, 1.25, 1.05, 16, 0.05), 16);          // clamp high
    assert.equal(common.limitValue(1.27, 1.25, 1.05, 16, 0.05), 1.25);      // snap to 0.05 grid
});

test('donateEligible gates on usage, opt-out and snooze', () => {
    const now = 1_700_000_000_000;
    const enough = common.donateUsageThreshold;
    assert.equal(common.donateEligible({ donateUsageSeconds: enough }, now), true);
    assert.equal(common.donateEligible({ donateUsageSeconds: enough - 1 }, now), false);
    assert.equal(common.donateEligible({ donateUsageSeconds: enough, donateOptOut: true }, now), false);
    assert.equal(common.donateEligible({ donateUsageSeconds: enough, donateSnoozeUntil: now + 1000 }, now), false);
    assert.equal(common.donateEligible({ donateUsageSeconds: enough, donateSnoozeUntil: now - 1000 }, now), true);
    assert.equal(common.donateEligible(null, now), false);
    assert.equal(common.donateEligible(undefined, now), false);
});

test('calmerMode steps toward more buffer and stops at the calmest', () => {
    assert.equal(common.calmerMode('min'), 'auto');
    assert.equal(common.calmerMode('aggressive'), 'auto');
    assert.equal(common.calmerMode('balanced'), 'auto');
    assert.equal(common.calmerMode('auto'), 'suave');
    assert.equal(common.calmerMode('suave'), null);
    assert.equal(common.calmerMode('off'), null);
});

test('isLiveChat detects only the live-chat popout URLs', () => {
    assert.equal(common.isLiveChat('https://www.youtube.com/live_chat?v=abc'), true);
    assert.equal(common.isLiveChat('https://www.youtube.com/live_chat_replay?v=abc'), true);
    assert.equal(common.isLiveChat('https://www.youtube.com/watch?v=abc'), false);
});

test('emitGoLive writes the go-live nonce under its own key', () => {
    let written = null;
    common.emitGoLive(v => { written = v; }, 12345);
    assert.deepEqual(written, { [common.goLiveSignalKey]: 12345 });
});

test('toggleEnabledAction turns an active mode off and remembers it', () => {
    const r = common.toggleEnabledAction(common.presets.balanced, undefined);
    assert.equal(common.deriveMode(r.apply), 'off');
    assert.equal(r.remember, 'balanced');
});

test('toggleEnabledAction restores the remembered mode when currently off', () => {
    const r = common.toggleEnabledAction(common.presets.off, 'suave');
    assert.equal(common.deriveMode(r.apply), 'suave');
    assert.equal(r.remember, undefined); // nothing to remember while turning on
});

test('toggleEnabledAction falls back to auto when off with no memory', () => {
    assert.equal(common.deriveMode(common.toggleEnabledAction(common.presets.off, undefined).apply), 'auto');
    assert.equal(common.deriveMode(common.toggleEnabledAction(common.presets.off, 'off').apply), 'auto');
    assert.equal(common.deriveMode(common.toggleEnabledAction(common.presets.off, 'bogus').apply), 'auto');
});

test('toggleEnabledAction does not remember an off-grid custom mode', () => {
    const custom = { enabled: true, auto: false, bufferTarget: 7.0, playbackRate: 1.25, skip: true, skipThreathold: 30 };
    const r = common.toggleEnabledAction(custom, undefined);
    assert.equal(common.deriveMode(r.apply), 'off');
    assert.equal(r.remember, undefined);
});
