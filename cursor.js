/*
  مؤشر الماوس المخصص لنادي أديب — نسخة "أنميشن حيّ"
  ──────────────────────────────────────────────────
  الطبقات:
   1. اهتزاز عند الثبات (idle sway)
   2. فيزياء نابض spring بدل lerp للريشة
   3. تمدّد حسب السرعة على محور الجسم
   4. أثر حبر متلاشٍ
   5. رشّة حبر عند النقر
   6. غمسة عند حقول الإدخال
   7. لمعة دورية على عمود الريشة
   8. تموّج فروع الريشة (barbs) متتابع
   9. ارتجاج خفيف عند دخول hover
*/
(function () {
  'use strict';

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.top !== window.self) return;

  var STYLE_ID = 'adeeb-cursor-styles';
  if (document.getElementById(STYLE_ID)) return;

  /* ── ثوابت قابلة للضبط ───────────────────────── */
  var FEATHER_SIZE     = 24;
  var BASE_ANGLE       = -22;
  var SPRING_STIFFNESS = 0.20;
  var SPRING_DAMPING   = 0.78;
  var RING_EASE        = 0.20;
  var VEL_DAMP         = 0.82;
  var MAX_TILT         = 18;
  var TILT_GAIN        = 0.45;
  var ANGLE_EASE       = 0.15;
  var IDLE_DELAY_MS    = 350;
  var IDLE_RAMP_MS     = 600;
  var IDLE_FREQ_HZ     = 0.7;
  var IDLE_AMP_DEG     = 2.5;
  var STRETCH_MAX      = 0.22;
  var STRETCH_GAIN     = 0.012;
  var INK_POOL_SIZE    = 14;
  var INK_SPEED_THRES  = 2.5;
  var INK_LIFE_MS      = 700;
  var INK_EMIT_GAP_MS  = 28;
  var SPLAT_POOL_SIZE  = 24;
  var SPLAT_PER_CLICK  = 5;
  var SPLAT_LIFE_MS    = 550;
  var SPLAT_GRAVITY    = 320;   // px/s²
  var DIP_DURATION_MS  = 220;
  var DIP_OFFSET_PX    = 5;
  var DIP_ANGLE_DEG    = 8;
  var WOBBLE_MS        = 380;
  var WOBBLE_FREQ_HZ   = 6;
  var WOBBLE_AMP_DEG   = 6;

  /* ── CSS ─────────────────────────────────────── */
  var css = [
    'html.adeeb-cursor-active, html.adeeb-cursor-active body { cursor: none !important; }',
    'html.adeeb-cursor-active a,',
    'html.adeeb-cursor-active button,',
    'html.adeeb-cursor-active input,',
    'html.adeeb-cursor-active textarea,',
    'html.adeeb-cursor-active select,',
    'html.adeeb-cursor-active label,',
    'html.adeeb-cursor-active summary,',
    'html.adeeb-cursor-active [role="button"],',
    'html.adeeb-cursor-active [role="link"],',
    'html.adeeb-cursor-active [data-cursor],',
    'html.adeeb-cursor-active .swiper,',
    'html.adeeb-cursor-active .swiper-slide,',
    'html.adeeb-cursor-active .swiper-pagination-bullet { cursor: none !important; }',

    '.adeeb-cursor {',
    '  position: fixed; top: 0; left: 0;',
    '  pointer-events: none;',
    '  z-index: 2147483647;',
    '  will-change: transform, opacity;',
    '  opacity: 0;',
    '  transition: opacity .25s ease;',
    '}',
    '.adeeb-cursor.is-ready { opacity: 1; }',
    '.adeeb-cursor.is-hidden { opacity: 0 !important; }',

    '.adeeb-cursor-feather {',
    '  width: ' + FEATHER_SIZE + 'px; height: ' + FEATHER_SIZE + 'px;',
    '  transform-origin: 0% 100%;',
    '  filter: drop-shadow(0 2px 4px rgba(39,64,96,.35)) drop-shadow(0 0 1px rgba(255,255,255,.5));',
    '  transition: filter .25s ease;',
    '}',
    '.adeeb-cursor-feather svg { width: 100%; height: 100%; display: block; overflow: visible; }',
    '.adeeb-cursor-feather.is-hover { filter: drop-shadow(0 3px 7px rgba(61,143,214,.55)) drop-shadow(0 0 2px rgba(255,255,255,.6)); }',
    '.adeeb-cursor-feather.is-text { opacity: 0 !important; transition: opacity .12s ease-in .12s; }',
    '.adeeb-cursor-feather.is-down { filter: drop-shadow(0 1px 2px rgba(39,64,96,.6)); }',

    /* لمعة على العمود */
    '@keyframes adeeb-spine-shimmer {',
    '  0%, 65% { stroke-dashoffset: 32; opacity: 0; }',
    '  72%     { opacity: .85; }',
    '  92%     { stroke-dashoffset: -8; opacity: .4; }',
    '  100%    { stroke-dashoffset: -32; opacity: 0; }',
    '}',
    '.adeeb-cursor-feather .shimmer {',
    '  animation: adeeb-spine-shimmer 4.2s linear infinite;',
    '}',

    /* تموّج الفروع */
    '@keyframes adeeb-barb-sway {',
    '  0%, 100% { transform: rotate(0deg) scale(1); }',
    '  50%      { transform: rotate(-5deg) scale(1.08); }',
    '}',
    '.adeeb-cursor-feather .barb {',
    '  transform-box: fill-box;',
    '  transform-origin: 0% 100%;',
    '  animation: adeeb-barb-sway 1.8s ease-in-out infinite;',
    '}',
    '.adeeb-cursor-feather .barb:nth-of-type(1) { animation-delay: 0s;    }',
    '.adeeb-cursor-feather .barb:nth-of-type(2) { animation-delay: .12s;  }',
    '.adeeb-cursor-feather .barb:nth-of-type(3) { animation-delay: .24s;  }',
    '.adeeb-cursor-feather .barb:nth-of-type(4) { animation-delay: .36s;  }',
    '.adeeb-cursor-feather .barb:nth-of-type(5) { animation-delay: .48s;  }',
    '.adeeb-cursor-feather.is-hover .barb { animation-duration: 0.9s; }',
    '.adeeb-cursor-feather.is-hidden .barb,',
    '.adeeb-cursor-feather.is-hidden .shimmer,',
    '.adeeb-cursor-feather.is-text .barb,',
    '.adeeb-cursor-feather.is-text .shimmer { animation-play-state: paused; }',

    /* الحلقة */
    '.adeeb-cursor-ring {',
    '  width: 36px; height: 36px;',
    '  border: 1.5px solid rgba(61,143,214,.6);',
    '  border-radius: 50%;',
    '  background: rgba(61,143,214,.04);',
    '  transition:',
    '    width .28s cubic-bezier(.22,.9,.32,1.2),',
    '    height .28s cubic-bezier(.22,.9,.32,1.2),',
    '    border-color .2s ease,',
    '    background-color .25s ease,',
    '    border-radius .2s ease;',
    '}',
    '.adeeb-cursor-ring.is-hover {',
    '  width: 56px; height: 56px;',
    '  border-color: rgba(61,143,214,.95);',
    '  background: rgba(61,143,214,.10);',
    '}',
    '.adeeb-cursor-ring.is-text {',
    '  width: 3px; height: 26px;',
    '  border-radius: 2px;',
    '  border-color: rgba(61,143,214,0);',
    '  background: rgba(61,143,214,.85);',
    '}',
    '.adeeb-cursor-ring.is-down {',
    '  width: 26px; height: 26px;',
    '  background: rgba(61,143,214,.22);',
    '  border-color: rgba(61,143,214,.9);',
    '}',
    '.adeeb-cursor-ring.is-grab {',
    '  width: 46px; height: 46px;',
    '  border-radius: 12px;',
    '  border-color: rgba(61,143,214,.85);',
    '  background: rgba(61,143,214,.08);',
    '}',
    '.adeeb-cursor-ring.is-grab.is-down {',
    '  width: 38px; height: 38px;',
    '  background: rgba(61,143,214,.25);',
    '}',

    /* أثر الحبر */
    '.adeeb-cursor-ink {',
    '  position: fixed; top: 0; left: 0;',
    '  width: 5px; height: 5px;',
    '  margin: -2.5px 0 0 -2.5px;',
    '  border-radius: 50%;',
    '  background: radial-gradient(circle, rgba(61,143,214,.75), rgba(39,64,96,.35) 60%, transparent 100%);',
    '  pointer-events: none;',
    '  z-index: 2147483645;',
    '  opacity: 0;',
    '  will-change: transform, opacity;',
    '}',

    /* رشّة الحبر */
    '.adeeb-cursor-splat {',
    '  position: fixed; top: 0; left: 0;',
    '  width: 4px; height: 4px;',
    '  margin: -2px 0 0 -2px;',
    '  border-radius: 50%;',
    '  background: radial-gradient(circle, #3d8fd6, #274060 80%);',
    '  box-shadow: 0 0 4px rgba(61,143,214,.6);',
    '  pointer-events: none;',
    '  z-index: 2147483646;',
    '  opacity: 0;',
    '  will-change: transform, opacity;',
    '}',

    /* وضع داكن */
    '@media (prefers-color-scheme: dark) {',
    '  .adeeb-cursor-ring { border-color: rgba(107,168,226,.7); }',
    '  .adeeb-cursor-ring.is-hover { border-color: rgba(107,168,226,1); background: rgba(107,168,226,.12); }',
    '  .adeeb-cursor-ring.is-text { background: rgba(107,168,226,.9); }',
    '  .adeeb-cursor-feather { filter: drop-shadow(0 2px 5px rgba(0,0,0,.5)) drop-shadow(0 0 1px rgba(255,255,255,.6)); }',
    '  .adeeb-cursor-ink { background: radial-gradient(circle, rgba(107,168,226,.8), rgba(39,64,96,.4) 60%, transparent 100%); }',
    '}'
  ].join('\n');

  var styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.appendChild(document.createTextNode(css));
  (document.head || document.documentElement).appendChild(styleEl);

  /* ── SVG ─────────────────────────────────────── */
  var featherSVG = [
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
    '  <defs>',
    '    <linearGradient id="adeeb-feather-grad" x1="0%" y1="100%" x2="100%" y2="0%">',
    '      <stop offset="0%" stop-color="#274060"/>',
    '      <stop offset="55%" stop-color="#3d8fd6"/>',
    '      <stop offset="100%" stop-color="#9cc6ec"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <g class="feather-inner">',
    '    <path class="body" d="M 0 24 C 2 16 6 9 12 6 C 17 4 20 3 22 2 C 21 5 18 10 14 13 C 10 17 5 22 0 24 Z" ',
    '          fill="url(#adeeb-feather-grad)" stroke="rgba(39,64,96,.6)" stroke-width=".5" stroke-linejoin="round"/>',
    '    <path class="spine" d="M 0 24 C 6 18 14 10 22 2" ',
    '          stroke="rgba(255,255,255,.55)" stroke-width=".55" fill="none" stroke-linecap="round"/>',
    '    <path class="shimmer" d="M 0 24 C 6 18 14 10 22 2" ',
    '          stroke="rgba(255,255,255,.95)" stroke-width=".7" fill="none" stroke-linecap="round" ',
    '          stroke-dasharray="6 26" stroke-dashoffset="32"/>',
    '    <g class="barbs" stroke="rgba(255,255,255,.32)" stroke-width=".4" stroke-linecap="round" fill="none">',
    '      <line class="barb" x1="3"  y1="20" x2="7"  y2="16"/>',
    '      <line class="barb" x1="6"  y1="17" x2="11" y2="13"/>',
    '      <line class="barb" x1="9"  y1="14" x2="14" y2="9"/>',
    '      <line class="barb" x1="12" y1="11" x2="17" y2="6"/>',
    '      <line class="barb" x1="15" y1="8"  x2="20" y2="4"/>',
    '    </g>',
    '  </g>',
    '</svg>'
  ].join('');

  var feather = document.createElement('div');
  feather.className = 'adeeb-cursor adeeb-cursor-feather';
  feather.setAttribute('aria-hidden', 'true');
  feather.innerHTML = featherSVG;

  var featherInner = null; // يُلتقط بعد الـ attach

  var ring = document.createElement('div');
  ring.className = 'adeeb-cursor adeeb-cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  /* ── Pools ───────────────────────────────────── */
  var inkPool = [];
  var inkIndex = 0;
  var lastInkEmit = 0;

  var splatPool = [];

  function buildPools() {
    for (var i = 0; i < INK_POOL_SIZE; i++) {
      var d = document.createElement('div');
      d.className = 'adeeb-cursor-ink';
      document.body.appendChild(d);
      inkPool.push(d);
    }
    for (var j = 0; j < SPLAT_POOL_SIZE; j++) {
      var s = document.createElement('div');
      s.className = 'adeeb-cursor-splat';
      document.body.appendChild(s);
      splatPool.push({ el: s, x: 0, y: 0, vx: 0, vy: 0, life: 0, alive: false });
    }
  }

  function attach() {
    if (!document.body) return;
    document.body.appendChild(feather);
    document.body.appendChild(ring);
    featherInner = feather.querySelector('.feather-inner');
    buildPools();
    document.documentElement.classList.add('adeeb-cursor-active');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }

  /* ── حالة الحركة ─────────────────────────────── */
  var mx = -100, my = -100;
  var rx = -100, ry = -100;
  var fx = -100, fy = -100;
  var springVx = 0, springVy = 0;
  var lastMx = mx, lastMy = my;
  var velX = 0, velY = 0;
  var curAngle = BASE_ANGLE;
  var ready = false;

  var lastMoveTime = 0;
  var idleAmplitude = 0;
  var dipUntil = 0;
  var wobbleStart = 0;
  var wobbleUntil = 0;
  var wasHover = false;
  var wasText = false;

  /* ── أحداث الفأرة ───────────────────────────── */
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    lastMoveTime = performance.now();
    if (!ready) {
      rx = fx = lastMx = mx;
      ry = fy = lastMy = my;
      ready = true;
      feather.classList.add('is-ready');
      ring.classList.add('is-ready');
    }
  }, { passive: true });

  window.addEventListener('mouseleave', function () {
    feather.classList.add('is-hidden');
    ring.classList.add('is-hidden');
  });
  window.addEventListener('mouseenter', function () {
    feather.classList.remove('is-hidden');
    ring.classList.remove('is-hidden');
  });
  document.addEventListener('mousedown', function () {
    feather.classList.add('is-down');
    ring.classList.add('is-down');
    spawnSplatter(SPLAT_PER_CLICK, fx, fy, Math.PI / 2, 240, 60, 140);
  });
  document.addEventListener('mouseup', function () {
    feather.classList.remove('is-down');
    ring.classList.remove('is-down');
  });
  window.addEventListener('blur', function () {
    feather.classList.remove('is-down');
    ring.classList.remove('is-down');
  });

  /* ── محدّدات التفاعل ──────────────────────────── */
  var INTERACTIVE = [
    'a[href]','button:not([disabled])',
    'input[type="button"]','input[type="submit"]','input[type="reset"]',
    'input[type="checkbox"]','input[type="radio"]','input[type="file"]',
    'input[type="range"]','input[type="color"]',
    'select','[role="button"]','[role="link"]','[role="tab"]','[role="menuitem"]',
    '[data-cursor="hover"]','label[for]','summary',
    '.swiper-pagination-bullet','.swiper-button-next','.swiper-button-prev'
  ].join(',');

  var TEXT_FIELDS = [
    'input[type="text"]','input[type="email"]','input[type="password"]',
    'input[type="search"]','input[type="tel"]','input[type="url"]',
    'input[type="number"]','input[type="date"]','input[type="time"]',
    'input[type="datetime-local"]','input:not([type])','textarea',
    '[contenteditable="true"]','[contenteditable=""]'
  ].join(',');

  var GRAB_AREAS = [
    '.swiper:not(.swiper-thumbs)','.testimonials-swiper','[data-cursor="grab"]'
  ].join(',');

  function evaluateTarget(el) {
    if (!(el instanceof Element)) return;
    var nowText = !!el.closest(TEXT_FIELDS);
    var nowHover = !nowText && !!el.closest(INTERACTIVE);
    var nowGrab = !nowText && !nowHover && !!el.closest(GRAB_AREAS);

    if (nowText) {
      ring.classList.add('is-text');
      feather.classList.add('is-text');
      ring.classList.remove('is-hover','is-grab');
      feather.classList.remove('is-hover');
    } else if (nowHover) {
      ring.classList.add('is-hover');
      feather.classList.add('is-hover');
      ring.classList.remove('is-text','is-grab');
      feather.classList.remove('is-text');
    } else if (nowGrab) {
      ring.classList.add('is-grab');
      ring.classList.remove('is-hover','is-text');
      feather.classList.remove('is-hover','is-text');
    } else {
      ring.classList.remove('is-hover','is-text','is-grab');
      feather.classList.remove('is-hover','is-text');
    }

    var now = performance.now();
    if (nowHover && !wasHover) {
      wobbleStart = now;
      wobbleUntil = now + WOBBLE_MS;
    }
    if (nowText && !wasText) {
      dipUntil = now + DIP_DURATION_MS;
      // قطرة حبر صغيرة تمهيداً للغمس
      spawnSplatter(3, fx, fy, Math.PI / 2, 90, 30, 70);
    }
    wasHover = nowHover;
    wasText = nowText;
  }

  document.addEventListener('mouseover', function (e) { evaluateTarget(e.target); }, true);
  document.addEventListener('focusin',  function (e) { evaluateTarget(e.target); }, true);

  /* ── أثر الحبر ───────────────────────────────── */
  function emitInk(x, y) {
    var el = inkPool[inkIndex];
    inkIndex = (inkIndex + 1) % INK_POOL_SIZE;

    var jitterX = (Math.random() - 0.5) * 3;
    var jitterY = (Math.random() - 0.5) * 3;
    var startX = x + jitterX;
    var startY = y + jitterY;
    var endX = startX + (Math.random() - 0.5) * 10;
    var endY = startY + (Math.random() - 0.5) * 4 + 6;
    var startScale = 0.6 + Math.random() * 0.5;

    el.style.transition = 'none';
    el.style.transform = 'translate3d(' + startX + 'px,' + startY + 'px,0) scale(' + startScale + ')';
    el.style.opacity = '0.6';
    // إجبار reflow ليُعاد بدء transition
    void el.offsetWidth;
    el.style.transition = 'transform ' + INK_LIFE_MS + 'ms cubic-bezier(.4,.05,.2,1), opacity ' + INK_LIFE_MS + 'ms ease-out';
    el.style.transform = 'translate3d(' + endX + 'px,' + endY + 'px,0) scale(' + (startScale * 0.4) + ')';
    el.style.opacity = '0';
  }

  /* ── رشّة الحبر ─────────────────────────────── */
  function spawnSplatter(count, ox, oy, baseAngle, arcDeg, vMin, vMax) {
    var arcRad = arcDeg * Math.PI / 180;
    for (var i = 0; i < count; i++) {
      var slot = null;
      for (var j = 0; j < SPLAT_POOL_SIZE; j++) {
        if (!splatPool[j].alive) { slot = splatPool[j]; break; }
      }
      if (!slot) break; // pool ممتلئ — تجاهل
      var ang = baseAngle + (Math.random() - 0.5) * arcRad;
      var spd = vMin + Math.random() * (vMax - vMin);
      slot.x = ox;
      slot.y = oy;
      slot.vx = Math.cos(ang) * spd;
      slot.vy = Math.sin(ang) * spd;
      slot.life = 0;
      slot.alive = true;
      slot.el.style.transition = 'none';
      slot.el.style.opacity = '0.85';
      slot.el.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0) scale(1)';
    }
  }

  /* ── حلقة الأنميشن ──────────────────────────── */
  var lastFrame = 0;

  function frame(now) {
    var dt = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
    if (dt > 0.05) dt = 0.05;
    lastFrame = now;

    /* ── الحلقة (lerp بطيء) ── */
    rx += (mx - rx) * RING_EASE;
    ry += (my - ry) * RING_EASE;

    /* ── الريشة (نابض spring) ── */
    var ax = (mx - fx) * SPRING_STIFFNESS - springVx * SPRING_DAMPING;
    var ay = (my - fy) * SPRING_STIFFNESS - springVy * SPRING_DAMPING;
    springVx += ax;
    springVy += ay;
    fx += springVx;
    fy += springVy;

    /* ── السرعة المرشَّحة ── */
    velX = velX * VEL_DAMP + (mx - lastMx) * (1 - VEL_DAMP);
    velY = velY * VEL_DAMP + (my - lastMy) * (1 - VEL_DAMP);
    lastMx = mx; lastMy = my;
    var speed = Math.sqrt(velX * velX + velY * velY);

    /* ── الميلان من السرعة ── */
    var tilt = velX * TILT_GAIN;
    if (tilt > MAX_TILT) tilt = MAX_TILT;
    else if (tilt < -MAX_TILT) tilt = -MAX_TILT;
    var targetAngle = BASE_ANGLE + tilt;

    /* ── اهتزاز الثبات ── */
    var idle = (now - lastMoveTime - IDLE_DELAY_MS) / IDLE_RAMP_MS;
    if (idle < 0) idle = 0; else if (idle > 1) idle = 1;
    idleAmplitude += (idle - idleAmplitude) * 0.08;
    var sway = Math.sin(now * 0.001 * IDLE_FREQ_HZ * 2 * Math.PI) * IDLE_AMP_DEG * idleAmplitude;

    /* ── ارتجاج hover ── */
    var wobble = 0;
    if (now < wobbleUntil) {
      var t = (now - wobbleStart) / WOBBLE_MS;
      var decay = 1 - t;
      wobble = Math.sin(t * WOBBLE_FREQ_HZ * 2 * Math.PI) * WOBBLE_AMP_DEG * decay;
    }

    /* ── الغمسة ── */
    var dipPhase = 0; // 0..1..0
    var dipExtraAngle = 0;
    var dipExtraY = 0;
    if (now < dipUntil) {
      var dt2 = 1 - (dipUntil - now) / DIP_DURATION_MS; // 0..1
      // منحنى مثلثي: يصعد ثم ينزل
      dipPhase = dt2 < 0.5 ? (dt2 * 2) : (2 - dt2 * 2);
      dipExtraAngle = dipPhase * DIP_ANGLE_DEG;
      dipExtraY = dipPhase * DIP_OFFSET_PX;
    }

    /* ── الزاوية النهائية ── */
    var finalTarget = targetAngle + sway + wobble + dipExtraAngle;
    curAngle += (finalTarget - curAngle) * ANGLE_EASE;

    /* ── مقياس الحالة ── */
    var s = 1;
    if (feather.classList.contains('is-down')) s = 0.82;
    else if (feather.classList.contains('is-hover')) s = 0.92;

    /* ── تطبيق التحويلات ── */
    ring.style.transform = 'translate3d(' +
      (rx - ring.offsetWidth / 2).toFixed(1) + 'px,' +
      (ry - ring.offsetHeight / 2).toFixed(1) + 'px,0)';

    feather.style.transform = 'translate3d(' +
      fx.toFixed(1) + 'px,' +
      (fy + dipExtraY - FEATHER_SIZE).toFixed(1) + 'px,0) ' +
      'rotate(' + curAngle.toFixed(2) + 'deg) ' +
      'scale(' + s.toFixed(2) + ')';

    /* ── التمدّد على محور الجسم (rotate-scale-rotate حول الطرف) ── */
    if (featherInner) {
      var stretch = speed * STRETCH_GAIN;
      if (stretch > STRETCH_MAX) stretch = STRETCH_MAX;
      var sx = 1 + stretch;
      var sy = 1 / sx;
      // الطرف عند (0, 24) في إطار الـ SVG
      // محور الجسم عند 45° من +X (يصعد إلى أعلى-يمين)
      // → نلفّ الجسم على +X بـ rotate(45 0 24)، نتحرّج للأصل، نُقيس، نعود، ونعكس الدوران
      var tr = 'rotate(-45 0 24) translate(0 24) scale(' + sx.toFixed(3) + ' ' + sy.toFixed(3) + ') translate(0 -24) rotate(45 0 24)';
      featherInner.setAttribute('transform', tr);
    }

    /* ── إصدار أثر الحبر ── */
    if (ready && speed > INK_SPEED_THRES && (now - lastInkEmit) > INK_EMIT_GAP_MS) {
      emitInk(fx, fy);
      lastInkEmit = now;
    }

    /* ── فيزياء جسيمات الرشّة ── */
    for (var k = 0; k < SPLAT_POOL_SIZE; k++) {
      var p = splatPool[k];
      if (!p.alive) continue;
      p.life += dt * 1000;
      if (p.life >= SPLAT_LIFE_MS) {
        p.alive = false;
        p.el.style.opacity = '0';
        p.el.style.transform = 'translate3d(-1000px,-1000px,0)';
        continue;
      }
      p.vy += SPLAT_GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      var lifeT = p.life / SPLAT_LIFE_MS;
      var op = 0.85 * (1 - lifeT * lifeT);
      var sc = 1 - lifeT * 0.45;
      p.el.style.opacity = op.toFixed(3);
      p.el.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) scale(' + sc.toFixed(2) + ')';
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
