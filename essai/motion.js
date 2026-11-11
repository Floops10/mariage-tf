/**
 * motion.js — T & F Mariage · la couche « premium »
 *
 * Lenis (défilement amorti à la molette — le tactile reste natif) et
 * GSAP + ScrollTrigger + SplitText, tous servis par le site (vendor/).
 *
 *   · les titres montent ligne à ligne derrière un cache — ni flou, ni zoom
 *   · le cartouche d'en-tête se pose comme une carte qu'on dépose
 *   · les photos se dévoilent (rideau + image qui se pose)
 *   · les cartes et tuiles arrivent en volume, en cascade
 *   · « Haut de page » et « Texte plus grand », pour tous les âges
 *
 * Règles de la maison :
 *   1. Sans JavaScript, ou si l'appareil demande moins de mouvement,
 *      tout est affiché immédiatement, sans animation.
 *   2. Une animation qui masque un contenu a toujours un garde-fou :
 *      au pire le contenu apparaît d'un coup — il ne reste jamais caché.
 *      (rAF se fige quand l'onglet passe en arrière-plan ou que le
 *      téléphone se verrouille : sans garde-fou, un titre resterait vide.)
 *   3. Le texte ne fait que glisser et apparaître. Le volume, la
 *      profondeur et les effets « waouh » sont pour les images.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;

  /* ═════════════════════════════════════════════
     1. TAILLE DU TEXTE — deux « A », petit et grand
     La préférence est déjà appliquée dans <head> (aucun flash).
     Le réglage existe en deux exemplaires synchronisés : dans la barre
     de navigation (ordinateur) et en bas du menu (tablette, téléphone).
     ═════════════════════════════════════════════ */
  var TXT_KEY = 'tf_txt';
  var nav = document.getElementById('mainNav');
  var ctls = [];

  function refreshLayout() {
    /* tout ce qui a mesuré la page doit remesurer : ScrollTrigger,
       toile.js (fil, apparitions), le parchemin, la galerie… */
    window.dispatchEvent(new Event('resize'));
    if (ST) ST.refresh();
  }
  function syncTxt() {
    var big = root.classList.contains('txt-big');
    ctls.forEach(function (g) {
      g.querySelector('[data-size="normal"]').setAttribute('aria-pressed', big ? 'false' : 'true');
      g.querySelector('[data-size="big"]').setAttribute('aria-pressed', big ? 'true' : 'false');
    });
  }
  function setTxt(big) {
    if (big === root.classList.contains('txt-big')) return;
    root.classList.toggle('txt-big', big);
    try { localStorage.setItem(TXT_KEY, big ? '1' : '0'); } catch (e) {}
    syncTxt();
    setTimeout(refreshLayout, 60);
  }
  function makeCtl(dark) {
    var g = document.createElement('div');
    g.className = 'txt-ctl' + (dark ? ' on-dark' : '');
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Taille du texte');
    g.innerHTML =
      '<span class="txt-ctl-lbl" aria-hidden="true">Taille du texte</span>' +
      '<span class="txt-ctl-btns">' +
        '<button type="button" data-size="normal" aria-label="Texte normal" title="Texte normal"><span class="a-s" aria-hidden="true">A</span></button>' +
        '<button type="button" data-size="big" aria-label="Texte agrandi" title="Texte agrandi"><span class="a-l" aria-hidden="true">A</span></button>' +
      '</span>';
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-size]');
      if (b) setTxt(b.getAttribute('data-size') === 'big');
    });
    ctls.push(g);
    return g;
  }
  if (nav) {
    var burgerBtn = document.getElementById('navBurger');
    nav.insertBefore(makeCtl(false), burgerBtn || null);
  }
  var menuFoot = document.querySelector('#menu-overlay .menu-foot');
  if (menuFoot) menuFoot.insertBefore(makeCtl(true), menuFoot.firstChild);
  syncTxt();

  /* ═════════════════════════════════════════════
     2. HAUT DE PAGE
     ═════════════════════════════════════════════ */
  var topBtn = document.createElement('button');
  topBtn.type = 'button';
  topBtn.className = 'to-top';
  topBtn.setAttribute('aria-label', 'Revenir en haut de la page');
  topBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5.5 11.5 12 5l6.5 6.5"/></svg><span>Haut</span>';
  document.body.appendChild(topBtn);

  var lenis = null;
  topBtn.addEventListener('click', function () {
    if (lenis) lenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  /* Sur téléphone, un bouton flottant masquerait des lignes de texte
     pendant la lecture : il n'apparaît que lorsqu'on remonte (l'intention
     de revenir en haut) ou en bas de page. Sur ordinateur, les marges
     sont larges : il reste affiché dès qu'on a bien descendu. */
  var topShown = false, lastY = 0;
  function syncTop() {
    var y = window.scrollY || window.pageYOffset;
    var far = y > window.innerHeight * 1.2;
    var show = far;
    if (window.innerWidth < 700) {
      var nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 160;
      show = far && (y < lastY - 2 || nearEnd || (topShown && Math.abs(y - lastY) <= 2));
    }
    lastY = y;
    if (show !== topShown) { topShown = show; topBtn.classList.toggle('on', show); }
  }
  window.addEventListener('scroll', syncTop, { passive: true });
  syncTop();

  /* Sans GSAP (fichier non chargé, très vieux navigateur) : on s'arrête
     là. Le site reste entièrement lisible grâce à toile.js. */
  if (!gsap) return;
  if (ST) gsap.registerPlugin(ST);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  /* ═════════════════════════════════════════════
     3. LENIS — défilement amorti
     Seulement à la molette / au pavé tactile d'un ordinateur. Sur
     téléphone le défilement natif est déjà parfait (et c'est celui
     que tout le monde connaît) : on n'y touche pas.
     ═════════════════════════════════════════════ */
  if (!reduce && window.Lenis && !root.hasAttribute('data-no-lenis')) {
    var navH = nav ? nav.offsetHeight : 72;
    lenis = new window.Lenis({
      lerp: 0.11,
      smoothWheel: true,
      syncTouch: false,
      allowNestedScroll: true,        /* modales, galerie, menus : leur propre défilement */
      anchors: { offset: -(navH + 14) },
      stopInertiaOnNavigate: true,
      autoRaf: false
    });
    window.tfLenis = lenis;
    if (ST) lenis.on('scroll', ST.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    /* menu ouvert ou intro plein écran : on fige le défilement */
    var menu = document.getElementById('menu-overlay');
    if (menu && window.MutationObserver) {
      new MutationObserver(function () {
        if (menu.classList.contains('open')) lenis.stop(); else lenis.start();
      }).observe(menu, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (reduce) return;           /* règle 1 : pas d'animation demandée → rien de plus */

  /* ═════════════════════════════════════════════
     4. QUAND COMMENCER ?
     Si l'on arrive par une transition (portes navy), on attend
     qu'elles s'ouvrent, sinon l'entrée se jouerait derrière.
     ═════════════════════════════════════════════ */
  function whenDoorsOpen(fn) {
    var ov = document.getElementById('t-overlay');
    var arriving = ov && (ov.dataset.state === 'closed' || root.hasAttribute('data-trans-in'));
    if (!arriving) { fn(0); return; }
    var done = false;
    function go() { if (done) return; done = true; fn(0.15); }
    window.addEventListener('tf:doors-open', go, { once: true });
    setTimeout(go, 1600);       /* garde-fou */
  }

  /* garde-fou générique : force la fin d'un tween s'il n'a pas fini à temps */
  function guard(tween, ms) {
    setTimeout(function () {
      if (tween && tween.progress && tween.progress() < 1) tween.progress(1);
    }, ms);
    return tween;
  }

  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

  /* ═════════════════════════════════════════════
     5. LIGNES DE TITRE — montée derrière un cache
     ═════════════════════════════════════════════ */
  function splitLines(el) {
    if (!window.SplitText) return null;
    return window.SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'tf-line',
      autoSplit: true,
      onSplit: function (self) {
        /* un titre déjà joué ne doit pas se rejouer quand il se redécoupe
           (rotation du téléphone, « texte plus grand ») */
        if (el.__played) return;
        gsap.set(self.lines, { yPercent: 108 });
      }
    });
  }

  function playLines(el, delay) {
    if (el.__played) return null;
    el.__played = true;
    var lines = el.querySelectorAll('.tf-line');
    if (!lines.length) return null;
    return guard(gsap.to(lines, {
      yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.09, delay: delay || 0
    }), 2600 + (delay || 0) * 1000);
  }

  /* on retire la classe .reveal du titre lui-même : c'est désormais
     GSAP qui l'anime (sinon deux entrées se superposeraient) */
  function adopt(el) {
    el.classList.remove('reveal', 'reveal-fade', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3', 'reveal-delay-4');
    el.style.opacity = '1';
    el.style.transform = 'none';
  }

  /* Masquage immédiat, dans la même tâche que toile.js : aucune image
     intermédiaire n'est peinte, donc aucun clignement. La découpe en
     lignes, elle, attend les polices (les retours à la ligne en dépendent). */
  var heroInner = document.querySelector('.page-hero-inner');
  var heroTitle = null, heroOthers = [];
  if (heroInner) {
    var heroKids = Array.prototype.slice.call(heroInner.children);
    heroTitle = heroInner.querySelector('.page-title');
    heroKids.forEach(adopt);
    heroOthers = heroKids.filter(function (k) { return k !== heroTitle; });
    gsap.set(heroInner, { transformPerspective: 1100, transformOrigin: '50% 100%', opacity: 0, y: 26, rotationX: 9 });
    gsap.set(heroOthers, { opacity: 0, y: 12 });
    setTimeout(function () {                    /* garde-fou ultime */
      gsap.set([heroInner].concat(heroOthers), { opacity: 1, y: 0, rotationX: 0 });
      if (heroTitle) playLines(heroTitle, 0);
    }, 4200);
  }

  var sectionTitles = [];
  if (ST) {
    sectionTitles = Array.prototype.filter.call(
      document.querySelectorAll('.section-title:not([data-no-motion])'),
      function (t) { return !t.closest('#parchemin'); }
    );
    gsap.set(sectionTitles, { opacity: 0 });
    setTimeout(function () {                    /* garde-fou ultime */
      sectionTitles.forEach(function (t) {
        gsap.set(t, { opacity: 1 });
        if (t.getBoundingClientRect().top < window.innerHeight) playLines(t, 0);
      });
    }, 4200);
  }

  fontsReady.then(function () {

    /* ─── En-tête de page : le cartouche se pose ─── */
    if (heroInner) {
      if (heroTitle) splitLines(heroTitle);
      whenDoorsOpen(function (d) {
        var tl = gsap.timeline({ delay: d });
        tl.to(heroInner, { opacity: 1, y: 0, rotationX: 0, duration: 1.25, ease: 'expo.out' }, 0)
          .to(heroOthers, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.28)
          .add(function () { if (heroTitle) playLines(heroTitle, 0); }, 0.18);
        guard(tl, 3200);
      });
    }

    /* ─── Titres de section ─── */
    sectionTitles.forEach(function (t) {
      adopt(t);
      splitLines(t);
      gsap.set(t, { opacity: 1 });
      ST.create({
        trigger: t,
        start: 'top 90%',
        once: true,
        onEnter: function () { playLines(t, 0); }
      });
    });
  });

  if (!ST) return;

  /* ═════════════════════════════════════════════
     6. PHOTOS — rideau qui s'ouvre, image qui se pose
     (le texte ne zoome jamais ; une photo, si : c'est son élégance)
     ═════════════════════════════════════════════ */
  var photos = document.querySelectorAll('.dom-right img, .poem-photo img, [data-unveil] img');
  Array.prototype.forEach.call(photos, function (img) {
    var box = img.parentElement;
    if (!box || box.__unveil) return;
    box.__unveil = true;
    box.classList.add('unveil');
    gsap.set(box, { clipPath: 'inset(9% 7% 9% 7%)' });
    gsap.set(img, { scale: 1.16, transformOrigin: '50% 50%' });
    var tl = gsap.timeline({ paused: true });
    tl.to(box, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out' }, 0)
      .to(img, { scale: 1, duration: 1.9, ease: 'expo.out' }, 0);
    ST.create({
      trigger: box, start: 'top 88%', once: true,
      onEnter: function () { tl.play(); guard(tl, 3200); }
    });
    setTimeout(function () {
      if (box.getBoundingClientRect().top < window.innerHeight) { tl.play(); guard(tl, 3000); }
    }, 2600);
  });

  /* ═════════════════════════════════════════════
     7. CARTES ET TUILES — elles se posent en volume, en cascade
     On ne touche qu'aux grilles marquées data-deck pour ne pas
     doubler les .reveal de toile.js.
     ═════════════════════════════════════════════ */
  var decks = document.querySelectorAll('[data-deck]');
  Array.prototype.forEach.call(decks, function (deck) {
    var cards = Array.prototype.slice.call(deck.children);
    cards.forEach(adopt);
    gsap.set(deck, { perspective: 1200 });
    gsap.set(cards, { opacity: 0, y: 46, rotationX: -14, transformOrigin: '50% 0%' });
    var played = false;
    function play() {
      if (played) return;
      played = true;
      guard(gsap.to(cards, {
        opacity: 1, y: 0, rotationX: 0, duration: 1.1, ease: 'expo.out',
        stagger: { each: 0.08, from: 'start' },
        clearProps: 'transform'
      }), 3600);
    }
    ST.create({ trigger: deck, start: 'top 86%', once: true, onEnter: play });
    setTimeout(function () {
      if (deck.getBoundingClientRect().top < window.innerHeight) play();
    }, 2600);
  });

  /* les mesures changent quand les polices et les images arrivent */
  window.addEventListener('load', function () { ST.refresh(); });
}());
