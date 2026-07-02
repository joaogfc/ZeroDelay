// ZeroDelay — decorative pixel-dissolve scatter for the SELECTED mode card.
//
// Each mode card carries a <canvas class="card-scatter">. Only the active
// (aria-checked) card shows a scatter: on selection a sparse, subtle field of
// solid square "pixels" (ordered Bayer 4x4 dither) GROWS inward from all four
// edges toward the middle, then holds. Deselecting clears it. This ties the
// "degraded → sharp" pixel motif to the moment of choosing a mode.
//
// Purely visual: no storage, messaging, or engine state; no remote resources or
// images (MV3-safe). Block colour comes from --sync-strong, so it follows the
// theme. popup.js only adds the <canvas> element.

// 4x4 ordered dither matrix, normalised to 0..1.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);

const BLOCK = 5;       // px per block (small = subtle)
const BAND = 3;        // blocks in from each edge the scatter reaches
const DENSITY = 0.42;  // scales solidity down so the field stays sparse
const WAVE_MS = 560;   // grow-in duration

function activeColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--sync-strong').trim() || '#ff2d52';
}

// reveal 0..1 gates how far in from the four edges the blocks have grown.
function draw(canvas, reveal, col) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (reveal <= 0) return;
    ctx.fillStyle = col;

    const cols = Math.ceil(w / BLOCK);
    const rows = Math.ceil(h / BLOCK);

    for (let by = 0; by < rows; by++) {
        for (let bx = 0; bx < cols; bx++) {
            // distance from the nearest of the four edges, in blocks
            const edge = Math.min(bx, cols - 1 - bx, by, rows - 1 - by);
            if (edge >= BAND) continue;
            if (edge / BAND > reveal) continue;       // wave hasn't reached here
            const g = (1 - edge / BAND) * DENSITY;
            if (g <= BAYER4[(by % 4) * 4 + (bx % 4)]) continue;
            ctx.fillRect(bx * BLOCK, by * BLOCK, BLOCK, BLOCK);
        }
    }
}

function clear(canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function waveIn(canvas) {
    const col = activeColor();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
        draw(canvas, 1, col);
        return;
    }
    let startTs = null;
    const frame = ts => {
        if (startTs === null) startTs = ts;
        const reveal = Math.min(1, (ts - startTs) / WAVE_MS);
        draw(canvas, reveal, col);
        if (reveal < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

function bindCard(card) {
    const canvas = card.querySelector('.card-scatter');
    if (!canvas || !canvas.getContext) return;

    let wasActive = false;
    const sync = () => {
        const active = card.getAttribute('aria-checked') === 'true';
        if (active && !wasActive) {
            // Grow the scatter in only on the transition into the active state.
            requestAnimationFrame(() => waveIn(canvas));
        } else if (!active) {
            clear(canvas);
        }
        wasActive = active;
    };

    new MutationObserver(sync).observe(card, { attributes: true, attributeFilter: ['aria-checked'] });
    sync();
}

function tryInit() {
    const cards = [...document.querySelectorAll('.mode-card')];
    if (!cards.length) return false;
    cards.forEach(bindCard);
    return true;
}

function start() {
    if (tryInit()) return;
    // Mode cards render asynchronously (popup.js awaits storage first) — watch
    // for them, then initialise once and stop observing.
    const mo = new MutationObserver(() => {
        if (tryInit()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}
