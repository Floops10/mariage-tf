/**
 * transitions.js — T & F Mariage · Site RSVP
 * Portes navy qui se ferment/ouvrent entre chaque navigation
 * (même système que le site des Rôles, pages et clé distinctes).
 */
(function () {
  'use strict';

  const KEY = 'tfr_t';

  const PAGES = {
    'index.html':     { eyebrow: '12 décembre 2026',        title: 'Thomy & Florian' },
    'programme.html': { eyebrow: 'Le jour J',               title: 'Le Programme' },
    'sejour.html':    { eyebrow: 'La route du domaine',     title: 'Venir au Domaine' },
    'dresscode.html': { eyebrow: 'Pour vous faire beaux',   title: 'Le Dress Code' },
    'histoire.html':  { eyebrow: 'Avec tendresse',       title: 'Photos & poème' },
    'cadeaux.html':   { eyebrow: 'Si le cœur vous en dit',   title: 'Cadeaux' },
    'contact.html':   { eyebrow: 'On est là',                title: 'Nous contacter' },
    'rsvp.html':      { eyebrow: 'Avant le 1ᵉʳ août 2026',  title: 'Confirmer ma venue' },
    '':               { eyebrow: '12 décembre 2026',        title: 'Thomy & Florian' },
  };

  const QUOTES = [
    { fr: '« L\'amour est patient, il est plein de bonté. »', ref: '1 Cor 13, 4' },
    { fr: '« Ce que Dieu a uni, que l\'homme ne le sépare pas. »', ref: 'Marc 10, 9' },
    { fr: '« Deux valent mieux qu\'un. »', ref: 'Eccl 4, 9' },
    { fr: '« Là où tu iras, j\'irai. »', ref: 'Ruth 1, 16' },
    { fr: '« L\'amour se réjouit de la vérité. »', ref: '1 Cor 13, 6' },
    { fr: '« Revêtez-vous d\'amour. »', ref: 'Col 3, 14' },
    { fr: '« Ils seront une seule chair. »', ref: 'Genèse 2, 24' },
    { fr: '« Je t\'aimerai d\'un amour éternel. »', ref: 'Jér 31, 3' },
    { fr: 'La vie est belle quand on la partage.' },
    { fr: 'L\'amour vrai se vit dans les petits riens.' },
    { fr: 'Votre présence est le plus beau des cadeaux.' },
    { fr: 'Un oui d\'hiver, un amour pour toutes les saisons.' },
    { fr: 'Le bonheur partagé est un bonheur doublé.' },
    { fr: 'Sous la neige, les cœurs se tiennent chaud.' },
    { fr: '« L\'espérance ne déçoit pas. »', ref: 'Rom 5, 5' },
    { fr: 'Être là, vraiment — c\'est la plus belle attention.' },
    { fr: '« Que tout soit fait avec amour. »', ref: '1 Cor 16, 14' },
    { fr: 'Ce jour n\'aurait pas la même saveur sans vous.' },
    { fr: 'On ne mesure pas l\'amour en années.' },
    { fr: '« Dieu est amour. »', ref: '1 Jean 4, 16' },
  ];

  function randomQuote() {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  function filename(href) {
    const p = href.replace(/[?#].*/, '').replace(/.*\//, '');
    return p || 'index.html';
  }

  document.addEventListener('DOMContentLoaded', function () {
    const ov = document.getElementById('t-overlay');
    if (!ov) return;

    const doorR  = ov.querySelector('.t-door-r');
    const eyeEl  = document.getElementById('t-eyebrow');
    const ttlEl  = document.getElementById('t-title');
    const qtEl   = document.getElementById('t-quote');

    function setMeta(fname, quote) {
      const m = PAGES[fname] || PAGES['index.html'];
      if (eyeEl) eyeEl.textContent = m.eyebrow;
      if (ttlEl) ttlEl.textContent = m.title;
      if (qtEl) {
        const q = quote || randomQuote();
        qtEl.textContent = q.fr;
        const refEl = document.getElementById('t-quote-ref');
        if (refEl) refEl.textContent = q.ref || '';
      }
    }

    function openDoors(delay) {
      setTimeout(function () {
        ov.dataset.state = 'opening';
        function onEnd(e) {
          if (e.propertyName !== 'transform') return;
          doorR.removeEventListener('transitionend', onEnd);
          delete ov.dataset.state;
          ov.style.pointerEvents = 'none';
          document.documentElement.style.background = '';
        }
        doorR.addEventListener('transitionend', onEnd);
      }, delay || 0);
    }

    function closeDoors(onClosed) {
      ov.style.pointerEvents = 'all';
      ov.dataset.state = 'closing';
      setTimeout(onClosed, 1020);
    }

    /* Arrivée via transition */
    const from = sessionStorage.getItem(KEY);
    if (from) {
      sessionStorage.removeItem(KEY);
      const storedQ = sessionStorage.getItem(KEY + '_q');
      sessionStorage.removeItem(KEY + '_q');
      setMeta(from, storedQ ? JSON.parse(storedQ) : null);
      ov.dataset.state = 'closed';
      document.documentElement.removeAttribute('data-trans-in');
      const tc = document.getElementById('__tc');
      if (tc) tc.parentNode.removeChild(tc);
      openDoors(820);
    } else {
      ov.style.pointerEvents = 'none';
    }

    /* Interception des liens internes */
    document.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (/^(#|https?:|mailto:|tel:|javascript)/i.test(href)) return;
      if (a.hasAttribute('target')) return;
      /* l'espace des mariés n'a pas de portes : navigation directe */
      if (/reponses\.html/i.test(href)) return;

      e.preventDefault();
      e.stopPropagation();

      const fname = filename(href);
      const q = randomQuote();
      setMeta(fname, q);
      sessionStorage.setItem(KEY, fname);
      sessionStorage.setItem(KEY + '_q', JSON.stringify(q));

      closeDoors(function () {
        window.location.href = href;
      });
    }, true);
  });
}());
