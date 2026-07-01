// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)
//
// Pure catch-up controller — the core "how fast should we play to trim latency"
// math, extracted from inject.js so it can be unit-tested without a browser.
//
// Dual-loaded on purpose:
//   • Browser: loaded as a CLASSIC script (before inject.js) and exposes
//     `window.ZeroDelay.createController`. `module` is undefined there, so the
//     CommonJS branch is skipped.
//   • Node/tests: the sibling `engine/package.json` ({"type":"commonjs"}) makes
//     Node treat this file as CommonJS even though the root package is ESM, so
//     `module.exports` works and `window` is undefined.
'use strict';
(function () {
    // Speeding up consumes the buffered-ahead content, pulling the playhead
    // toward real time, which REDUCES live latency. Playing at 1.0x then HOLDS
    // that latency (verified on real streams). So we only need brief catch-ups,
    // not constant acceleration. We watch a SMOOTHED buffer level: while it sits
    // comfortably above the mode's target we speed up; once it falls to the
    // target we stop and rest. Falling behind (a stall) piles buffer up ahead,
    // raising the smoothed level and triggering a fresh, short catch-up. This is
    // self-limiting and naturally adapts to what the connection can sustain.
    function createController() {
        const BUFFER_FLOOR = 1.5;      // never speed up below this (stall protection)
        const BUFFER_BACKOFF = 2.5;    // ease off here...
        const BUFFER_RESUME = 4.0;     // ...and only resume once recovered to this
        const CATCH_UP_BAND = 1.5;     // hysteresis above the target before engaging
        const MIN_LATENCY = 2.0;       // already this close to live -> nothing to gain

        let buffer_headroom_ok = true; // instantaneous-buffer guard state
        let buffer_ema = null;         // smoothed buffer health
        let catching_up = false;       // currently in a catch-up?
        let auto_target = 6.0;         // automatic-mode buffer target
        let auto_cooldown = 0;         // ticks to wait after a near-stall

        function accel_allowed_by_buffer(health) {
            if (!isFinite(health)) return false;
            if (health <= BUFFER_BACKOFF) buffer_headroom_ok = false;
            else if (health >= BUFFER_RESUME) buffer_headroom_ok = true;
            return buffer_headroom_ok;
        }

        // Automatic mode: adapt the buffer target to the connection over time.
        function auto_buffer_target(health) {
            if (isFinite(health) && health < 1.0) {            // a near-stall just happened
                auto_target = Math.min(9.0, auto_target + 1.0);  // back off: keep more buffer
                auto_cooldown = 240;                             // ~60s at 250ms
            } else if (auto_cooldown > 0) {
                auto_cooldown--;
            } else if (buffer_ema !== null && buffer_ema > auto_target + 2.0) {
                auto_target = Math.max(4.0, auto_target - 0.01); // calm -> creep closer to live
            }
            return auto_target;
        }

        // Returns the playback rate to apply this tick: `speed` while catching up,
        // otherwise 1.0 (rest / nothing to gain / buffer too low to risk it).
        function calcPlaybackRate(speed, latency, health, bufferTarget, auto) {
            if (!isFinite(health) || !isFinite(latency)) return 1.0;
            buffer_ema = buffer_ema === null ? health : buffer_ema * 0.9 + health * 0.1;
            if (latency < MIN_LATENCY) return 1.0; // already at the stream's floor

            const target = auto ? auto_buffer_target(health) : bufferTarget;
            if (buffer_ema > target + CATCH_UP_BAND) catching_up = true;
            else if (buffer_ema <= target) catching_up = false;
            if (!catching_up) return 1.0;

            // instantaneous safety guard (prevents deep dips during the catch-up)
            if (health < BUFFER_FLOOR || !accel_allowed_by_buffer(health)) return 1.0;
            return speed;
        }

        // Read-only snapshot of internal state — for tests and diagnostics.
        function getState() {
            return { buffer_ema, catching_up, auto_target, auto_cooldown, buffer_headroom_ok };
        }

        // The buffer level below which the UI should warn (red) — exported so the
        // player indicator and the controller share one source of truth.
        return { calcPlaybackRate, getState, WARN_BUFFER: BUFFER_BACKOFF };
    }

    const api = { createController };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') (window.ZeroDelay = window.ZeroDelay || {}).createController = createController;
}());
