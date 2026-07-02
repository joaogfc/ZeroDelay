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
// Optional "full theme" sub-toggle: the broad green repaint of the whole page.
// OFF by default — the base theme stays narrow (player + masthead accent + the
// branded nodes) to avoid noise and impersonating YouTube.
const FULL_CLASS = 'zd-hexa-full';

// Brazil flag palette. Yellow is used for FILLS/graphics only (never body text
// — #FFDF00 on light is unreadable); accent text uses the softer canary #FFE44D.
const CSS = `
/* ===== CORE (always on with .zd-hexa): a NARROW accent, not a repaint ==========
   It dresses the user's page (player + a masthead accent + the branded nodes); it
   does not recolor YouTube's chrome. Less noise, and no "is this the real
   YouTube?" ambiguity — the badge keeps it attributed to ZeroDelay. */
/* Player: the live DVR bar + scrubber go gold, buffered segment blue, live dot gold */
html.${ROOT_CLASS} .ytp-play-progress,html.${ROOT_CLASS} .ytp-scrubber-button{background:#FFDF00!important;}
html.${ROOT_CLASS} .ytp-load-progress{background:rgba(0,39,118,.9)!important;}
html.${ROOT_CLASS} .ytp-live-badge::before{background:#FFDF00!important;}
html.${ROOT_CLASS} .ytp-live-badge{color:#FFF6D5!important;}
/* Masthead accent: a green underline + the CBF tricolor rule. The native masthead
   background is kept, so its text/icons stay readable in light AND dark. */
html.${ROOT_CLASS} #masthead-container,html.${ROOT_CLASS} ytd-masthead{
  border-bottom:2px solid #009C3B!important;
}
html.${ROOT_CLASS} #masthead-container::after{
  content:'';position:absolute;left:0;right:0;bottom:0;height:4px;z-index:2100;
  background:linear-gradient(90deg,#009C3B 0 33%,#FFDF00 33% 66%,#002776 66% 100%);
  animation:zd-hexa-sync .6s ease both;
}
/* The tricolor "syncs" in on activation: wipes left to right, blur -> sharp. */
@keyframes zd-hexa-sync{from{clip-path:inset(0 100% 0 0);filter:blur(3px);}to{clip-path:inset(0 0 0 0);filter:blur(0);}}

/* ===== FULL THEME (opt-in sub-toggle .zd-hexa-full, OFF by default) =============
   The broad green repaint of the whole page (backgrounds, buttons, chips, chat).
   Behind a flag so it never applies by default — it is the loudest, most
   "YouTube-looking" part, so it stays a deliberate choice. */
html.${ROOT_CLASS}.${FULL_CLASS}{
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
html.${ROOT_CLASS}.${FULL_CLASS},html.${ROOT_CLASS}.${FULL_CLASS} body,html.${ROOT_CLASS}.${FULL_CLASS} ytd-app{
  background:#04140A!important;transition:background-color .3s ease;
}
html.${ROOT_CLASS}.${FULL_CLASS} #masthead-container,html.${ROOT_CLASS}.${FULL_CLASS} ytd-masthead{
  background:#02391C!important;transition:background-color .3s ease;
}
html.${ROOT_CLASS}.${FULL_CLASS} .yt-spec-button-shape-next--filled,
html.${ROOT_CLASS}.${FULL_CLASS} #subscribe-button button,
html.${ROOT_CLASS}.${FULL_CLASS} #subscribe-button tp-yt-paper-button{background:#009C3B!important;color:#FFF6D5!important;}
html.${ROOT_CLASS}.${FULL_CLASS} yt-chip-cloud-chip-renderer[selected],
html.${ROOT_CLASS}.${FULL_CLASS} yt-chip-cloud-chip-renderer[aria-selected="true"]{background:#009C3B!important;color:#04140A!important;}
html.${ROOT_CLASS}.${FULL_CLASS} yt-live-chat-text-message-renderer #author-name,
html.${ROOT_CLASS}.${FULL_CLASS} yt-live-chat-author-chip #author-name{color:#FFE44D!important;}

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
  position:absolute;left:14px;top:14px;z-index:60;cursor:pointer;
  border:2px solid #002776;border-radius:999px;padding:7px 15px;
  background:linear-gradient(#FFDF00,#F5C400);
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
/* Nodes resolve from a degraded (blurred) state to sharp — the product's
   degraded -> nitido signature, wearing the jersey. */
@keyframes zd-hexa-pop{from{opacity:0;transform:scale(.9);filter:blur(4px);}to{opacity:1;filter:blur(0);}}

/* Activation "boot": a full-screen tricolor that resolves from blurred + scanline
   (degraded) to sharp, then clears — the page putting on the shirt in the same
   pixel -> nitido gesture the extension uses on the stream. One-shot; removed by JS. */
.zd-hexa-boot{
  position:fixed;inset:0;z-index:2147483644;pointer-events:none;
  background:linear-gradient(180deg,#009C3B 0 34%,#FFDF00 34% 67%,#002776 67% 100%);
  animation:zd-hexa-boot .8s ease forwards;
}
.zd-hexa-boot::after{
  content:'';position:absolute;inset:0;mix-blend-mode:multiply;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 2px,transparent 2px 5px);
}
@keyframes zd-hexa-boot{
  0%{opacity:0;filter:blur(11px) saturate(1.6);transform:scale(1.06);}
  22%{opacity:.92;}
  55%{filter:blur(0) saturate(1);transform:scale(1);}
  100%{opacity:0;filter:blur(0);transform:scale(1);}
}

/* Opt-in invite: shown (theme still OFF) when a live Brazil game is detected.
   Clearly ZeroDelay's (carries the badge), never posing as YouTube. */
.zd-hexa-invite{
  position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(10px);
  z-index:2147483646;display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  max-width:min(92vw,460px);padding:12px 14px;border-radius:14px;
  background:#02391C;border:1px solid #FFDF00;color:#FFF6D5;
  font:600 13px/1.35 Roboto,"Segoe UI",system-ui,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.55);
  opacity:0;transition:opacity .3s ease,transform .3s ease;
}
.zd-hexa-invite.zd-hexa-in{opacity:1;transform:translateX(-50%) translateY(0);}
.zd-hexa-invite-msg{flex:1 1 170px;min-width:0;}
.zd-hexa-invite-cta{
  flex:none;border:0;border-radius:999px;padding:8px 16px;cursor:pointer;
  background:linear-gradient(#FFDF00,#F5C400);color:#04140A;
  font:800 13px/1 Roboto,system-ui,sans-serif;letter-spacing:.3px;
}
.zd-hexa-invite-no{
  flex:none;border:0;background:transparent;color:#CFE3C9;cursor:pointer;
  padding:8px 6px;font:600 12px/1 Roboto,system-ui,sans-serif;
  text-decoration:underline;text-underline-offset:2px;
}
.zd-hexa-invite-cta:focus-visible,.zd-hexa-invite-no:focus-visible{
  outline:2px solid #FFF6D5;outline-offset:2px;
}

/* ===== Accessibility: honor reduced motion & forced colors ===== */
@media (prefers-reduced-motion: reduce){
  html.${ROOT_CLASS}.${FULL_CLASS},html.${ROOT_CLASS}.${FULL_CLASS} body,html.${ROOT_CLASS}.${FULL_CLASS} ytd-app,
  html.${ROOT_CLASS}.${FULL_CLASS} #masthead-container,html.${ROOT_CLASS}.${FULL_CLASS} ytd-masthead{transition:none!important;}
  .zd-hexa-badge,.zd-hexa-gol,.zd-hexa-toast{animation:none!important;}
  html.${ROOT_CLASS} #masthead-container::after{animation:none!important;}
  .zd-hexa-invite{transition:none!important;opacity:1!important;transform:translateX(-50%)!important;}
  .zd-hexa-gol,.zd-hexa-confetti,.zd-hexa-boot{display:none!important;} /* no confetti/boot -> hide trigger */
}
@media (forced-colors: active){
  html.${ROOT_CLASS} #masthead-container::after,.zd-hexa-confetti,.zd-hexa-boot{display:none!important;}
}
`;

const reduceMotion = () =>
    typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let installed = false;
let active = false;
let keepAlive = null;              // re-attaches decorative nodes after re-renders
let inviteTimer = null;            // auto-dismiss timer for the opt-in invite
const nodes = { badgeMast: null, gol: null, invite: null };

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

/**
 * Turn the theme on/off by toggling the single root class + managing nodes.
 * @param {boolean} on
 * @param {string} [activatedLabel] - Localized "activated" toast text (page world has no chrome.i18n).
 */
export function setActive(on, activatedLabel) {
    on = !!on;
    if (on === active) return;
    active = on;
    document.documentElement.classList.toggle(ROOT_CLASS, on);
    if (on) {
        hideInvite();
        playBoot();
        ensureNodes();
        keepAlive = setInterval(ensureNodes, 1000);
        showToast(activatedLabel);
    } else {
        clearInterval(keepAlive);
        keepAlive = null;
        document.documentElement.classList.remove(FULL_CLASS);
        removeNodes();
    }
}

/**
 * Toggle the optional "full theme" (broad page repaint). No-op unless the base
 * theme is on. Off by default; a popup sub-toggle drives it.
 * @param {boolean} on
 */
export function setFull(on) {
    document.documentElement.classList.toggle(FULL_CLASS, !!on);
}

/**
 * Show the opt-in invite (theme stays OFF until the user accepts). Content.js
 * passes localized strings and the callbacks; this module owns only the DOM.
 * @param {{message:string, cta:string, dismiss:string, onAccept:Function, onDismiss:Function}} opts
 */
export function showInvite({ message, cta, dismiss, onAccept, onDismiss } = {}) {
    if (active) return;               // already on — nothing to offer
    hideInvite();
    const card = make('div', 'zd-hexa-invite');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', message || 'Modo Hexa');
    const yes = make('button', 'zd-hexa-invite-cta', cta || 'Ativar');
    yes.type = 'button';
    const no = make('button', 'zd-hexa-invite-no', dismiss || 'Agora não');
    no.type = 'button';
    yes.addEventListener('click', () => { hideInvite(); if (onAccept) onAccept(); });
    no.addEventListener('click', () => { hideInvite(); if (onDismiss) onDismiss(); });
    card.append(buildBadge(), make('span', 'zd-hexa-invite-msg', message), yes, no);
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('zd-hexa-in'));
    nodes.invite = card;
    clearTimeout(inviteTimer);
    inviteTimer = setTimeout(hideInvite, 15000);   // an offer, not a nag
}

/** Dismiss the invite (no-op if none is showing). */
export function hideInvite() {
    clearTimeout(inviteTimer);
    inviteTimer = null;
    const card = nodes.invite;
    if (!card) return;
    nodes.invite = null;
    card.classList.remove('zd-hexa-in');
    setTimeout(() => card.remove(), 300);
}

// --- DOM helpers (textContent only — no innerHTML) --------------------------
function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
}

function buildBadge() {
    const b = make('span', 'zd-hexa-badge');
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
    nodes.badgeMast.classList.add('zd-hexa-badge--masthead');
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
    clearTimeout(inviteTimer);
    inviteTimer = null;
    document.querySelectorAll('.zd-hexa-confetti,.zd-hexa-toast,.zd-hexa-invite').forEach(n => n.remove());
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

// One-shot "boot" flash on activation: a tricolor that resolves blur -> sharp,
// then clears (the page putting on the jersey). Skipped under reduced motion.
function playBoot() {
    if (reduceMotion()) return;
    const b = make('div', 'zd-hexa-boot');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 850);
}

function showToast(text) {
    const t = make('div', 'zd-hexa-toast', '🇧🇷 ' + (text || 'Modo Hexa ativado'));
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('zd-hexa-in'));
    setTimeout(() => {
        t.classList.remove('zd-hexa-in');
        setTimeout(() => t.remove(), 350);
    }, 3000);
}
