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
// In FULLSCREEN the theme goes fully inert — no overlays, no player recolor. A
// class toggled on <html> by the fullscreenchange listener (see install()) drives
// it: the decorative nodes are hidden and the player-accent rules are gated with
// :not(.zd-hexa-fs), so YouTube's native styling shows through.
const FS_CLASS = 'zd-hexa-fs';
// Overshoot spring, same feel as the extension's popup (--spring).
const SPRING = 'cubic-bezier(.2,.9,.25,1.18)';

// Brazil flag palette. Yellow is used for FILLS/graphics only (never body text
// — #FFDF00 on light is unreadable); accent text uses the softer canary #FFE44D.
const CSS = `
/* ===== CORE (always on with .zd-hexa): a NARROW accent, not a repaint ==========
   It dresses the user's page (player + a masthead accent + the branded nodes); it
   does not recolor YouTube's chrome. Less noise, and no "is this the real
   YouTube?" ambiguity — the badge keeps it attributed to ZeroDelay. */
/* Progress bar: a slow tricolor gradient that shimmers along, so it reads as the
   selecao's colors flowing, not a flat yellow "ad" bar. */
html.${ROOT_CLASS}:not(.${FS_CLASS}) .ytp-play-progress{
  background-image:linear-gradient(90deg,#00A63F,#FFE14D,#2f7bff,#FFE14D,#00A63F)!important;
  background-size:300% 100%!important;
  animation:zd-hexa-bar 5s linear infinite!important;
}
html.${ROOT_CLASS}:not(.${FS_CLASS}) .ytp-scrubber-button{background:#FFE14D!important;box-shadow:0 0 0 2px rgba(0,39,118,.5)!important;}
html.${ROOT_CLASS}:not(.${FS_CLASS}) .ytp-load-progress{background:rgba(0,39,118,.85)!important;}
@keyframes zd-hexa-bar{from{background-position:0 0;}to{background-position:300% 0;}}
/* LIVE badge tinted to the flag (restored): gold dot + ivory text. */
html.${ROOT_CLASS}:not(.${FS_CLASS}) .ytp-live-badge::before{background:#FFDF00!important;}
html.${ROOT_CLASS}:not(.${FS_CLASS}) .ytp-live-badge{color:#FFF6D5!important;}
/* Masthead accent = the bunting garland below (no coloured border line, which
   clashed with the flags' own string). */
/* Bunting garland (varal de bandeirinhas) hanging from the masthead — the flags
   are pennants cycling green/yellow/blue, swaying gently; it drops in on boot. */
.zd-hexa-bunting{
  position:fixed;left:0;right:0;top:55px;height:40px;z-index:1800;pointer-events:none;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='132' height='44' viewBox='0 0 132 44'%3E%3Cpath d='M0 5Q66 22 132 5' fill='none' stroke='%230b3b22' stroke-width='2'/%3E%3Cpolygon points='10,9 34,9 34,32 22,21 10,32' fill='%2300A63F'/%3E%3Cpolygon points='54,14 78,14 78,28 66,38 54,28' fill='%23FFDF00'/%3E%3Cpolygon points='98,9 122,9 122,32 110,21 98,32' fill='%23002776'/%3E%3C/svg%3E") repeat-x left top;
  background-size:132px 44px;animation:zd-hexa-drop .5s ${SPRING} both;
}
@keyframes zd-hexa-drop{from{transform:translateY(-22px);opacity:0;}to{transform:translateY(0);opacity:1;}}

/* Animated logo: the YouTube play-button becomes a waving Brazil flag that grows
   the 6 hexa stars, holds a while, morphs back to the red icon, and loops — a slow
   "loop com descanso" (~24s: mostly flag, a brief YouTube beat). It is a COMPLETE
   logo swap, NOT an overlay: ensureLogoFlag() hides the icon paths of YouTube's own
   logo <svg viewBox="0 0 93 20"> and injects this flag as a nested <svg> in the
   icon's exact slot (x 0..29). YouTube's real "YouTube" wordmark is reused as-is, so
   everything lines up in one coordinate space and there is nothing to align. The
   white play triangle is the shared anchor between both states. */
.zd-hexa-lg-flag{overflow:visible;transform-origin:left center;animation:zd-hexa-lg-wave 24s ease-in-out infinite;}
.zd-hexa-lg-skin{animation:zd-hexa-lg-skin 24s ease infinite;}
.zd-hexa-lg-gloss{animation:zd-hexa-lg-gloss 24s ease infinite;}
.zd-hexa-lg-dia{transform-box:fill-box;transform-origin:center;animation:zd-hexa-lg-diaA 24s cubic-bezier(.3,1.3,.5,1) infinite;}
.zd-hexa-lg-circ{transform-box:fill-box;transform-origin:center;animation:zd-hexa-lg-diaB 24s cubic-bezier(.3,1.3,.5,1) infinite;}
.zd-hexa-lg-glint{animation:zd-hexa-lg-glint 24s ease-in-out infinite;}
.zd-hexa-lg-star{transform-box:fill-box;transform-origin:center;animation:zd-hexa-lg-star 24s ease infinite,zd-hexa-lg-tw 2.4s ease-in-out infinite;}
/* red YouTube icon <-> green flag; the ivory play triangle stays put throughout. */
@keyframes zd-hexa-lg-skin{0%,4%{fill:#FF0000;stroke:#c40000;}12%,88%{fill:#009C3B;stroke:#06331d;}96%,100%{fill:#FF0000;stroke:#c40000;}}
/* losango + circle bloom in (slightly staggered) as the field turns green. */
@keyframes zd-hexa-lg-diaA{0%,5%{transform:scale(.15);opacity:0;}11%{transform:scale(1.14);opacity:1;}14%,88%{transform:scale(1);opacity:1;}94%,100%{transform:scale(.15);opacity:0;}}
@keyframes zd-hexa-lg-diaB{0%,7%{transform:scale(.15);opacity:0;}12%{transform:scale(1.16);opacity:1;}15%,88%{transform:scale(1);opacity:1;}93%,100%{transform:scale(.15);opacity:0;}}
/* the 6 hexa stars pop after the flag forms, then twinkle out of phase. */
@keyframes zd-hexa-lg-star{0%,9%{transform:scale(0) rotate(-25deg);}14%{transform:scale(1.35) rotate(4deg);}17%,87%{transform:scale(1) rotate(0);}92%,100%{transform:scale(0) rotate(-25deg);}}
@keyframes zd-hexa-lg-tw{0%,100%{opacity:1;}50%{opacity:.6;}}
@keyframes zd-hexa-lg-gloss{0%,8%{opacity:0;}14%,85%{opacity:.12;}92%,100%{opacity:0;}}
/* gentle flutter, only while it is a flag (pinned at the hoist = left edge). */
@keyframes zd-hexa-lg-wave{0%,12%{transform:rotate(0) skewY(0);}20%{transform:rotate(-2deg) skewY(1.3deg);}32%{transform:rotate(1.5deg) skewY(-1.2deg);}44%{transform:rotate(-1.5deg) skewY(1.1deg);}56%{transform:rotate(1.4deg) skewY(-1.1deg);}68%{transform:rotate(-1.3deg) skewY(1deg);}80%{transform:rotate(1.2deg) skewY(-1deg);}88%,100%{transform:rotate(0) skewY(0);}}
/* two shine sweeps across the flag during the rest. */
@keyframes zd-hexa-lg-glint{0%,18%{transform:translateX(-90px);}30%{transform:translateX(200px);}30.01%,55%{transform:translateX(-90px);}68%{transform:translateX(200px);}68.01%,100%{transform:translateX(-90px);}}
/* GOAL boost: the flag flutters hard for a few seconds when Brazil scores. */
.zd-hexa-lg-flag.zd-hexa-logo-gol{animation:zd-hexa-lg-golwave 1s ease-in-out infinite;}
@keyframes zd-hexa-lg-golwave{0%,100%{transform:rotate(-3deg) skewY(2.2deg);}50%{transform:rotate(3deg) skewY(-2.2deg);}}

/* ===== FULL THEME (opt-in sub-toggle .zd-hexa-full, OFF by default) =============
   The broad green repaint of the whole page (backgrounds, buttons, chips, chat).
   Behind a flag so it never applies by default — it is the loudest, most
   "YouTube-looking" part, so it stays a deliberate choice. */
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}){
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
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}),html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) body,html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) ytd-app{
  background:#04140A!important;transition:background-color .3s ease;
}
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) #masthead-container,html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) ytd-masthead{
  background:#02391C!important;border-bottom:1px solid #009C3B!important;transition:background-color .3s ease;
}
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) .yt-spec-button-shape-next--filled,
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) #subscribe-button button,
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) #subscribe-button tp-yt-paper-button{background:#009C3B!important;color:#FFF6D5!important;}
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) yt-chip-cloud-chip-renderer[selected],
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) yt-chip-cloud-chip-renderer[aria-selected="true"]{background:#009C3B!important;color:#04140A!important;}
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) yt-live-chat-text-message-renderer #author-name,
html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) yt-live-chat-author-chip #author-name{color:#FFE44D!important;}

/* ===== Decorative nodes (injected by this module while active) ===== */
/* Shaped like YouTube's own masthead buttons (e.g. +Criar): 36px pill, so it
   sits coherently next to them — branded by content, not by mimicking chrome. */
.zd-hexa-badge{
  display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 15px;box-sizing:border-box;
  border-radius:20px;border:1px solid rgba(255,223,0,.3);
  background:rgba(0,156,59,.18);color:#FFF6D5;
  font:600 14px/1 Roboto,"Segoe UI",system-ui,sans-serif;letter-spacing:.2px;
  white-space:nowrap;vertical-align:middle;animation:zd-hexa-pop .34s ${SPRING} both;
}
.zd-hexa-badge .zd-hexa-stars{display:inline-flex;gap:1px;font-size:12px;letter-spacing:1px;}
.zd-hexa-badge .zd-hexa-star-on{color:#FFDF00;}
.zd-hexa-badge .zd-hexa-star-6{color:#5b8cff;}
.zd-hexa-badge--masthead{margin:0 8px;align-self:center;}
/* Sits in the watch action row, to the LEFT of Like — same 36px pill as the
   native action buttons, gold so it still pops (and pulses) among the grey ones. */
.zd-hexa-gol{
  display:inline-flex;align-items:center;gap:6px;flex:none;vertical-align:middle;box-sizing:border-box;
  height:36px;padding:0 15px;margin-right:8px;cursor:pointer;border:0;border-radius:18px;
  background:linear-gradient(#FFE44D,#FFC400);color:#04140A;
  font:600 14px/1 Roboto,system-ui,sans-serif;letter-spacing:.2px;
  box-shadow:0 2px 10px rgba(255,223,0,.35);
  transition:transform .18s ${SPRING},box-shadow .2s ease;
  animation:zd-hexa-pop .34s ${SPRING} both,zd-hexa-golpulse 1.9s ease-in-out .5s infinite;
}
.zd-hexa-gol:hover{transform:translateY(-1px);box-shadow:0 2px 14px rgba(255,223,0,.55);}
.zd-hexa-gol:active{transform:scale(.96);}
.zd-hexa-gol:focus-visible{outline:3px solid #FFF6D5;outline-offset:2px;}
@keyframes zd-hexa-golpulse{0%,100%{box-shadow:0 2px 10px rgba(255,223,0,.3);}50%{box-shadow:0 2px 16px rgba(255,223,0,.6);}}
.zd-hexa-gol-icon{flex:none;display:block;}
.zd-hexa-gol-label{line-height:1;}
.zd-hexa-toast{
  position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(8px);
  z-index:2147483646;display:flex;align-items:center;gap:8px;padding:11px 17px;
  border-radius:999px;background:#02391C;border:1px solid #FFDF00;color:#FFF6D5;
  font:700 13px/1 Roboto,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5);
  opacity:0;transition:opacity .3s ease,transform .38s ${SPRING};
}
.zd-hexa-toast.zd-hexa-in{opacity:1;transform:translateX(-50%) translateY(0);}
.zd-hexa-confetti{position:fixed;inset:0;z-index:2147483645;pointer-events:none;overflow:hidden;animation:zd-hexa-resolve .4s ease both;}
.zd-hexa-confetti i{position:absolute;top:-24px;width:8px;height:14px;border-radius:2px;animation:zd-hexa-fall linear forwards;}
/* Some pieces are tricolor pennants; others are little Brazil flags. */
.zd-hexa-confetti i.zd-hexa-flag{width:13px;height:9px;border-radius:1px;}
.zd-hexa-confetti i.zd-hexa-bandeira{width:15px;height:11px;border-radius:1px;background:#009C3B;overflow:hidden;}
.zd-hexa-confetti i.zd-hexa-bandeira::before{content:'';position:absolute;left:50%;top:50%;width:8px;height:8px;transform:translate(-50%,-50%) rotate(45deg);background:#FFDF00;}
.zd-hexa-confetti i.zd-hexa-bandeira::after{content:'';position:absolute;left:50%;top:50%;width:3.6px;height:3.6px;transform:translate(-50%,-50%);border-radius:50%;background:#002776;}
@keyframes zd-hexa-fall{to{transform:translateY(110vh) rotate(600deg);opacity:.85;}}
/* The burst materializes from a degraded blur to sharp before it falls. */
@keyframes zd-hexa-resolve{from{filter:blur(7px);opacity:0;}to{filter:blur(0);opacity:1;}}
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
  opacity:0;transition:opacity .3s ease,transform .38s ${SPRING};
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

/* ===== Fullscreen: NEVER cover a fullscreen video. Two complementary nets =====
   (1) botelllhx's CSS :fullscreen net — hides the fixed overlays via the pseudo
   directly (two rules so an unknown pseudo can't invalidate the other). */
:fullscreen :is(.zd-hexa-bunting,.zd-hexa-boot,.zd-hexa-confetti,.zd-hexa-toast,.zd-hexa-invite){display:none!important;}
:-webkit-full-screen :is(.zd-hexa-bunting,.zd-hexa-boot,.zd-hexa-confetti,.zd-hexa-toast,.zd-hexa-invite){display:none!important;}
/* (2) The .zd-hexa-fs class (JS-toggled on fullscreenchange) hides EVERY decorative
   node — incl. the logo flag/stars — and, above, gates the player accents with
   :not(.zd-hexa-fs) so the bar/badge also go native (theme fully inert in FS). */
html.${FS_CLASS} .zd-hexa-bunting,
html.${FS_CLASS} .zd-hexa-badge,
html.${FS_CLASS} .zd-hexa-gol,
html.${FS_CLASS} .zd-hexa-lg-flag,
html.${FS_CLASS} .zd-hexa-lg-stars,
html.${FS_CLASS} .zd-hexa-toast,
html.${FS_CLASS} .zd-hexa-invite,
html.${FS_CLASS} .zd-hexa-confetti,
html.${FS_CLASS} .zd-hexa-boot{display:none!important;}

/* ===== Accessibility: honor reduced motion & forced colors ===== */
@media (prefers-reduced-motion: reduce){
  html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}),html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) body,html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) ytd-app,
  html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) #masthead-container,html.${ROOT_CLASS}.${FULL_CLASS}:not(.${FS_CLASS}) ytd-masthead{transition:none!important;}
  .zd-hexa-badge,.zd-hexa-gol,.zd-hexa-toast{animation:none!important;}
  .zd-hexa-bunting{animation:none!important;}
  /* Logo settles into a still Brazil flag (its base state), no morph/flutter. */
  .zd-hexa-lg-flag,.zd-hexa-lg-skin,.zd-hexa-lg-dia,.zd-hexa-lg-circ,.zd-hexa-lg-gloss,.zd-hexa-lg-star{animation:none!important;}
  .zd-hexa-lg-glint{display:none!important;}
  html.${ROOT_CLASS} .ytp-play-progress{animation:none!important;}
  .zd-hexa-toast{transition:none!important;}
  .zd-hexa-invite{transition:none!important;opacity:1!important;transform:translateX(-50%)!important;}
  .zd-hexa-gol,.zd-hexa-confetti,.zd-hexa-boot{display:none!important;} /* no confetti/boot -> hide trigger */
}
@media (forced-colors: active){
  .zd-hexa-bunting,.zd-hexa-confetti,.zd-hexa-boot{display:none!important;}
}
`;

const reduceMotion = () =>
    typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isFullscreen = () =>
    !!(document.fullscreenElement || document.webkitFullscreenElement);

// Reflect the current fullscreen state onto <html> so the FS_CLASS rules apply.
function syncFullscreen() {
    document.documentElement.classList.toggle(FS_CLASS, isFullscreen());
}

let installed = false;
let active = false;
let keepAlive = null;              // re-attaches decorative nodes after re-renders
let inviteTimer = null;            // auto-dismiss timer for the opt-in invite
const nodes = { badgeMast: null, bunting: null, gol: null, logo: null, logoStars: null, invite: null };
let logoHidden = [];               // YouTube logo <path>s we hid, to restore on deactivate
let logoSvg = null;                // YouTube's logo <svg> we swapped into (to reset overflow)

/** Insert the dormant <style> once. Cheap; does nothing on repeat calls. */
export function install() {
    if (installed) return;
    installed = true;
    // Track fullscreen so the theme can go inert in it (added once; harmless
    // while the theme is off — the FS_CLASS rules only bite alongside .zd-hexa).
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    syncFullscreen();
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
    b.append(make('span', 'zd-hexa-badge-label', 'RUMO AO HEXA'));
    const stars = make('span', 'zd-hexa-stars');
    stars.append(make('span', 'zd-hexa-star-on', '★★★★★'));         // 5 titles, gold
    stars.append(make('span', 'zd-hexa-star-6', '★'));             // the aspirational 6th, in blue
    b.append(stars);
    return b;
}

// Re-inserts any decorative node YouTube's re-render may have detached. Called
// on activate and once per second while active; each check is a cheap
// isConnected test, re-adding only when needed.
function ensureNodes() {
    ensureMastheadBadge();
    ensureBunting();
    ensureGolButton();
    ensureLogoFlag();
}

function buildBunting() {
    return make('div', 'zd-hexa-bunting');   // shape lives in the tiled SVG background
}

function ensureBunting() {
    if (nodes.bunting && nodes.bunting.isConnected) return;
    if (!document.getElementById('masthead-container')) return; // wait for the masthead
    nodes.bunting = buildBunting();
    document.body.appendChild(nodes.bunting);                    // fixed; on body so nothing clips it
}

function ensureMastheadBadge() {
    if (nodes.badgeMast && nodes.badgeMast.isConnected) return;
    const host = document.querySelector('ytd-masthead #end');
    if (!host) return;
    nodes.badgeMast = buildBadge();
    nodes.badgeMast.classList.add('zd-hexa-badge--masthead');
    host.insertBefore(nodes.badgeMast, host.firstChild);
}

// A small line-style soccer ball (a real icon, not an emoji), tinted to the button
// text via currentColor. Built as SVG DOM (no innerHTML) like the rest of the theme.
function buildGolIcon() {
    const svg = svgEl('svg', { class: 'zd-hexa-gol-icon', viewBox: '0 0 24 24', width: 16, height: 16, 'aria-hidden': 'true' });
    svg.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 9.4, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }));
    svg.appendChild(svgEl('polygon', { points: '12,7.5 16.28,10.61 14.64,15.64 9.36,15.64 7.72,10.61', fill: 'currentColor' }));
    const seams = [[12, 7.5, 12, 2.6], [16.28, 10.61, 21, 9.1], [14.64, 15.64, 17.55, 19.6], [9.36, 15.64, 6.45, 19.6], [7.72, 10.61, 3, 9.1]];
    for (const [x1, y1, x2, y2] of seams) {
        svg.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round' }));
    }
    return svg;
}

function ensureGolButton() {
    if (nodes.gol && nodes.gol.isConnected) return;
    // Watch action row (Like/Share/Save). GOL goes first, to the left of Like.
    const host = document.querySelector('#top-level-buttons-computed');
    if (!host) return;
    const btn = make('button', 'zd-hexa-gol');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Comemorar gol do Brasil');
    btn.append(buildGolIcon(), make('span', 'zd-hexa-gol-label', 'GOL!'));
    btn.addEventListener('click', () => celebrateGoal());
    nodes.gol = btn;
    host.insertBefore(btn, host.firstChild);
}

// --- Animated logo (SVG built via createElementNS — innerHTML is a TrustedTypes
// sink on YouTube, so the whole flag is assembled node-by-node). ----------------
const SVG_NS = 'http://www.w3.org/2000/svg';
// A 5-point star (outer radius 5.5) centered on (0,0); placed + shrunk via a
// translate+scale on its wrapper <g>.
const LG_STAR_PTS = '0,-5.5 1.4,-1.9 5.2,-1.7 2.3,0.7 3.2,4.5 0,2.4 -3.2,4.5 -2.3,0.7 -5.2,-1.7 -1.4,-1.9';
// The 6 hexa stars arc as a crown across the WHOLE logo (emblem + wordmark), so they
// live in the parent logo <svg> (93x20 space), floating just above it (negative y).
// [x, y, twinkle-delay]; each is scaled down by LG_STAR_SCALE from the 5.5 radius.
const LG_STAR_SCALE = 0.36;
const LG_STARS = [[8, -1.2, '0s'], [24, -2.8, '.5s'], [39, -3.8, '.9s'], [55, -3.8, '.3s'], [70, -2.8, '.8s'], [86, -1.2, '1.2s']];

function svgEl(tag, attrs) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
}

// The flag artwork, as a nested <svg> sized to the icon slot (x 0..29, y 0..20 of
// YouTube's 93x20 logo). Green field, yellow losango, blue globe, the shared ivory
// play triangle, a gloss + shine. The stars are separate (buildLogoStars), so they
// can arc over the whole logo. Animation is 100% CSS.
function buildLogoFlag() {
    const svg = svgEl('svg', { class: 'zd-hexa-lg-flag', x: 0, y: 0, width: 29, height: 20, viewBox: '0 0 128 90', role: 'img', 'aria-label': 'Brasil rumo ao hexa' });
    const defs = svgEl('defs');
    const clip = svgEl('clipPath', { id: 'zd-hexa-lg-clip' });
    clip.appendChild(svgEl('rect', { x: 5, y: 5, width: 118, height: 80, rx: 24 }));
    defs.appendChild(clip);
    svg.appendChild(defs);
    svg.appendChild(svgEl('rect', { class: 'zd-hexa-lg-skin', x: 5, y: 5, width: 118, height: 80, rx: 24, fill: '#009C3B', stroke: '#06331d', 'stroke-width': 5 }));
    const g = svgEl('g', { 'clip-path': 'url(#zd-hexa-lg-clip)' });
    g.appendChild(svgEl('ellipse', { class: 'zd-hexa-lg-gloss', cx: 42, cy: 24, rx: 40, ry: 16, fill: '#ffffff', opacity: '.12' }));
    g.appendChild(svgEl('polygon', { class: 'zd-hexa-lg-dia', points: '64,17 109,45 64,73 19,45', fill: '#FFDF00', stroke: '#06331d', 'stroke-width': 4, 'stroke-linejoin': 'round' }));
    g.appendChild(svgEl('circle', { class: 'zd-hexa-lg-circ', cx: 64, cy: 45, r: 19, fill: '#002776', stroke: '#06331d', 'stroke-width': 4 }));
    g.appendChild(svgEl('polygon', { points: '57,33 57,57 79,45', fill: '#ffffff', 'stroke-linejoin': 'round' }));
    g.appendChild(svgEl('polygon', { class: 'zd-hexa-lg-glint', points: '-20,0 20,0 4,90 -36,90', fill: '#ffffff', opacity: '.22' }));
    svg.appendChild(g);
    return svg;
}

// The 6 hexa stars as a crown over the WHOLE logo — a <g> injected into the parent
// logo <svg> (93x20 space), so the arc spans the emblem AND the "YouTube" wordmark.
// They pop + twinkle in sync with the morph but do not flutter with the flag.
function buildLogoStars() {
    const group = svgEl('g', { class: 'zd-hexa-lg-stars' });
    for (const [x, y, delay] of LG_STARS) {
        const sg = svgEl('g', { transform: `translate(${x},${y}) scale(${LG_STAR_SCALE})` });
        sg.appendChild(svgEl('polygon', {
            class: 'zd-hexa-lg-star', points: LG_STAR_PTS,
            fill: '#FFDF00', stroke: '#5c4600', 'stroke-width': 1.1, 'stroke-linejoin': 'round',
            style: `animation-delay:0s,${delay}`,
        }));
        group.appendChild(sg);
    }
    return group;
}

// Swap the flag into YouTube's own logo <svg> (reusing its real "YouTube" wordmark),
// hiding just the icon paths. YouTube renders the logo as one <svg viewBox="0 0 93
// 20"> whose left ~29 units are the red icon + play triangle and whose paths from
// x~31 on are the wordmark. We hide the icon paths and nest the flag in their slot.
function ensureLogoFlag() {
    if (nodes.logo && nodes.logo.isConnected) return;
    const renderer = document.querySelector('ytd-topbar-logo-renderer');
    if (!renderer) return;
    // The visible logo (YouTube keeps hidden variants around for yoodles/lottie).
    const logo = [...renderer.querySelectorAll('svg')].find(s => {
        if ((s.getAttribute('viewBox') || '').replace(/\s+/g, ' ').trim() !== '0 0 93 20') return false;
        return s.checkVisibility ? s.checkVisibility() : !s.closest('[hidden]');
    });
    if (!logo) return;                        // logo not rendered as inline SVG (yet) — retry next tick
    logoHidden = [];
    logo.querySelectorAll('path').forEach(p => {
        let bb; try { bb = p.getBBox(); } catch { return; }   // needs the path laid out
        if (bb.width && bb.x < 30) { p.setAttribute('display', 'none'); logoHidden.push(p); }
    });
    nodes.logo = buildLogoFlag();
    logo.appendChild(nodes.logo);             // nested in the icon slot; wordmark untouched
    nodes.logoStars = buildLogoStars();
    logo.appendChild(nodes.logoStars);        // crown arcing over emblem + wordmark
    logo.style.overflow = 'visible';          // let the crown float above the logo box
    logoSvg = logo;
}

function removeNodes() {
    for (const k of Object.keys(nodes)) {
        if (nodes[k]) { nodes[k].remove(); nodes[k] = null; }
    }
    clearTimeout(inviteTimer);
    inviteTimer = null;
    clearTimeout(goalWaveTimer);       // stop any in-flight goal celebration
    goalWaveTimer = null;
    goalLayer = null;
    clearTimeout(golLogoTimer);        // the flag node itself is removed above
    golLogoTimer = null;
    for (const p of logoHidden) p.removeAttribute('display');   // un-hide YouTube's own icon
    logoHidden = [];
    if (logoSvg) { logoSvg.style.overflow = ''; logoSvg = null; }

    document.querySelectorAll('.zd-hexa-confetti,.zd-hexa-toast,.zd-hexa-invite').forEach(n => n.remove());
}

// One wave of confetti pieces appended to an existing layer: a mix of little
// Brazil flags, tricolor pennants, and flat flag-coloured bits.
function spawnConfettiWave(layer, n) {
    const colors = ['#009C3B', '#FFDF00', '#002776'];   // flag colors, no ivory
    const TRICOLOR = 'linear-gradient(#009C3B 0 33%,#FFDF00 33% 66%,#002776 66% 100%)';
    for (let i = 0; i < n; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + 'vw';
        const r = Math.floor(Math.random() * 5);
        if (r === 0) {                                  // little Brazil flag
            p.className = 'zd-hexa-bandeira';
        } else if (r === 1) {                           // tricolor pennant
            p.className = 'zd-hexa-flag';
            p.style.background = TRICOLOR;
        } else {                                        // flat confetti
            p.style.background = colors[i % colors.length];
        }
        p.style.animationDuration = (1.4 + Math.random() * 1.0) + 's';
        p.style.animationDelay = (Math.random() * 0.2) + 's';
        layer.appendChild(p);
    }
}

let goalLayer = null;      // active goal-celebration confetti layer
let goalWaveTimer = null;  // timer emitting successive waves
let goalStopAt = 0;        // wall-clock ms at which to stop emitting
let golLogoTimer = null;   // clears the logo's hard-flutter boost after a goal

/**
 * GOAL celebration — releases confetti CONTINUOUSLY for `durationMs` (default
 * 3s), emitting a fresh wave every ~200ms rather than one single burst. Called
 * on the GOL! button and on a detected goal (chat-volume spike). Re-triggering
 * while it runs just extends the end time (no pile-up). Skipped when the theme
 * is off or under reduced motion (the button is CSS-hidden there too).
 * @param {number} [durationMs]
 */
export function celebrateGoal(durationMs = 3000) {
    if (!active || reduceMotion() || isFullscreen()) return;
    goalStopAt = Date.now() + durationMs;
    // Kick the logo flag into a hard flutter for the celebration (refreshed on re-trigger).
    if (nodes.logo) {
        nodes.logo.classList.add('zd-hexa-logo-gol');
        clearTimeout(golLogoTimer);
        golLogoTimer = setTimeout(() => {
            golLogoTimer = null;
            if (nodes.logo) nodes.logo.classList.remove('zd-hexa-logo-gol');
        }, durationMs);
    }
    if (goalWaveTimer) return;                 // already celebrating — end time extended above
    goalLayer = make('div', 'zd-hexa-confetti');
    document.body.appendChild(goalLayer);
    const wave = () => {
        if (goalLayer) spawnConfettiWave(goalLayer, 16);
        if (Date.now() < goalStopAt) {
            goalWaveTimer = setTimeout(wave, 200);
        } else {
            goalWaveTimer = null;
            const layer = goalLayer;
            goalLayer = null;
            if (layer) setTimeout(() => layer.remove(), 2800);  // let the last pieces fall
        }
    };
    wave();
}

// One-shot "boot" flash on activation: a tricolor that resolves blur -> sharp,
// then clears (the page putting on the jersey). Skipped under reduced motion.
function playBoot() {
    if (reduceMotion() || isFullscreen()) return;
    const b = make('div', 'zd-hexa-boot');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 850);
}

function showToast(text) {
    if (isFullscreen()) return;   // no pop-ups over a fullscreen game
    const t = make('div', 'zd-hexa-toast', '🇧🇷 ' + (text || 'Modo Hexa ativado'));
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('zd-hexa-in'));
    setTimeout(() => {
        t.classList.remove('zd-hexa-in');
        setTimeout(() => t.remove(), 350);
    }, 3000);
}
