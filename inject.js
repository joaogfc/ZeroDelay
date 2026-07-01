// ZeroDelay — keep YouTube live streams in real time
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)

(() => {
    function update_playbackRate(playbackRate) {
        const video = video_instance();
        if (video) {
            button_playbackrate.innerHTML = HTMLPolicy.createHTML(`<span translate="no">${video.playbackRate.toFixed(2)}x</span>`);

            if (video.playbackRate === playbackRate) {
                button_playbackrate.style.color = '#ff8983';
            } else {
                button_playbackrate.style.color = '#eee';
            }

            button_playbackrate.style.display = 'inline-block';
        } else {
            button_playbackrate.style.display = 'none';
        }
    }

    function hide_playbackRate() {
        button_playbackrate.style.display = 'none';
    }

    function update_latency(latency, isAtLiveHead) {
        if (isAtLiveHead) {
            button_latency.innerHTML = HTMLPolicy.createHTML(`<span translate="no">${latency.toFixed(2)}s</span>`);
        } else {
            button_latency.innerHTML = HTMLPolicy.createHTML(`<span translate="no">(DVR)</span>`);
        }

        button_latency.style.display = 'inline-block';
    }

    function hide_latency() {
        button_latency.style.display = 'none';
    }

    function update_health(health) {
        button_health.innerHTML = HTMLPolicy.createHTML(`<span translate="no">${health.toFixed(2)}s</span>`);

        // Warn (red) when the buffer is running low.
        if (health < BUFFER_BACKOFF) {
            button_health.style.color = '#ff8983';
        } else {
            button_health.style.color = '#eee';
        }

        button_health.style.display = 'inline-block';
    }

    function hide_health() {
        button_health.style.display = 'none';
    }

    function update_estimation(seekableEnd, current, isAtLiveHead) {
        addWithLimit(seekableEnds, seekableEnd);
        const streamHasProbablyEnded = allElementsEqual(seekableEnds);
        const video = video_instance();
        const estimated_seconds = (seekableEnd - current) / (streamHasProbablyEnded ? video.playbackRate : video.playbackRate - 1.0);
        if (!isAtLiveHead && isFinite(estimated_seconds)) {
            const estimated_time = new Date(Date.now() + estimated_seconds * 1000.0).toLocaleTimeString();
            button_estimation.innerHTML = HTMLPolicy.createHTML(`<span translate="no">(${estimated_time})</span>`);
            button_estimation.style.display = 'inline-block';
        } else {
            button_estimation.style.display = 'none';
        }
    }

    function hide_estimation() {
        button_estimation.style.display = 'none';
    }

    function update_current(current, seekableEnd, isAtLiveHead, videoId) {
        const current_time = isFinite(current) ? format_time(current) : '--:--';

        if (isAtLiveHead) {
            button_current.innerHTML = HTMLPolicy.createHTML(`<span translate="no">${current_time}</span>`);
        } else {
            const seekableEnd_time = isFinite(seekableEnd) ? format_time(seekableEnd) : '--:--';
            button_current.innerHTML = HTMLPolicy.createHTML(`<span translate="no">${current_time} / ${seekableEnd_time}</span>`);
        }

        const current_time_url = addParamsToUrl('https://www.youtube.com/watch', { v: videoId, t: format_time_hms(current) });
        button_current.setAttribute('current', `${current_time_url}#\n${current_time}`);

        button_current.style.display = 'inline-block';
    }

    function hide_current() {
        button_current.style.display = 'none';
    }

    // --- Playback-rate controller -------------------------------------------
    // IMPORTANT: modern YouTube live (SABR / "manifestless") REVERTS direct
    // `video.playbackRate` changes within ~250ms, so the only reliable way to
    // speed up is the player API `setPlaybackRate()`. We remember the rate we
    // applied; if the player's rate diverges we assume the viewer changed it and
    // yield to them, re-engaging once they go back to 1.0x.
    let applied_rate = 1.0;
    let yielded_to_user = false;

    function apply_playback_rate(desired) {
        if (!player?.setPlaybackRate || !player?.getPlaybackRate) return;
        const cur = player.getPlaybackRate();
        if (Math.abs(cur - applied_rate) > 0.01) {
            if (Math.abs(cur - 1.0) < 0.01) {
                applied_rate = 1.0;      // reset to 1.0 (YouTube reset or viewer) -> re-engage
                yielded_to_user = false;
            } else {
                yielded_to_user = true;  // viewer picked a specific speed -> yield
                applied_rate = cur;
            }
        }
        if (yielded_to_user) return;
        if (Math.abs(desired - applied_rate) > 0.01) {
            player.setPlaybackRate(desired);
            applied_rate = desired;
        }
    }

    function set_playbackRate(speed, latency, health, bufferTarget, auto) {
        apply_playback_rate(calc_playbackRate(speed, latency, health, bufferTarget, auto));
    }

    function reset_playbackRate() {
        if (applied_rate !== 1.0 && !yielded_to_user) {
            apply_playback_rate(1.0);
        }
    }

    // --- Buffer-aware catch-up ----------------------------------------------
    // Speeding up consumes the buffered-ahead content, pulling the playhead
    // toward real time, which REDUCES live latency. Playing at 1.0x then HOLDS
    // that latency (verified on real streams). So we only need brief catch-ups,
    // not constant acceleration. We watch a SMOOTHED buffer level: while it sits
    // comfortably above the mode's target we speed up; once it falls to the
    // target we stop and rest. Falling behind (a stall) piles buffer up ahead,
    // raising the smoothed level and triggering a fresh, short catch-up. This is
    // self-limiting and naturally adapts to what the connection can sustain.
    const BUFFER_FLOOR = 1.5;      // never speed up below this (stall protection)
    const BUFFER_BACKOFF = 2.5;    // ease off here...
    const BUFFER_RESUME = 4.0;     // ...and only resume once recovered to this
    const CATCH_UP_BAND = 1.5;     // hysteresis above the target before engaging
    const MIN_LATENCY = 2.0;       // already this close to live -> nothing to gain
    let buffer_headroom_ok = true; // instantaneous-buffer guard state
    let buffer_ema = null;         // smoothed buffer health
    let catching_up = false;       // currently in a catch-up?

    function accel_allowed_by_buffer(health) {
        if (!isFinite(health)) return false;
        if (health <= BUFFER_BACKOFF) buffer_headroom_ok = false;
        else if (health >= BUFFER_RESUME) buffer_headroom_ok = true;
        return buffer_headroom_ok;
    }

    // Automatic mode: adapt the buffer target to the connection over time.
    let auto_target = 6.0;
    let auto_cooldown = 0;
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

    function calc_playbackRate(speed, latency, health, bufferTarget, auto) {
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

    function calc_threathold() {
        if (player) {
            return (player.getVideoStats ? player.getVideoStats().segduration : calc_segduration());
        } else {
            return 5.0;
        }
    }

    function calc_segduration() {
        if (player) {
            const latencyClass = player.getPlayerResponse ? player.getPlayerResponse().videoDetails.latencyClass : 'MDE_STREAM_OPTIMIZATIONS_RENDERER_LATENCY_UNKNOWN';
            switch (latencyClass) {
                case 'MDE_STREAM_OPTIMIZATIONS_RENDERER_LATENCY_ULTRA_LOW':
                    return 1.0;
                case 'MDE_STREAM_OPTIMIZATIONS_RENDERER_LATENCY_LOW':
                    return 2.0;
                default:
                    return 5.0;
            }
        } else {
            return 5.0;
        }
    }

    function onPlaybackRateChange() {
        document.dispatchEvent(new CustomEvent('_live_catch_up_onPlaybackRateChange'));
    }

    function skip_if_over_threathold(latency, skipThreathold) {
        if (!caps?.seekLive || !caps?.stateObject) return;
        if (player && latency >= skipThreathold) {
            if (player.getPlayerStateObject()?.isPlaying) {
                player.seekToLiveHead();
                if (caps.playVideo) player.playVideo();
            }
        }
    }

    function video_instance() {
        if (!video?.parentNode && player) {
            video = player.querySelector('video.html5-main-video');
        }
        return video;
    }

    function format_time(seconds) {
        const hs = Math.floor(seconds / 3600.0);
        const ms = Math.floor((seconds % 3600) / 60.0);
        const ss = Math.floor(seconds % 60);

        const h = hs > 0 ? `${String(hs)}:` : '';
        const m = String(ms).padStart(hs > 0 ? 2 : 1, '0');
        const s = String(ss).padStart(2, '0');

        return `${h}${m}:${s}`;
    }

    function format_time_hms(seconds) {
        const hs = Math.floor(seconds / 3600.0);
        const ms = Math.floor((seconds % 3600) / 60.0);
        const ss = Math.floor(seconds % 60);

        const h = hs > 0 ? `${String(hs)}h` : '';
        const m = String(ms).padStart(hs > 0 ? 2 : 1, '0');
        const s = String(ss).padStart(2, '0');

        return `${h}${m}m${s}s`;
    }

    function addWithLimit(arr, newElement, limit = 5) {
        arr.push(newElement);
        if (arr.length > limit) {
            arr.splice(0, arr.length - limit);
        }
        return arr;
    }

    function allElementsEqual(arr, limit = 5) {
        if (arr.length < limit) return false;
        return arr.every(el => el === arr[0]);
    }

    function addParamsToUrl(url, params) {
        const urlObj = new URL(url);
        for (const [key, value] of Object.entries(params)) {
            urlObj.searchParams.set(key, value);
        }
        return urlObj.toString();
    }

    function create_elem(elem_name, elem_classes) {
        const elem = document.createElement(elem_name);
        elem.classList.add(...elem_classes);
        elem.style.display = 'none';
        elem.style.cursor = 'default';
        elem.style.textAlign = 'center';
        elem.style.width = 'auto';
        elem.style.height = 'auto';
        elem.style.color = '#eee';
        elem.style.fontWeight = 'normal';
        elem.style.paddingLeft = '8px';
        elem.style.paddingRight = '8px';
        return elem;
    }

    const HTMLPolicy = window.trustedTypes ? window.trustedTypes.createPolicy("_live_catch_up_HTMLPolicy", { createHTML: (string) => string }) : { createHTML: (string) => string };

    const button_playbackrate = create_elem('button', ['_live_catch_up_playbackrate', 'ytp-button']);

    const button_latency = create_elem('button', ['_live_catch_up_latency', 'ytp-button']);

    const button_health = create_elem('button', ['_live_catch_up_health', 'ytp-button']);

    const button_estimation = create_elem('button', ['_live_catch_up_estimation', 'ytp-button']);

    const msg_current = create_elem('button', ['_live_catch_up_msg_current', 'ytp-button']);
    msg_current.innerHTML = HTMLPolicy.createHTML(`<span translate="no">Copied!</span>`);
    msg_current.style.position = 'fixed';

    const button_current = create_elem('button', ['_live_catch_up_current', 'ytp-button']);
    button_current.addEventListener('click', () => {
        navigator.clipboard.writeText(button_current.getAttribute('current'));

        msg_current.style.translate = '-32px -16px';
        msg_current.style.display = 'inline-block';

        clearTimeout(msg_current_timeout);
        msg_current_timeout = setTimeout(() => {
            msg_current.style.display = 'none';
        }, 4000);
    });

    let player;
    let video;
    let interval;
    let interval_count = 0;
    let seekableEnds = [];
    let msg_current_timeout;
    let showCurrent;
    let current_settings;
    let last_active_ping = 0;

    // --- Resilience state (R1/R2/R3) ----------------------------------------
    // The engine drives entirely off UNDOCUMENTED player methods. `caps` records
    // which ones actually exist (probed once per attach); the hot loop is guarded
    // so a YouTube-side refactor degrades gracefully instead of throwing 4x/sec.
    let caps = null;              // probed player capabilities (or null)
    let engine_degraded = false;  // gave up until the next navigation
    let tick_errors = 0;          // consecutive errors in the hot loop
    let bound_video = null;       // video element we've attached listeners to
    let detect_interval = null;   // player-detection poll (managed by start_detection)
    const MAX_TICK_ERRORS = 8;    // ~2s of failures in a row before giving up

    // --- Stall watchdog ------------------------------------------------------
    // If the live keeps buffering while the extension is enabled, the chosen
    // mode is probably too aggressive for this connection. We notify the content
    // script, which offers a one-tap switch to a calmer, more-buffered mode.
    let stall_times = [];
    let last_stall = 0;
    let stall_cooldown_until = 0;
    function on_video_waiting() {
        if (!current_settings?.enabled) return;
        const now = Date.now();
        if (now < stall_cooldown_until || now - last_stall < 5000) return;
        last_stall = now;
        stall_times = stall_times.filter(t => now - t < 90000);
        stall_times.push(now);
        if (stall_times.length >= 2) {
            stall_times = [];
            stall_cooldown_until = now + 300000; // ~5 min before offering again
            document.dispatchEvent(new CustomEvent('_live_catch_up_stall'));
        }
    }

    // --- Resilience helpers (R1/R3) -----------------------------------------
    // Probe the private player API surface once, so a missing method is a known
    // "skip that feature" instead of a per-tick exception.
    function probe_caps(p) {
        const has = name => typeof p?.[name] === 'function';
        return {
            stats: has('getStatsForNerds'),
            progress: has('getProgressState'),
            videoData: has('getVideoData'),
            setRate: has('setPlaybackRate'),
            getRate: has('getPlaybackRate'),
            seekLive: has('seekToLiveHead'),
            playVideo: has('playVideo'),
            stateObject: has('getPlayerStateObject'),
        };
    }

    function hideAllIndicators() {
        hide_playbackRate();
        hide_latency();
        hide_health();
        hide_estimation();
        hide_current();
    }

    // Give up until the next navigation, once, without spamming the console. A
    // fresh (re)attach — initial load or SPA nav — clears this and retries.
    function degrade(reason) {
        if (engine_degraded) return;
        engine_degraded = true;
        clearInterval(interval);
        hideAllIndicators();
        console.warn(`[ZeroDelay] Paused: the YouTube player API looks different (${reason}). It will retry on the next video/navigation.`);
    }

    // One iteration of the hot loop, always called inside guarded_tick's
    // try/catch. Every private-API call is gated by `caps`; when the stats say
    // this isn't a catch-up-able live, indicators are hidden (never left stale).
    function run_tick(settings) {
        if (!caps || !caps.stats) { degrade('getStatsForNerds missing'); return; }

        const stats_for_nerds = player.getStatsForNerds();
        if (!stats_for_nerds || stats_for_nerds.live_latency_style !== '') {
            hideAllIndicators();
            return;
        }

        const latency = Number.parseFloat(stats_for_nerds.live_latency_secs);
        const health = Number.parseFloat(stats_for_nerds.buffer_health_seconds);
        const progress_state = caps.progress ? player.getProgressState() : null;

        // Throttled "watching a live" ping — drives usage tracking in the
        // content script (so only real live time counts).
        const active_now = Date.now();
        if (active_now - last_active_ping > 2000) {
            last_active_ping = active_now;
            document.dispatchEvent(new CustomEvent('_live_catch_up_active'));
        }

        if (caps.setRate && caps.getRate) {
            settings.enabled
                ? set_playbackRate(settings.playbackRate, latency, health, settings.bufferTarget, settings.auto)
                : reset_playbackRate();
        }

        if (settings.skip) {
            skip_if_over_threathold(latency, settings.skipThreathold);
        }

        const want_update = interval_count++ % 4 === 0;
        settings.showPlaybackRate ? update_playbackRate(settings.playbackRate) : hide_playbackRate();
        if (progress_state) {
            settings.showLatency ? (want_update && update_latency(latency, progress_state.isAtLiveHead)) : hide_latency();
            settings.showHealth ? (want_update && update_health(health)) : hide_health();
            settings.showEstimation ? (want_update && update_estimation(progress_state.seekableEnd, progress_state.current, progress_state.isAtLiveHead)) : hide_estimation();
            settings.showCurrent ? update_current(progress_state.current, progress_state.seekableEnd, progress_state.isAtLiveHead, caps.videoData ? player.getVideoData()?.video_id : undefined) : hide_current();
        } else {
            hide_latency();
            hide_health();
            hide_estimation();
            hide_current();
        }
    }

    // Guards the 4x/second loop: a single YouTube-side change can't spin
    // exceptions forever — after MAX_TICK_ERRORS in a row we stop and wait for
    // the next navigation to retry (see degrade / detect_and_attach).
    function guarded_tick() {
        if (!player || engine_degraded) return;
        const settings = current_settings;
        if (!settings) return;
        try {
            run_tick(settings);
            tick_errors = 0;
        } catch (e) {
            if (++tick_errors >= MAX_TICK_ERRORS) degrade(e?.message || 'exception');
        }
    }

    document.addEventListener('_live_catch_up_load_settings', e => {
        const settings = e.detail;
        current_settings = settings;
        if (settings.copiedLabel) {
            msg_current.innerHTML = HTMLPolicy.createHTML(`<span translate="no">${settings.copiedLabel}</span>`);
        }
        clearInterval(interval);
        showCurrent = settings.showCurrent;
        if (settings.enabled || settings.skip || settings.showPlaybackRate || settings.showLatency || settings.showHealth || settings.showEstimation || settings.showCurrent) {
            interval = setInterval(guarded_tick, 250);
        } else {
            reset_playbackRate();
            hideAllIndicators();
        }
    });

    document.addEventListener('_live_catch_up_reset_playback_rate', () => {
        reset_playbackRate();
    });

    // --- Player detection + (re)attach (R2) ---------------------------------
    // Runs on first load AND on every SPA navigation (YouTube reuses the tab and
    // may rebuild the player bar). Idempotent: video listeners bind once per
    // element, buttons are only re-inserted when they've been detached.
    function buttons_attached(area) {
        return button_playbackrate.isConnected && area.contains(button_playbackrate);
    }

    function detect_and_attach() {
        player = document.getElementById("movie_player");
        if (!player) return false;

        const v = video_instance();
        if (!v) return false;

        const time_display = document.getElementsByTagName('player-time-display')?.[0];
        let area;
        let button_live_badge;
        if (time_display) { // new-style YouTube embedded player
            area = time_display.querySelector('div.ytwPlayerTimeDisplayLiveDot');
            if (!area) return false;

            button_live_badge = time_display.querySelector('div.ytwPlayerTimeDisplayLiveDot > div');
            if (!button_live_badge) return false;
        } else {
            area = player.querySelector('div.ytp-time-display:has(button.ytp-live-badge) div.ytp-time-wrapper');
            if (!area) return false;

            button_live_badge = player.querySelector('button.ytp-live-badge');
            if (!button_live_badge) return false;
        }

        // Probe the private API surface once per attach and clear any prior
        // degraded state so a new stream/page gets a fresh chance.
        caps = probe_caps(player);
        engine_degraded = false;
        tick_errors = 0;

        if (bound_video !== v) {
            v.addEventListener('ratechange', onPlaybackRateChange);
            v.addEventListener('waiting', on_video_waiting);
            bound_video = v;
        }

        if (!buttons_attached(area)) {
            let prev = undefined;
            for (const elem of [button_live_badge, button_playbackrate, button_latency, button_health, button_current, msg_current, button_estimation].reverse()) {
                area.insertBefore(elem, prev);
                prev = elem;
            }
        }

        document.dispatchEvent(new CustomEvent('_live_catch_up_init'));
        return true;
    }

    function start_detection() {
        if (detect_interval) return;       // already polling
        if (detect_and_attach()) return;   // ready right now
        detect_interval = setInterval(() => {
            if (detect_and_attach()) {
                clearInterval(detect_interval);
                detect_interval = null;
            }
        }, 500);
    }

    start_detection();

    // SPA navigation: re-attach (idempotent) so indicators/catch-up survive
    // moving between lives without a full page reload.
    document.addEventListener('yt-navigate-finish', start_detection);
})();