/**
 * toile.js — T & F Mariage · Site RSVP
 * Moteur d'animations partagé :
 *   · .reveal / .reveal-fade / .reveal-left / .reveal-right  → IntersectionObserver
 *   · [data-draw]      → tracés SVG qui se dessinent à l'apparition
 *   · #fil / [data-fil] → fil conducteur lié au scroll + flocon voyageur
 *   · [data-parallax]  → couches qui glissent doucement au scroll
 *   · #snow            → neige légère (désactivée si reduced motion)
 *   · nav (état scrolled) + menu burger mobile
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═════════════════════════════════════════════
     REVEAL — basé sur le scroll (rAF)
     Un IntersectionObserver peut rater des éléments lors d'un
     défilement rapide ; on vérifie donc à chaque frame de scroll,
     et tout élément déjà dépassé est révélé immédiatement.
     ═════════════════════════════════════════════ */
  var pendingReveal = Array.prototype.slice.call(
    document.querySelectorAll('.reveal, .reveal-fade, .reveal-left, .reveal-right, .reveal-zoom, .reveal-pop')
  );

  /* [data-stagger] : les enfants d'un groupe apparaissent en cascade */
  Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (group) {
    var step = parseFloat(group.getAttribute('data-stagger') || '80');
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.transitionDelay = Math.round(i * step) + 'ms';
    });
  });

  function checkReveals() {
    if (!pendingReveal.length) return;
    var vh = window.innerHeight;
    pendingReveal = pendingReveal.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh - 40 || r.bottom < 0) {
        el.classList.add('in-view');
        return false;
      }
      return true;
    });
  }
  checkReveals();

  /* ═════════════════════════════════════════════
     DATA-DRAW — tracés SVG dessinés à l'apparition
     Chaque élément vectoriel du SVG marqué [data-draw] est mesuré,
     masqué (dashoffset) puis révélé en cascade quand le SVG entre
     dans le viewport.
     ═════════════════════════════════════════════ */
  function prepareDraw(svg) {
    var shapes = svg.querySelectorAll('path, circle, ellipse, line, polyline');
    shapes.forEach(function (sh, i) {
      var len;
      try { len = sh.getTotalLength(); } catch (e) { return; }
      if (!len || !isFinite(len)) return;
      sh.style.strokeDasharray = len + ' ' + len;
      sh.style.strokeDashoffset = len;
      sh.style.transition = 'none';
      sh.__drawLen = len;
      sh.__drawIdx = i;
    });
  }
  function runDraw(svg) {
    var shapes = svg.querySelectorAll('path, circle, ellipse, line, polyline');
    var stagger = parseFloat(svg.getAttribute('data-draw-stagger') || '90');
    var dur = parseFloat(svg.getAttribute('data-draw-dur') || '1100');
    shapes.forEach(function (sh) {
      if (sh.__drawLen === undefined) return;
      sh.style.transition = 'stroke-dashoffset ' + dur + 'ms cubic-bezier(0.22,1,0.36,1) ' + (sh.__drawIdx * stagger) + 'ms';
      sh.style.strokeDashoffset = '0';
    });
  }
  var pendingDraw = [];
  if (!reduceMotion) {
    pendingDraw = Array.prototype.slice.call(document.querySelectorAll('svg[data-draw]'));
    pendingDraw.forEach(prepareDraw);
  }

  function checkDraws() {
    if (!pendingDraw.length) return;
    var vh = window.innerHeight;
    pendingDraw = pendingDraw.filter(function (svg) {
      var r = svg.getBoundingClientRect();
      /* ignoré tant que masqué (display:none → rect vide) */
      if (!r.width && !r.height) return true;
      if (r.top < vh - 60 || r.bottom < 0) {
        runDraw(svg);
        return false;
      }
      return true;
    });
  }
  checkDraws();

  /* ═════════════════════════════════════════════
     FIL CONDUCTEUR — le tracé #fil-path se dessine au rythme du
     scroll dans son conteneur [data-fil] ; un flocon (#fil-marker)
     voyage le long du tracé.
     ═════════════════════════════════════════════ */
  var filWrap = document.querySelector('[data-fil]');
  var filSvg = document.getElementById('fil-svg');
  var filPath = document.getElementById('fil-path');
  var filMarker = document.getElementById('fil-marker');
  var filLen = 0;
  var filGeo = null;          /* géométrie mise en cache (recalculée au resize) */
  var lastP = -1;             /* évite les écritures redondantes */

  if (filWrap && filPath) {
    try { filLen = filPath.getTotalLength(); } catch (e) { filLen = 0; }
    if (filLen) {
      filPath.style.strokeDasharray = filLen + ' ' + filLen;
      filPath.style.strokeDashoffset = filLen;
    }
  }

  /* On mesure une seule fois (et à chaque resize) les positions —
     elles ne changent pas pendant le scroll. À chaque frame, on n'a
     donc plus aucune lecture de layout : tout est calculé, pas mesuré.
     Fini le thrash lecture/écriture qui saccadait sur mobile. */
  function measureFil() {
    if (!filLen || !filSvg) { filGeo = null; return; }
    var y = window.scrollY || window.pageYOffset;
    var rect = filWrap.getBoundingClientRect();
    var srect = filSvg.getBoundingClientRect();
    var vb = filSvg.viewBox.baseVal;
    filGeo = {
      wrapTop: rect.top + y,
      wrapH: rect.height,
      dx: srect.left - rect.left,
      dy: srect.top - rect.top,
      sx: srect.width / vb.width,
      sy: srect.height / vb.height
    };
  }

  function updateFil(y) {
    if (!filGeo) return;
    var vh = window.innerHeight;
    /* la pointe du tracé (et son marqueur) reste au milieu de l'écran */
    var rectTop = filGeo.wrapTop - y;
    var p = (vh * 0.52 - rectTop) / filGeo.wrapH;
    p = Math.max(0, Math.min(1, p));
    if (reduceMotion) p = 1;
    if (Math.abs(p - lastP) < 0.0005) return;   /* rien de neuf : on sort */
    lastP = p;
    var drawn = filLen * p;
    filPath.style.strokeDashoffset = (filLen - drawn).toFixed(1);
    if (filMarker) {
      var pt = filPath.getPointAtLength(drawn);
      var px = filGeo.dx + pt.x * filGeo.sx;
      var py = filGeo.dy + pt.y * filGeo.sy;
      filMarker.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)';
      filMarker.style.opacity = p > 0.005 && p < 0.998 ? '1' : '0';
    }
  }

  /* ═════════════════════════════════════════════
     FEUILLE QUI S'OUVRE — en haut de page la feuille garde ses
     marges ; au fil du scroll elle s'élargit en douceur jusqu'aux
     bords de l'écran (custom property --sheet-zoom, amortie).
     ═════════════════════════════════════════════ */
  var pageBody = document.querySelector('.page-body');
  var zoomCur = 0, zoomTgt = 0, zoomRunning = false;

  function zoomTick() {
    zoomCur += (zoomTgt - zoomCur) * 0.13;
    if (Math.abs(zoomTgt - zoomCur) < 0.002) {
      zoomCur = zoomTgt;
      zoomRunning = false;
    }
    pageBody.style.setProperty('--sheet-zoom', zoomCur.toFixed(4));
    /* l'élargissement déplace la mise en page : on resynchronise */
    measureFil();
    checkReveals();
    checkDraws();
    if (filGeo) updateFil(window.scrollY || window.pageYOffset);
    if (zoomRunning) requestAnimationFrame(zoomTick);
  }

  function kickSheetZoom(y) {
    if (!pageBody || reduceMotion || window.innerWidth <= 1020) return;
    zoomTgt = Math.max(0, Math.min(1, (y - 30) / 460));
    if (!zoomRunning && zoomTgt !== zoomCur) {
      zoomRunning = true;
      requestAnimationFrame(zoomTick);
    }
  }

  /* ═════════════════════════════════════════════
     PARALLAXE — [data-parallax="0.15"] glisse à une fraction du scroll
     ═════════════════════════════════════════════ */
  var paraEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));

  function updateParallax(scrollY) {
    paraEls.forEach(function (el) {
      var f = parseFloat(el.getAttribute('data-parallax') || '0.15');
      el.style.transform = 'translate3d(0,' + (scrollY * f).toFixed(1) + 'px,0)';
    });
  }
  /* la parallaxe est coûteuse au scroll mobile pour un gain quasi nul :
     on la réserve aux écrans larges */
  function parallaxOn() { return paraEls.length && !reduceMotion && window.innerWidth > 760; }

  /* ═════════════════════════════════════════════
     NAV — état scrolled + boucle scroll unique (rAF)
     ═════════════════════════════════════════════ */
  var nav = document.getElementById('mainNav');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      if (nav) nav.classList.toggle('scrolled', y > 10);
      checkReveals();
      checkDraws();
      if (filGeo) updateFil(y);
      if (parallaxOn()) updateParallax(y);
      kickSheetZoom(y);
      ticking = false;
    });
  }

  /* le resize (et la rotation mobile) invalide les positions mises en cache */
  function onResize() {
    measureFil();
    lastP = -1;
    onScroll();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  measureFil();
  onScroll();
  /* second passage une fois les polices/layout stabilisés */
  window.addEventListener('load', function () { measureFil(); lastP = -1; onScroll(); });

  /* ═════════════════════════════════════════════
     MENU BURGER (mobile)
     ═════════════════════════════════════════════ */
  var burger = document.getElementById('navBurger');
  var menu = document.getElementById('menu-overlay');
  if (burger && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setMenu(!menu.classList.contains('open'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target.closest('.menu-close')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

}());
