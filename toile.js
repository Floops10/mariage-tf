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

  if (filWrap && filPath) {
    try { filLen = filPath.getTotalLength(); } catch (e) { filLen = 0; }
    if (filLen) {
      filPath.style.strokeDasharray = filLen + ' ' + filLen;
      filPath.style.strokeDashoffset = filLen;
    }
  }

  function updateFil() {
    if (!filLen) return;
    var rect = filWrap.getBoundingClientRect();
    var vh = window.innerHeight;
    /* la pointe du tracé (et son marqueur) reste au milieu de l'écran :
       le fil est dessiné jusqu'au point situé à ~52% du viewport */
    var p = (vh * 0.52 - rect.top) / rect.height;
    p = Math.max(0, Math.min(1, p));
    if (reduceMotion) p = 1;
    var drawn = filLen * p;
    filPath.style.strokeDashoffset = String(filLen - drawn);
    if (filMarker && filSvg) {
      /* le SVG est étiré (preserveAspectRatio="none") : on convertit
         les coordonnées du tracé en pixels pour le marqueur HTML */
      var pt = filPath.getPointAtLength(drawn);
      var vb = filSvg.viewBox.baseVal;
      var srect = filSvg.getBoundingClientRect();
      var px = (srect.left - rect.left) + pt.x * (srect.width / vb.width);
      var py = (srect.top - rect.top) + pt.y * (srect.height / vb.height);
      filMarker.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px)';
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
    checkReveals();
    checkDraws();
    if (filWrap && filPath) updateFil();
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
      if (filWrap && filPath) updateFil();
      if (paraEls.length && !reduceMotion) updateParallax(y);
      kickSheetZoom(y);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  /* second passage une fois les polices/layout stabilisés */
  window.addEventListener('load', onScroll);

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
