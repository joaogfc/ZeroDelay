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

test('prefersBrazil detects pt-BR from the UI language OR the accepted-languages list', () => {
    assert.equal(common.prefersBrazil('pt-BR', []), true);                         // UI language
    assert.equal(common.prefersBrazil('pt_BR', []), true);                         // underscore variant
    assert.equal(common.prefersBrazil('en-US', ['en-US', 'pt-BR', 'pt']), true);   // English UI, pt-BR accepted (#21)
    assert.equal(common.prefersBrazil('en-US', ['en-US', 'en']), false);           // no pt-BR anywhere
    assert.equal(common.prefersBrazil('pt-PT', ['pt-PT', 'pt']), false);           // Portugal is not Brazil
    assert.equal(common.prefersBrazil('', ['pt']), false);                         // bare "pt" is ambiguous — needs BR
    assert.equal(common.prefersBrazil('', undefined), false);                      // missing sources
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

test('toggleEnabledAction treats legacy {enabled:false} data as off', () => {
    // Written before presets existed: skip was left at its default (true), so
    // deriveMode reports "custom" — the toggle must still turn playback back ON
    // on the first key press instead of rewriting "off".
    assert.equal(common.deriveMode(common.toggleEnabledAction({ enabled: false }, 'balanced').apply), 'balanced');
    assert.equal(common.deriveMode(common.toggleEnabledAction({ enabled: false }, undefined).apply), 'auto');
});

test('resolveSettings applies defaults, clamps and snaps', () => {
    const s = common.resolveSettings({});
    assert.equal(s.enabled, common.defaultEnabled);
    assert.equal(s.playbackRate, common.defaultPlaybackRate);
    assert.equal(s.bufferTarget, common.defaultBufferTarget);
    assert.equal(s.showEstimation, common.defaultShowEstimation);

    const t = common.resolveSettings({ playbackRate: 99, bufferTarget: 'abc', enabled: false });
    assert.equal(t.playbackRate, common.maxPlaybackRate); // clamped
    assert.equal(t.bufferTarget, common.defaultBufferTarget); // NaN -> default
    assert.equal(t.enabled, false); // real value kept
});

test('detectBrazilMatch fires on a real Brazil matchup title', () => {
    assert.equal(common.detectBrazilMatch('AO VIVO: BRASIL X CROÁCIA | COPA DO MUNDO FIFA™ 2026 | QUARTAS'), true);
    assert.equal(common.detectBrazilMatch('AO VIVO: CROÁCIA X BRASIL | COPA DO MUNDO'), true); // reversed order
    assert.equal(common.detectBrazilMatch('BRASIL VS ARGENTINA | Eliminatórias'), true);       // "vs"
    assert.equal(common.detectBrazilMatch('Brasil x Chile | amistoso'), true);                 // lowercase
    assert.equal(common.detectBrazilMatch('BRASÍL X BOLÍVIA | jogo'), true);                    // stray accent
    assert.equal(common.detectBrazilMatch('AO VIVO: BRASIL × COLÔMBIA | COPA'), true);          // "×" separator
    assert.equal(common.detectBrazilMatch('Brasil e Argentina | Eliminatórias'), true);         // "e" separator
    assert.equal(common.detectBrazilMatch('BRASIL VS. URUGUAI | amistoso'), true);              // "vs." with period
    assert.equal(common.detectBrazilMatch('AO VIVO: ARGENTINA VS. BRASIL'), true);              // reversed + period
});

test('detectBrazilMatch ignores non-Brazil and non-matchup titles', () => {
    assert.equal(common.detectBrazilMatch('AO VIVO: ESPANHA X ÁUSTRIA | COPA DO MUNDO FIFA™ 2026'), false);
    assert.equal(common.detectBrazilMatch('AO VIVO: ESPANHA X ITÁLIA | e a torcida do Brasil vibra'), false); // "brasil" not a team
    assert.equal(common.detectBrazilMatch('ESPANHA X FRANÇA | Brasil assiste de fora'), false);  // brasil only in a later segment
    assert.equal(common.detectBrazilMatch('Melhores momentos da seleção do Brasil'), false);     // no matchup separator
    assert.equal(common.detectBrazilMatch(''), false);
    assert.equal(common.detectBrazilMatch(undefined), false);
    assert.equal(common.detectBrazilMatch(null), false);
});

test('classifyHexaChatMessage scores celebration as +1', () => {
    assert.equal(common.classifyHexaChatMessage('GOL'), 1);
    assert.equal(common.classifyHexaChatMessage('GOOOOOLLLL'), 1);       // stretched
    assert.equal(common.classifyHexaChatMessage('golaço do brasil!'), 1); // accented
    assert.equal(common.classifyHexaChatMessage('É CAMPEÃO'), 1);
    assert.equal(common.classifyHexaChatMessage('vamo brasil 🇧🇷'), 1);
    assert.equal(common.classifyHexaChatMessage('⚽⚽⚽'), 1);            // emoji only
    // A strong GOL wins even when a dismay word is present (disbelief, not a loss).
    assert.equal(common.classifyHexaChatMessage('GOOOL não acredito!!'), 1);
});

test('classifyHexaChatMessage scores pure dismay as -1 (opponent-goal guard)', () => {
    assert.equal(common.classifyHexaChatMessage('não acredito nisso'), -1);
    assert.equal(common.classifyHexaChatMessage('tomamos de novo'), -1);
    assert.equal(common.classifyHexaChatMessage('que vergonha'), -1);
    assert.equal(common.classifyHexaChatMessage('😭😭😭'), -1);
});

test('classifyHexaChatMessage is neutral (0) for off-topic and empty text', () => {
    assert.equal(common.classifyHexaChatMessage('alguém sabe o placar?'), 0);
    assert.equal(common.classifyHexaChatMessage('primeira vez aqui'), 0);
    assert.equal(common.classifyHexaChatMessage(''), 0);
    assert.equal(common.classifyHexaChatMessage(undefined), 0);
});
