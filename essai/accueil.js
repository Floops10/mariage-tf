/**
 * accueil.js — T & F Mariage · la page d'accueil (version 4)
 *
 *   1. La papeterie : à la première visite, une enveloppe bleu nuit doublée
 *      de toile de Jouy apparaît, son rabat scellé s'ouvre, le faire-part
 *      en sort, puis l'encart pratique ; l'enveloppe s'efface et les deux
 *      cartes restent posées côte à côte (empilées sur téléphone).
 *      Un clic, une molette, une touche : l'animation se termine aussitôt.
 *      Aux visites suivantes de la session, les cartes apparaissent simplement.
 *   2. Nos souvenirs : un couloir de nuit, épinglé ; le scroll fait avancer
 *      la caméra, les quatorze photos viennent à vous puis filent hors champ.
 *      La dernière se pose au centre… puis s'en va à son tour.
 *   3. Poussière d'or (canvas) qui flotte dans le couloir.
 *
 * Garde-fous : rien ne reste masqué si une animation se fige (onglet en
 * arrière-plan, téléphone verrouillé). Sans animation — ou si l'appareil
 * la refuse — tout s'affiche immédiatement, photos en mosaïque.
 */
(function () {
  'use strict';

  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var root = document.documentElement;

  var hero = document.querySelector('.home-hero');
  var inv = document.querySelector('.inv');
  var det = document.querySelector('.det');
  var env = document.querySelector('.env');
  var cue = document.querySelector('.scroll-cue');
  var souv = document.getElementById('souvenirs');
  var nav = document.getElementById('mainNav');

  /* l'en-tête de la page masque les cartes dès la première image (classe
     tf-intro) pour qu'elles ne clignotent pas avant l'animation d'arrivée :
     on rend la main dès que GSAP les tient — ou tout de suite s'il n'y a pas
     d'animation. (Sans ce fichier, une minuterie CSS les réaffiche seule.) */
  function introReady() { root.classList.remove('tf-intro'); }

  if (!gsap || !ST || reduce) {
    introReady();
    if (souv) souv.classList.add('is-static');
    return;
  }
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  function guard(tween, ms) {
    setTimeout(function () { if (tween && tween.progress() < 1) tween.progress(1); }, ms);
    return tween;
  }
  function whenDoorsOpen(fn) {
    var ov = document.getElementById('t-overlay');
    var arriving = root.hasAttribute('data-trans-in') || (ov && ov.dataset.state === 'closed');
    if (!arriving) { fn(0.15); return; }
    var done = false;
    function go() { if (!done) { done = true; fn(0.25); } }
    window.addEventListener('tf:doors-open', go, { once: true });
    setTimeout(go, 1700);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function isWide() { return window.innerWidth > 900; }

  /* ═════════════════════════════════════════════
     1. LA PAPETERIE
     ═════════════════════════════════════════════ */
  var ROT_INV = -1.4, ROT_DET = 1.6;
  var introDone = false;

  function restingRotation() {
    if (isWide()) { gsap.set(inv, { rotation: ROT_INV }); gsap.set(det, { rotation: ROT_DET }); }
    else gsap.set([inv, det], { rotation: 0 });
  }

  /* une fois posées, les cartes glissent un peu au scroll — l'encart
     plus vite que le faire-part : de la profondeur, sans artifice */
  function addParallax() {
    if (!isWide()) return;
    gsap.to(inv, { y: -36, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(det, { y: -92, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    if (env) env.hidden = true;
    gsap.set([inv, det], { clearProps: 'zIndex,clipPath' });
    [inv, det].forEach(function (c) { c.style.webkitClipPath = ''; });
    gsap.set([inv, det, cue], { opacity: 1 });
    restingRotation();
    addParallax();
  }

  var seen = false;
  try { seen = sessionStorage.getItem('tf_env') === '1'; } catch (e) {}
  /* pour revoir la lettre à volonté : ajouter ?lettre à l'adresse de l'accueil */
  if (/[?&]lettre\b/.test(location.search)) seen = false;

  if (inv && det) {
    if (seen || !env) simpleEntrance(); else envelopeEntrance();
    window.addEventListener('resize', function () { if (introDone) restingRotation(); });
  }
  introReady();

  function simpleEntrance() {
    restingRotation();
    gsap.set([inv, det], { opacity: 0, y: 26 });
    gsap.set(cue, { opacity: 0 });
    whenDoorsOpen(function (d) {
      var tl = gsap.timeline({ delay: d, onComplete: finishIntro });
      tl.to(inv, { opacity: 1, y: 0, duration: 1.05, ease: 'expo.out' }, 0)
        .to(det, { opacity: 1, y: 0, duration: 1.05, ease: 'expo.out' }, 0.14)
        .to(cue, { opacity: 1, duration: 0.6 }, 0.6);
      guard(tl, 3200);
    });
    setTimeout(finishIntro, 4500);
  }

  function envelopeEntrance() {
    try { sessionStorage.setItem('tf_env', '1'); } catch (e) {}
    var wide = isWide();
    var navH = nav ? nav.offsetHeight : 64;
    var areaH = Math.min(hero.clientHeight, window.innerHeight - navH);
    var areaW = hero.clientWidth;
    /* une lettre au format paysage : 1,42 de large pour 1 de haut */
    var EW = Math.round(Math.min(wide ? 520 : 350, areaW * (wide ? 0.36 : 0.84), areaH * 0.62));
    var EH = Math.round(EW / 1.42);
    /* posée dans le bas de l'écran : la carte a toute la hauteur pour en sortir */
    var EY = Math.round(Math.min(areaH * (wide ? 0.62 : 0.66), areaH - EH / 2 - 18));
    env.style.setProperty('--ew', EW + 'px');
    env.style.setProperty('--eh', EH + 'px');
    env.style.setProperty('--seal', Math.round(Math.max(44, Math.min(66, EW * 0.17))) + 'px');
    env.hidden = false;

    var flip = env.querySelector('.env-flip');
    var flipIn = env.querySelector('.env-flip-in');
    var parts = env.querySelectorAll('.env-part');
    var flap = env.querySelector('.env-flap');
    var flapIn = env.querySelector('.env-flap-in');
    var seals = env.querySelectorAll('.env-seal');
    flip.style.top = EY + 'px';
    Array.prototype.forEach.call(parts, function (p) { p.style.top = EY + 'px'; });
    flap.style.top = (EY - EH / 2) + 'px';
    flap.style.marginTop = '0px';

    /* positions finales des cartes, mesurées sans aucune transformation */
    gsap.set([inv, det], { clearProps: 'transform' });
    var eb = env.querySelector('.env-back').getBoundingClientRect();
    var ecx = eb.left + eb.width / 2;

    /* Une carte, rangée dans la lettre : réduite à sa largeur, le haut juste
       sous le pli du rabat. Elle est plus haute que l'enveloppe : ce qui
       dépasserait en bas est rogné tant qu'elle n'est pas sortie. */
    function plan(card, k, delay) {
      var r = card.getBoundingClientRect();
      var sc = (EW * k) / r.width;
      var hs = r.height * sc;
      var top0 = eb.top + EH * 0.1;
      var excess = Math.max(0, top0 + hs - (eb.top + EH) + 3);
      /* elle monte jusqu'à ce que son pied arrive au creux de la poche,
         sans jamais passer sous la barre du haut */
      var rise = Math.max(0, Math.min(hs - EH * 0.42, top0 - (navH + 14)));
      var x = ecx - (r.left + r.width / 2);
      var y0 = top0 + hs / 2 - (r.top + r.height / 2);
      function clip() {
        var risen = y0 - gsap.getProperty(card, 'y');
        var ex = (excess - risen) / sc;
        var v = ex > 0.5 ? 'inset(-90px -90px ' + ex.toFixed(1) + 'px -90px)' : 'none';
        card.style.clipPath = v; card.style.webkitClipPath = v;
      }
      return { x: x, y0: y0, y1: y0 - rise, sc: sc, clip: clip, delay: delay };
    }
    var pi = plan(inv, 0.8, 0);
    var pd = wide ? plan(det, 0.74, 0.32) : null;

    /* dans la lettre : dos (1) < encart (2) < faire-part (3) < poche (4) < rabat (5) */
    gsap.set(inv, { x: pi.x, y: pi.y0, scale: pi.sc, rotation: 0, zIndex: 3, opacity: 0, transformOrigin: '50% 50%' });
    pi.clip();
    if (pd) { gsap.set(det, { x: pd.x, y: pd.y0, scale: pd.sc, rotation: 0, zIndex: 2, opacity: 0, transformOrigin: '50% 50%' }); pd.clip(); }
    else gsap.set(det, { opacity: 0, y: 34 });
    gsap.set(parts, { autoAlpha: 0 });
    gsap.set(flip, { autoAlpha: 0, y: 90, rotation: -7, scale: 0.92 });
    gsap.set(flipIn, { rotationY: 0 });
    gsap.set(flapIn, { rotationX: 0 });
    gsap.set(flap, { zIndex: 5 });
    gsap.set(cue, { opacity: 0 });

    var T_FLIP = 0.95, T_OPEN = 1.8, T_RISE = 2.3, T_LAND = 3.0;
    var tl = gsap.timeline({ paused: true, onComplete: finishIntro });
    /* 1. la lettre arrive, côté adresse */
    tl.to(flip, { autoAlpha: 1, y: 0, rotation: -2.5, scale: 1, duration: 0.85, ease: 'expo.out' }, 0)
    /* 2. on la retourne : le dos, ses rabats, le cachet */
      .to(flipIn, { rotationY: 180, duration: 0.8, ease: 'power2.inOut' }, T_FLIP)
      .to(flip, { rotation: 0, duration: 0.8, ease: 'power2.inOut' }, T_FLIP)
      .to(flip, { scale: 1.06, duration: 0.4, ease: 'power2.out' }, T_FLIP)
      .to(flip, { scale: 1, duration: 0.4, ease: 'power2.in' }, T_FLIP + 0.4)
      .set(parts, { autoAlpha: 1 }, T_FLIP + 0.8)
      .set(flip, { autoAlpha: 0 }, T_FLIP + 0.82)
    /* 3. le cachet cède sous le doigt, le rabat s'ouvre */
      .to(seals, { scale: 0.86, duration: 0.12, ease: 'power2.in' }, T_OPEN - 0.14)
      .to(seals, { scale: 1, duration: 0.3, ease: 'back.out(2.2)' }, T_OPEN - 0.02)
      .set(wide ? [inv, det] : inv, { opacity: 1 }, T_OPEN)
      .to(flapIn, { rotationX: 180, duration: 0.7, ease: 'power2.inOut' }, T_OPEN)
      .set(flap, { zIndex: 0 }, T_OPEN + 0.38)
    /* 4. le faire-part sort de la lettre… */
      .to(inv, { y: pi.y1, duration: 0.72, ease: 'power2.out', onUpdate: pi.clip }, T_RISE)
    /* 5. …la lettre glisse hors de l'écran par le bas, et il vient se poser en grand */
      .to(parts, { y: areaH - EY + EH, duration: 0.7, ease: 'power2.in' }, T_LAND)
      .set(parts, { autoAlpha: 0 }, T_LAND + 0.7)
      .to(inv, { x: 0, y: 0, scale: 1, rotation: wide ? ROT_INV : 0, duration: 0.95, ease: 'expo.inOut', onUpdate: pi.clip }, T_LAND);
    if (pd) {
      tl.to(det, { y: pd.y1, duration: 0.66, ease: 'power2.out', onUpdate: pd.clip }, T_RISE + pd.delay)
        .to(det, { x: 0, y: 0, scale: 1, rotation: ROT_DET, duration: 0.95, ease: 'expo.inOut', onUpdate: pd.clip }, T_LAND + 0.18);
    } else {
      tl.to(det, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }, T_LAND + 0.5);
    }
    tl.to(cue, { opacity: 1, duration: 0.5 }, T_LAND + (wide ? 0.95 : 0.8));

    /* le moindre geste termine l'animation : on ne fait jamais attendre */
    function skip() { if (tl.progress() < 1) tl.progress(1); }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
      window.addEventListener(ev, skip, { once: true, passive: true });
    });
    whenDoorsOpen(function (d) { gsap.delayedCall(d, function () { tl.play(); }); });
    setTimeout(skip, 9000);       /* garde-fou : jamais d'enveloppe figée */
    window.__tfIntro = tl;        /* pour les vérifications image par image */
  }

  /* ═════════════════════════════════════════════
     1 bis. LE COMPTE À REBOURS — il compte, quand on y arrive
     ═════════════════════════════════════════════ */
  var cd = document.getElementById('cdDays');
  var cdTarget = cd ? parseInt(cd.textContent, 10) : 0;
  if (cd && cdTarget > 0) {
    ST.create({
      trigger: cd, start: 'top 94%', once: true,
      onEnter: function count() {
        /* tant que les cartes ne sont pas posées (enveloppe), on attend : sinon il compterait sans témoin */
        if (!introDone) { setTimeout(count, 250); return; }
        var o = { v: 0 };
        cd.textContent = '0';
        var tw = gsap.to(o, {
          v: cdTarget, duration: 1.3, ease: 'power2.out', delay: 0.25,
          onUpdate: function () { cd.textContent = String(Math.round(o.v)); }
        });
        setTimeout(function () { if (tw.progress() < 1) tw.progress(1); cd.textContent = String(cdTarget); }, 3400);
      }
    });
  }

  /* ═════════════════════════════════════════════
     1 ter. L'ESSENTIEL — le fil de la journée se trace en descendant,
     chaque étape s'allume quand on l'atteint
     ═════════════════════════════════════════════ */
  var day = document.querySelector('.ess-day');
  if (day) {
    var steps = Array.prototype.slice.call(day.querySelectorAll('.ess-step'));
    var marks = [];
    var measureDay = function () {
      var h = day.offsetHeight || 1;
      marks = steps.map(function (st) { return (st.offsetTop + 30) / h; });
    };
    measureDay();
    ST.create({
      trigger: day, start: 'top 64%', end: 'bottom 64%', scrub: 0.5,
      onRefresh: measureDay,
      onUpdate: function (self) {
        var p = self.progress;
        day.style.setProperty('--p', p.toFixed(4));
        for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('is-past', p >= marks[i] - 0.015);
      }
    });
  }

  /* ═════════════════════════════════════════════
     2. NOS SOUVENIRS — le couloir épinglé
     ═════════════════════════════════════════════ */
  if (!souv) return;

  var stage = souv.querySelector('.souv-stage');
  var world = souv.querySelector('.souv-world');
  var intro = souv.querySelector('.souv-intro');
  var outro = souv.querySelector('.souv-outro');
  var bar = souv.querySelector('.souv-progress i');
  var phs = Array.prototype.slice.call(souv.querySelectorAll('.souv-ph'));
  var N = phs.length;

  var P = 1000;                      /* perspective (doit égaler le CSS) */
  var NEAR = 260, FADE = 360;        /* où une photo qui passe achève de s'effacer */
  var layout = [];
  var camEnd = 0;
  var W = 0, H = 0;

  function build() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    var mobile = W < 700;
    /* sur téléphone, une photo qui frôle l'écran le couvrirait entier :
       elle s'efface plus tôt */
    NEAR = mobile ? 380 : 260;
    FADE = mobile ? 300 : 360;
    var D = mobile ? 520 : 560;
    var D0 = mobile ? 900 : 1000;
    var DF = mobile ? 860 : 920;
    layout = phs.map(function (el, i) {
      var img = el.querySelector('img');
      var portrait = img && +img.getAttribute('height') > +img.getAttribute('width');
      var final = el.hasAttribute('data-final');
      var w;
      if (final) w = Math.min(H * 0.34, W * 0.62, 360);
      else if (mobile) w = portrait ? W * 0.46 : W * 0.6;
      else w = portrait ? Math.min(W * 0.2, 300) : Math.min(W * 0.29, 430);
      el.style.setProperty('--w', Math.round(w) + 'px');
      var side = i % 2 ? 1 : -1;
      var spread = mobile ? 0.21 : 0.27;
      var jitter = ((i * 37) % 7) / 7;
      return {
        x: final ? 0 : side * W * (spread + jitter * 0.07),
        y: final ? -H * 0.04 : (((i * 53) % 5) - 2) * H * 0.065,
        /* la dernière arrive seule : plus d'écart avant elle, pour que
           l'avant-dernière soit déjà sortie du champ quand elle se pose */
        z: final ? -(D0 + (N - 2) * D + DF) : -(D0 + i * D),
        ry: final ? 0 : -side * (mobile ? 10 : 15),
        rz: final ? 0 : (((i * 29) % 5) - 2) * 1.1,
        final: final
      };
    });
    camEnd = D0 + (N - 2) * D + DF;
  }

  var lastP = -1;
  function render(p) {
    if (Math.abs(p - lastP) < 0.0004 && p > 0.001 && p < 0.999) return;
    lastP = p;
    /* 0 → 4 % : le titre seul · 4 → 88 % : le voyage · 88 → 90 % : la
       dernière photo posée au centre · 90 → 94,5 % : elle s'éloigne et
       s'efface · 94 → 100 % : la phrase de fin, seule sur la nuit */
    var t = clamp((p - 0.04) / 0.84, 0, 1);
    var cam = camEnd * (t * t * (3 - 2 * t));
    var leave = clamp((p - 0.9) / 0.045, 0, 1);
    leave = leave * leave * (3 - 2 * leave);
    /* les photos restent en filigrane tant que le titre n'a pas disparu */
    var veil = 0.16 + 0.84 * clamp((p - 0.06) / 0.05, 0, 1);

    for (var i = 0; i < N; i++) {
      var L = layout[i], el = phs[i];
      var z = L.z + cam;
      var y = L.y;
      var op;
      if (L.final) {
        /* la dernière ne fonce pas sur la caméra : elle recule et s'efface */
        z -= 260 * leave;
        y -= 34 * leave;
        op = clamp((z + 3600) / 1000, 0, 1) * (1 - leave);
      } else if (z < -3600 || z > P - NEAR) op = 0;
      else op = Math.min(clamp((z + 3600) / 1000, 0, 1), clamp((P - NEAR - z) / FADE, 0, 1)) * (1 - leave);
      if (op <= 0.001) {
        if (el.__vis !== false) { el.style.visibility = 'hidden'; el.style.opacity = '0'; el.__vis = false; }
        continue;
      }
      if (el.__vis !== true) { el.style.visibility = 'visible'; el.__vis = true; }
      el.style.opacity = (op * veil).toFixed(3);
      el.style.transform =
        'translate3d(' + L.x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px)' +
        ' rotateY(' + L.ry + 'deg) rotateZ(' + L.rz + 'deg) translate(-50%,-50%)';
    }

    if (intro) {
      var io = 1 - clamp((p - 0.015) / 0.06, 0, 1);
      intro.style.opacity = io.toFixed(3);
      intro.style.visibility = io > 0.01 ? 'visible' : 'hidden';
      intro.style.transform = 'translate(-50%,' + (-(1 - io) * 28).toFixed(1) + 'px)';
    }
    if (outro) {
      var oo = clamp((p - 0.94) / 0.04, 0, 1);
      outro.style.opacity = oo.toFixed(3);
      outro.style.visibility = oo > 0.01 ? 'visible' : 'hidden';
      outro.style.transform = 'translate(-50%,' + ((1 - oo) * 16).toFixed(1) + 'px)';
      outro.classList.toggle('on', oo > 0.5);
    }
    if (bar) bar.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    souv.classList.toggle('is-done', p > 0.86);
  }

  build();
  phs.forEach(function (el) {
    var img = el.querySelector('img');
    if (img && img.decode) img.decode().catch(function () {});
  });

  var trig = ST.create({
    trigger: souv,
    start: function () { return 'top ' + (nav ? nav.offsetHeight : 0) + 'px'; },
    end: function () { return '+=' + Math.round(window.innerHeight * (N * 0.3 + 1.3)); },
    pin: stage,
    scrub: 0.7,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onRefresh: function (self) { build(); lastP = -1; render(self.progress); },
    onUpdate: function (self) { render(self.progress); }
  });
  render(0);

  setTimeout(function () {         /* garde-fou : les photos se montrent toujours */
    if (!phs.some(function (el) { return el.__vis; }) && trig.progress > 0.05) souv.classList.add('is-static');
  }, 6000);

  /* ─── la caméra suit un peu la main (ordinateur) ─── */
  var swayX = 0, swayY = 0, tgtX = 0, tgtY = 0;
  if (finePointer) {
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tgtX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      tgtY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    stage.addEventListener('pointerleave', function () { tgtX = 0; tgtY = 0; });
  }

  /* ═════════════════════════════════════════════
     3. POUSSIÈRE D'OR
     ═════════════════════════════════════════════ */
  var canvas = souv.querySelector('.souv-dust');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var motes = [];
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function sizeCanvas() {
    if (!ctx) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var count = W < 700 ? 30 : 60;
    motes = [];
    for (var i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * W, y: Math.random() * H,
        d: 0.35 + Math.random() * 0.65,
        r: 0.5 + Math.random() * 1.4,
        s: 0.08 + Math.random() * 0.2,
        ph: Math.random() * Math.PI * 2
      });
    }
  }
  sizeCanvas();
  window.addEventListener('resize', function () { build(); sizeCanvas(); });

  var active = false;
  ST.create({ trigger: souv, start: 'top bottom', end: 'bottom top', onToggle: function (self) { active = self.isActive; } });

  var tick = 0;
  gsap.ticker.add(function () {
    if (!active) return;
    tick += 1;
    swayX += (tgtX - swayX) * 0.05;
    swayY += (tgtY - swayY) * 0.05;
    if (finePointer) {
      world.style.transform = 'rotateY(' + (swayX * 3.2).toFixed(2) + 'deg) rotateX(' + (-swayY * 2.2).toFixed(2) + 'deg)';
    }
    if (!ctx) return;
    var prog = trig.progress;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#E8CF98';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y -= m.s * m.d;
      if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; }
      var px = m.x + swayX * 14 * m.d;
      var py = (m.y - prog * 900 * m.d) % (H + 12);
      if (py < -6) py += H + 12;
      ctx.globalAlpha = (0.2 + 0.45 * m.d) * (0.45 + 0.55 * Math.sin(tick * 0.03 + m.ph));
      ctx.beginPath();
      ctx.arc(px, py, m.r * m.d, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* ─── « Passer les photos » sans Lenis : défilement natif ─── */
  var skipBtn = souv.querySelector('.souv-skip');
  if (skipBtn && !window.tfLenis) {
    skipBtn.addEventListener('click', function (e) {
      var target = document.getElementById('essentiel');
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - (nav ? nav.offsetHeight : 0);
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  }

  window.addEventListener('load', function () { ST.refresh(); });
}());
