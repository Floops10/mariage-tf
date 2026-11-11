/**
 * silhouettes.js — T & F Mariage · les illustrations du dress code
 *
 *   · entrée : l'arche dorée se trace, puis les silhouettes se posent
 *   · au repos : le voile et les robes ondulent à peine (seulement à l'écran)
 *   · à la souris : l'illustration s'incline en relief, l'arche glisse
 *     moins que les personnages — de la profondeur sans artifice
 *   · l'essayage : survoler (ou toucher) une couleur des invités habille
 *     les trois silhouettes de cette couleur et de ses déclinaisons
 *
 * Sans animation demandée, tout est affiché immédiatement ; l'essayage
 * des couleurs, lui, fonctionne dans tous les cas.
 */
(function () {
  'use strict';

  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  /* ═════════════════════════════════════════════
     L'ESSAYAGE DES COULEURS (invités)
     ═════════════════════════════════════════════ */
  var guests = document.querySelector('.fig-guests');
  function toHex(rgb) {
    var m = String(rgb).match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (!m) return null;
    return '#' + [m[1], m[2], m[3]].map(function (v) { return (+v).toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }
  function shade(hex, k) {          /* k < 0 assombrit, k > 0 éclaircit */
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = k < 0 ? 0 : 255, a = Math.abs(k);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
  function dress(hex) {
    if (!guests || !hex) return;
    var pal = (window.TF_PALETTES || {})[hex];
    /* trois déclinaisons de la même famille : la teinte, une plus soutenue,
       une plus claire — exactement ce que dit la règle « déclinaisons comprises » */
    var g1 = hex;
    var g2 = pal ? pal[Math.min(pal.length - 1, 6)] : shade(hex, -0.18);
    var g3 = pal ? pal[1] : shade(hex, 0.16);
    var st = guests.style;
    st.setProperty('--g1', g1); st.setProperty('--g1d', shade(g1, -0.22)); st.setProperty('--g1l', shade(g1, 0.2));
    st.setProperty('--g2', g2); st.setProperty('--g2d', shade(g2, -0.22));
    st.setProperty('--g3', g3); st.setProperty('--g3d', shade(g3, -0.22));
  }
  var guestTier = guests && guests.closest('.tier');
  if (guestTier) {
    var swatches = guestTier.querySelectorAll('.swatch');
    Array.prototype.forEach.call(swatches, function (sw) {
      function go() { dress(toHex(getComputedStyle(sw.querySelector('i')).backgroundColor)); }
      sw.addEventListener('mouseenter', go);
      sw.addEventListener('focus', go);
      sw.addEventListener('click', go);
    });
  }

  if (!gsap || reduce) return;
  if (ST) gsap.registerPlugin(ST);

  function guard(tw, ms) { setTimeout(function () { if (tw && tw.progress() < 1) tw.progress(1); }, ms); return tw; }

  var figs = Array.prototype.slice.call(document.querySelectorAll('.tier-fig .fig'));
  figs.forEach(function (svg) {
    var lines = svg.querySelectorAll('.arch-line');
    var fill = svg.querySelector('.arch-fill');
    var key = svg.querySelector('.arch-key');
    var floor = svg.querySelectorAll('.fig-floor, .fig-shadow');
    var people = svg.querySelectorAll('.fig-person');

    /* ─── entrée ─── */
    Array.prototype.forEach.call(lines, function (l) {
      var len = l.getTotalLength();
      l.style.strokeDasharray = len + ' ' + len;
      l.style.strokeDashoffset = len;
    });
    gsap.set([fill, key].concat(Array.prototype.slice.call(floor)), { opacity: 0 });
    gsap.set(people, { opacity: 0, y: 16 });

    var tl = gsap.timeline({ paused: true });
    tl.to(lines, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: 0.12 }, 0)
      .to(fill, { opacity: 1, duration: 0.8, ease: 'power1.out' }, 0.25)
      .to(floor, { opacity: 1, duration: 0.6 }, 0.5)
      .to(key, { opacity: 1, duration: 0.4 }, 1.1)
      .to(people, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.16 }, 0.55);
    function play() { if (tl.progress() === 0 && !tl.isActive()) { tl.play(); guard(tl, 3200); } }
    if (ST) ST.create({ trigger: svg, start: 'top 88%', once: true, onEnter: play });
    setTimeout(function () { if (svg.getBoundingClientRect().top < window.innerHeight) play(); }, 2400);

    /* ─── au repos : le tissu respire, à peine ─── */
    var idle = gsap.timeline({ paused: true, repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
    var veil = svg.querySelector('.veil');
    var skirts = svg.querySelectorAll('.bride .dress, .gown, .guest-a .g1');
    if (veil) idle.to(veil, { rotation: 1.4, transformOrigin: '50% 0%', duration: 3.2 }, 0);
    if (skirts.length) idle.to(skirts, { skewX: 0.7, transformOrigin: '50% 0%', duration: 3.2, stagger: 0.4 }, 0);
    if (ST) ST.create({ trigger: svg, start: 'top bottom', end: 'bottom top', onToggle: function (self) { self.isActive ? idle.play() : idle.pause(); } });

    /* ─── en relief, à la souris ─── */
    if (fine) {
      var tier = svg.closest('.tier');
      var arch = svg.querySelector('.fig-arch');
      var rx = gsap.quickTo(svg, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      var ry = gsap.quickTo(svg, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      var ax = gsap.quickTo(arch, 'x', { duration: 1.1, ease: 'power3.out' });
      var px = gsap.quickTo(people, 'x', { duration: 0.9, ease: 'power3.out' });
      tier.addEventListener('pointermove', function (e) {
        var r = svg.getBoundingClientRect();
        var nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        var ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        ry(nx * 7); rx(-ny * 4); ax(-nx * 3); px(nx * 4);
      });
      tier.addEventListener('pointerleave', function () { rx(0); ry(0); ax(0); px(0); });
    }
  });
}());
