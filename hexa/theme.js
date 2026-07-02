// ZeroDelay — MODO HEXA
// Author: João Gustavo França <joao@solitus.com.br> (https://github.com/joaogfc)
//
// A green/yellow World Cup theme that reskins the YouTube page while a live
// Brazil match is on screen. Imported by content.js (isolated world) via
// chrome.runtime.getURL — so it is pure DOM with NO chrome.* APIs.
//
// The whole theme lives in ONE <style> whose rules are scoped under a single
// root class `html.zd-hexa`. Applying/removing the theme is therefore just
// `document.documentElement.classList.toggle('zd-hexa', on)` — atomic, instant,
// fully reversible, and it survives YouTube's SPA re-renders (YouTube never
// tears down <html>). The style node is inserted once (dormant) at install().
//
// It NEVER recolors the video itself — only the page chrome (masthead, page
// background, buttons, chat, and the player's control-bar accents). The
// decorative nodes (the masthead badge, the GOL! button, the activation toast)
// are created in JS with textContent only (no innerHTML → TrustedTypes-safe,
// same reason the donation banners avoid it) and removed on deactivate.

const STYLE_ID = '_modo_hexa';
const ROOT_CLASS = 'zd-hexa';

// Brazil flag palette. Yellow is used for FILLS/graphics only (never body text
// — #FFDF00 on light is unreadable); accent text uses the softer canary #FFE44D.
const CSS = `
/* ===== Token remap: recolors most YouTube surfaces at once ===== */
html.${ROOT_CLASS}{
  --yt-spec-base-background:#04140A!important;
  --yt-spec-raised-background:#0A2414!important;
  --yt-spec-menu-background:#0A2414!important;
  --yt-spec-general-background-a:#0A2414!important;
  --yt-spec-general-background-b:#071B0F!important;
  --yt-spec-general-background-c:#02100A!important;
  --yt-spec-additive-background:#0F3018!important;
  --yt-spec-brand-background-primary:#02391C!important;
  --yt-spec-brand-background-solid:#02391C!important;
  --yt-spec-text-primary:#FFF6D5!important;
  --yt-spec-text-secondary:#CFE3C9!important;
  --yt-spec-call-to-action:#FFE44D!important;
  --yt-spec-themed-blue:#FFE44D!important;
  --yt-spec-static-brand-red:#009C3B!important;
  --yt-spec-brand-button-background:#009C3B!important;
  --yt-spec-icon-active-other:#FFDF00!important;
  --yt-spec-badge-chip-background:#0F3018!important;
  --yt-spec-10-percent-layer:#1A4028!important;
  --yt-brand-youtube-red:#009C3B!important;
}
/* ===== Literal-surface overrides (for surfaces that ignore the tokens) ===== */
html.${ROOT_CLASS},html.${ROOT_CLASS} body,html.${ROOT_CLASS} ytd-app{
  background:#04140A!important;transition:background-color .3s ease;
}
html.${ROOT_CLASS} #masthead-container,html.${ROOT_CLASS} ytd-masthead{
  background:#02391C!important;border-bottom:1px solid #009C3B!important;transition:background-color .3s ease;
}
/* CBF tricolor rule under the masthead */
html.${ROOT_CLASS} #masthead-container::after{
  content:'';position:absolute;left:0;right:0;bottom:0;height:3px;z-index:2100;
  background:linear-gradient(90deg,#009C3B 0 33%,#FFDF00 33% 66%,#002776 66% 100%);
}
/* Player: the live DVR bar + scrubber go gold, buffered segment blue, live dot gold */
html.${ROOT_CLASS} .ytp-play-progress,html.${ROOT_CLASS} .ytp-scrubber-button{background:#FFDF00!important;}
html.${ROOT_CLASS} .ytp-load-progress{background:rgba(0,39,118,.55)!important;}
html.${ROOT_CLASS} .ytp-live-badge::before{background:#FFDF00!important;}
html.${ROOT_CLASS} .ytp-live-badge{color:#FFF6D5!important;}
/* Filled buttons (Subscribe/Inscrever-se) */
html.${ROOT_CLASS} .yt-spec-button-shape-next--filled,
html.${ROOT_CLASS} #subscribe-button button,
html.${ROOT_CLASS} #subscribe-button tp-yt-paper-button{background:#009C3B!important;color:#FFF6D5!important;}
/* Selected filter chip: dark text on green passes AA */
html.${ROOT_CLASS} yt-chip-cloud-chip-renderer[selected],
html.${ROOT_CLASS} yt-chip-cloud-chip-renderer[aria-selected="true"]{background:#009C3B!important;color:#04140A!important;}
/* Live-chat author names pick up the gold accent (messages stay ivory) */
html.${ROOT_CLASS} yt-live-chat-text-message-renderer #author-name,
html.${ROOT_CLASS} yt-live-chat-author-chip #author-name{color:#FFE44D!important;}

/* ===== Decorative nodes (injected by this module while active) ===== */
.zd-hexa-badge{
  display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;
  border:1px solid #FFDF00;border-radius:999px;background:#02391C;color:#FFE44D;
  font:700 11px/1 Roboto,"Segoe UI",system-ui,sans-serif;letter-spacing:.4px;
  white-space:nowrap;vertical-align:middle;animation:zd-hexa-pop .3s ease both;
}
.zd-hexa-badge .zd-hexa-stars{color:#FFDF00;letter-spacing:1px;}
.zd-hexa-badge--masthead{margin:0 10px;align-self:center;}
.zd-hexa-gol{
  position:absolute;left:14px;top:14px;z-index:60;cursor:pointer;border:0;
  border-radius:999px;padding:7px 15px;background:linear-gradient(#FFDF00,#F5C400);
  color:#04140A;font:800 13px/1 Roboto,system-ui,sans-serif;letter-spacing:.5px;
  box-shadow:0 2px 8px rgba(0,0,0,.45);opacity:.9;animation:zd-hexa-pop .3s ease both;
}
.zd-hexa-gol:hover{opacity:1;}
.zd-hexa-toast{
  position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(8px);
  z-index:2147483646;display:flex;align-items:center;gap:8px;padding:11px 17px;
  border-radius:999px;background:#02391C;border:1px solid #FFDF00;color:#FFF6D5;
  font:700 13px/1 Roboto,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5);
  opacity:0;transition:opacity .3s ease,transform .3s ease;
}
.zd-hexa-toast.zd-hexa-in{opacity:1;transform:translateX(-50%) translateY(0);}
.zd-hexa-confetti{position:fixed;inset:0;z-index:2147483645;pointer-events:none;overflow:hidden;}
.zd-hexa-confetti i{position:absolute;top:-24px;width:8px;height:14px;border-radius:2px;animation:zd-hexa-fall linear forwards;}
@keyframes zd-hexa-fall{to{transform:translateY(110vh) rotate(600deg);opacity:.85;}}
@keyframes zd-hexa-pop{from{opacity:0;transform:scale(.85);}to{opacity:1;}}

/* ===== Accessibility: honor reduced motion & forced colors ===== */
@media (prefers-reduced-motion: reduce){
  html.${ROOT_CLASS},html.${ROOT_CLASS} body,html.${ROOT_CLASS} ytd-app,
  html.${ROOT_CLASS} #masthead-container,html.${ROOT_CLASS} ytd-masthead{transition:none!important;}
  .zd-hexa-badge,.zd-hexa-gol,.zd-hexa-toast{animation:none!important;}
  .zd-hexa-gol,.zd-hexa-confetti{display:none!important;} /* no confetti -> hide its trigger */
}
@media (forced-colors: active){
  html.${ROOT_CLASS} #masthead-container::after,.zd-hexa-confetti{display:none!important;}
}
`;

const reduceMotion = () =>
    typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let installed = false;
let active = false;
let keepAlive = null;              // re-attaches decorative nodes after re-renders
const nodes = { badgeMast: null, gol: null };

/** Insert the dormant <style> once. Cheap; does nothing on repeat calls. */
export function install() {
    if (installed) return;
    installed = true;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
}

/** Turn the theme on/off by toggling the single root class + managing nodes. */
export function setActive(on) {
    on = !!on;
    if (on === active) return;
    active = on;
    document.documentElement.classList.toggle(ROOT_CLASS, on);
    if (on) {
        ensureNodes();
        keepAlive = setInterval(ensureNodes, 1000);
        showToast();
    } else {
        clearInterval(keepAlive);
        keepAlive = null;
        removeNodes();
    }
}

// --- DOM helpers (textContent only — no innerHTML) --------------------------
function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
}

function buildBadge() {
    const b = make('span', 'zd-hexa-badge zd-hexa-badge--masthead');
    b.append(make('span', null, 'RUMO AO HEXA'));
    b.append(make('span', 'zd-hexa-stars', '★★★★★☆')); // 5 titles + the aspirational 6th
    return b;
}

// Re-inserts any decorative node YouTube's re-render may have detached. Called
// on activate and once per second while active; each check is a cheap
// isConnected test, re-adding only when needed.
function ensureNodes() {
    ensureMastheadBadge();
    ensureGolButton();
}

function ensureMastheadBadge() {
    if (nodes.badgeMast && nodes.badgeMast.isConnected) return;
    const host = document.querySelector('ytd-masthead #end');
    if (!host) return;
    nodes.badgeMast = buildBadge();
    host.insertBefore(nodes.badgeMast, host.firstChild);
}

function ensureGolButton() {
    if (nodes.gol && nodes.gol.isConnected) return;
    const player = document.getElementById('movie_player');
    if (!player) return;
    const btn = make('button', 'zd-hexa-gol', 'GOL!');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Comemorar gol do Brasil');
    btn.addEventListener('click', fireConfetti);
    nodes.gol = btn;
    player.appendChild(btn);
}

function removeNodes() {
    for (const k of Object.keys(nodes)) {
        if (nodes[k]) { nodes[k].remove(); nodes[k] = null; }
    }
    document.querySelectorAll('.zd-hexa-confetti,.zd-hexa-toast').forEach(n => n.remove());
}

// Goal celebration — explicit, user-triggered via the GOL! button. Skipped
// entirely under reduced-motion (and the button is CSS-hidden there too).
function fireConfetti() {
    if (reduceMotion()) return;
    const layer = make('div', 'zd-hexa-confetti');
    const colors = ['#009C3B', '#FFDF00', '#002776', '#FFF6D5'];
    for (let i = 0; i < 44; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + 'vw';
        p.style.background = colors[i % colors.length];
        p.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
        p.style.animationDelay = (Math.random() * 0.25) + 's';
        layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 3200);
}

function showToast() {
    const t = make('div', 'zd-hexa-toast', '🇧🇷 MODO HEXA ativado');
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('zd-hexa-in'));
    setTimeout(() => {
        t.classList.remove('zd-hexa-in');
        setTimeout(() => t.remove(), 350);
    }, 3000);
}
