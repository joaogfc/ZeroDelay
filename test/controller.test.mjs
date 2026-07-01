// Tests for the catch-up controller (engine/controller.js). It's CommonJS
// (scoped by engine/package.json) so we take the default import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import controllerPkg from '../engine/controller.js';
const { createController } = controllerPkg;

test('exposes WARN_BUFFER for the UI to share one threshold', () => {
    const c = createController();
    assert.equal(typeof c.WARN_BUFFER, 'number');
});

test('non-finite latency or health is safe (1.0x)', () => {
    const c = createController();
    assert.equal(c.calcPlaybackRate(1.25, NaN, 5, 6, false), 1.0);
    assert.equal(c.calcPlaybackRate(1.25, 10, NaN, 6, false), 1.0);
});

test('at/under the live floor (latency < 2s) it rests at 1.0x', () => {
    const c = createController();
    // Even with a fat buffer, there is nothing to gain this close to live.
    assert.equal(c.calcPlaybackRate(1.25, 1.5, 12, 6, false), 1.0);
});

test('healthy buffer above target+band engages catch-up at the given speed', () => {
    const c = createController();
    let rate;
    for (let i = 0; i < 60; i++) rate = c.calcPlaybackRate(1.25, 20, 12, 6, false);
    assert.equal(rate, 1.25);
    assert.equal(c.getState().catching_up, true);
});

test('a dangerously low instantaneous buffer refuses to accelerate', () => {
    const c = createController();
    for (let i = 0; i < 60; i++) c.calcPlaybackRate(1.25, 20, 12, 6, false); // prime a catch-up
    assert.equal(c.calcPlaybackRate(1.25, 20, 1.0, 6, false), 1.0);          // floor guard
});

test('hysteresis: buffer sitting at target never triggers a catch-up', () => {
    const c = createController();
    let rate;
    for (let i = 0; i < 30; i++) rate = c.calcPlaybackRate(1.25, 20, 6, 6, false);
    assert.equal(rate, 1.0);
    assert.equal(c.getState().catching_up, false);
});

test('automatic mode raises the target after a near-stall', () => {
    const c = createController();
    for (let i = 0; i < 50; i++) c.calcPlaybackRate(1.25, 20, 12, 6, true); // calm -> target creeps down
    const before = c.getState().auto_target;
    c.calcPlaybackRate(1.25, 20, 0.5, 6, true);                              // near-stall
    assert.ok(c.getState().auto_target > before,
        `target should rise after a near-stall (${before} -> ${c.getState().auto_target})`);
});

test('draining buffer brakes a catch-up pre-emptively (issue #12, scenario B)', () => {
    const c = createController();
    // A high but STEADILY DRAINING buffer: level stays above target+band the
    // whole time (so the level logic alone would keep accelerating), yet the
    // downward trend means the connection is falling behind -> back off early.
    let rate;
    for (let h = 14; h >= 11; h -= 0.15) rate = c.calcPlaybackRate(1.25, 20, h, 6, false);
    assert.equal(rate, 1.0, 'should refuse to accelerate while the buffer is trending down');
    assert.ok(c.getState().drain_ema < 0, 'drain_ema should be negative on a falling buffer');
});

test('brake releases once the buffer recovers (rising trend resumes catch-up)', () => {
    const c = createController();
    for (let h = 14; h >= 11; h -= 0.15) c.calcPlaybackRate(1.25, 20, h, 6, false); // drain -> braked
    let rate;
    for (let h = 11; h <= 14; h += 0.15) rate = c.calcPlaybackRate(1.25, 20, h, 6, false); // recover
    assert.equal(rate, 1.25, 'a recovering buffer should resume the catch-up');
});

test('a brief buffer dip does not latch the brake forever', () => {
    const c = createController();
    for (let i = 0; i < 60; i++) c.calcPlaybackRate(1.25, 20, 12, 6, false); // steady catch-up
    c.calcPlaybackRate(1.25, 20, 11.6, 6, false);                            // one-tick dip
    let rate;
    for (let i = 0; i < 40; i++) rate = c.calcPlaybackRate(1.25, 20, 12, 6, false); // steady again
    assert.equal(rate, 1.25, 'trend EMA should decay back so the catch-up resumes');
});

test('each controller instance keeps independent state', () => {
    const a = createController();
    const b = createController();
    for (let i = 0; i < 60; i++) a.calcPlaybackRate(1.25, 20, 12, 6, false);
    assert.equal(a.getState().catching_up, true);
    assert.equal(b.getState().catching_up, false); // untouched
});
