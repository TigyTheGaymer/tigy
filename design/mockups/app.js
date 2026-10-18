/* Tigy public site mockup. A photo album wearing Tigy's coat: header and markings, a justified gallery
   that loads as you scroll, a ringed-tail timeline, and a photo viewer with a credits panel. */
(function () {
  var T = window.TIGY;
  var U = T.ui;
  var esc = U.esc;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------- Tigy's markings ---------- */

  var PAW =
    '<svg class="paw" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 12.6c-3.1 0-6.3 3.4-6.3 5.9 0 1.9 1.5 2.6 3.1 2.6 1.3 0 2.1-.7 3.2-.7s1.9.7 3.2.7c1.6 0 3.1-.7 3.1-2.6 0-2.5-3.2-5.9-6.3-5.9z"/>' +
    '<ellipse cx="4.6" cy="10.4" rx="1.9" ry="2.5" transform="rotate(-22 4.6 10.4)"/>' +
    '<ellipse cx="9" cy="6.2" rx="2" ry="2.7" transform="rotate(-8 9 6.2)"/>' +
    '<ellipse cx="15" cy="6.2" rx="2" ry="2.7" transform="rotate(8 15 6.2)"/>' +
    '<ellipse cx="19.4" cy="10.4" rx="1.9" ry="2.5" transform="rotate(22 19.4 10.4)"/></svg>';
  var MARK =
    '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12.6 1.5c.9 0 1.3 1.2 1.2 3.4l-.5 15.4c-.1 1.4-.5 2.2-1.2 2.2s-1-.8-1-2.2l-.3-15.4c0-2.2.6-3.4 1.8-3.4z"/>' +
    '<path d="M4.5 8.6c4.6-1.3 10.5-1.6 15.4-.7.9.2.9 1.1 0 1.2-4.9.6-10.4.9-15.2.8-1.2 0-1.3-1-.2-1.3z"/>' +
    '<path d="M6 14.1c3.9-1 8.8-1.2 12.8-.5.8.1.8 1 0 1.1-4 .5-8.6.7-12.6.6-1 0-1.1-.9-.2-1.2z"/></svg>';
  var STRIPE_PATH = 'M0 9 C 40 2, 120 0, 200 7 C 120 13, 40 16, 0 9 Z';

  function stripe(style) {
    return '<svg viewBox="0 0 200 18" style="' + style + '" aria-hidden="true" focusable="false"><path d="' + STRIPE_PATH + '"/></svg>';
  }

  function stripesBand() {
    return (
      '<div class="stripes" aria-hidden="true">' +
      stripe('left:-2%;top:6%;width:min(34%,420px);transform:rotate(4deg)') +
      stripe('left:-3%;top:44%;width:min(24%,300px);transform:rotate(-3deg)') +
      stripe('left:-1%;top:76%;width:min(15%,190px);transform:rotate(6deg)') +
      stripe('right:-2%;top:14%;width:min(28%,360px);transform:scaleX(-1) rotate(5deg)') +
      stripe('right:-3%;top:52%;width:min(38%,460px);transform:scaleX(-1) rotate(-4deg)') +
      stripe('right:-1%;top:84%;width:min(18%,220px);transform:scaleX(-1) rotate(3deg)') +
      '</div>'
    );
  }

  function slug(s) {
    return String(s || 'tigy').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function sortDate(p) {
    return p.date || p.added;
  }

  function monthKey(p) {
    return sortDate(p).slice(0, 7);
  }

  function monthLabel(key) {
    var p = key.split('-');
    return MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  function shortMonth(key) {
    return monthLabel(key).replace(/^(\w{3})\w*/, '$1');
  }

  /* ---------- theme switch: Auto (follow the device) → Light → Dark ---------- */

  var THEME_KEY = 'tigy-mock-theme';
  var THEME_ORDER = ['auto', 'light', 'dark'];
  var THEME_ICON = { auto: 'monitor', light: 'sun', dark: 'moon' };
  var THEME_NAME = { auto: 'Automatic (follows your device)', light: 'Light', dark: 'Dark' };

  function getTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function setTheme(t) {
    var root = document.documentElement;
    if (t === 'auto') delete root.dataset.theme;
    else root.dataset.theme = t;
    try {
      if (t === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, t);
    } catch (e) {}
    paintThemeButtons();
  }

  function paintThemeButtons() {
    var t = getTheme();
    var next = THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length];
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.innerHTML = U.icon(THEME_ICON[t]);
      b.setAttribute('aria-label', 'Theme: ' + THEME_NAME[t] + '. Switch to ' + THEME_NAME[next].toLowerCase());
      b.title = 'Theme: ' + THEME_NAME[t];
    });
  }

  var themeBound = false;
  function bindTheme() {
    paintThemeButtons();
    if (themeBound) return;
    themeBound = true;
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-theme-toggle]')) return;
      var t = getTheme();
      setTheme(THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length]);
    });
  }

  function decorate() {
    bindTheme();
    // Each link shows the network's logo (Simple Icons, one colour) and the handle; the network's
    // name is kept as the accessible name. On phones the handle hides and only the logo remains.
    var brands = window.TIGY_BRANDS || {};
    var socials = T.socials
      .map(function (s) {
        var b = brands[s.brand];
        var logo = b
          ? '<svg class="brand" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + b.path + '"/></svg>'
          : esc(s.label);
        return (
          '<li><a class="pad light social" href="' + esc(s.url) + '" aria-label="' + esc(s.label + ': ' + s.handle) + '" title="' + esc(s.label) + '">' +
          logo + '<span class="handle' + (s.placeholder ? ' ph' : '') + '">' + esc(s.handle) + '</span></a></li>'
        );
      })
      .join('');
    document.querySelectorAll('[data-socials]').forEach(function (ul) {
      ul.innerHTML = socials;
    });
    document.querySelectorAll('[data-mark]').forEach(function (el) {
      el.innerHTML = MARK;
    });
    document.querySelectorAll('[data-paw]').forEach(function (el) {
      el.innerHTML = PAW;
    });
    document.querySelectorAll('.filter-chip[data-icon]').forEach(function (el) {
      el.innerHTML = U.icon(el.dataset.icon) + '<span>' + esc(el.textContent) + '</span>' + U.icon('chevron-down', 'chev');
    });
  }

  function scrollProgress() {
    var d = document.documentElement.scrollHeight - window.innerHeight;
    return d > 0 ? Math.min(1, window.scrollY / d) : 1;
  }

  /* ---------- justified rows ---------- */

  function rowsFor(items, width, targetH, gap) {
    var rows = [];
    var row = [];
    var sum = 0;
    items.forEach(function (p) {
      var ar = Math.min(2.4, Math.max(0.5, p.file.w / p.file.h));
      // Never squeeze a piece into a row that would end up much shorter than the target;
      // close the row before it instead, so pieces stay big (on phones, often one per row).
      if (row.length && (width - gap * row.length) / (sum + ar) < targetH * 0.75) {
        rows.push({ items: row, h: (width - gap * (row.length - 1)) / sum });
        row = [];
        sum = 0;
      }
      row.push({ p: p, ar: ar });
      sum += ar;
      if (sum * targetH + gap * (row.length - 1) >= width) {
        rows.push({ items: row, h: (width - gap * (row.length - 1)) / sum });
        row = [];
        sum = 0;
      }
    });
    if (row.length) rows.push({ items: row, h: Math.min(targetH * 1.1, (width - gap * (row.length - 1)) / sum) });
    return rows;
  }

  var tileCount = 0;
  function tile(it, h) {
    var p = it.p;
    var aria = (p.title || 'Untitled piece') + (p.date ? ', ' + U.formatDate(p.date) : '') + (p.nsfw ? ', NSFW' : '') + (p.animated ? ', animated' : '');
    var badges = (p.animated ? '<span class="badge">GIF</span>' : '') + (p.nsfw ? '<span class="badge nsfw">NSFW</span>' : '');
    tileCount += 1;
    return (
      '<a class="tile' + (p.file.transparent ? ' is-transparent' : '') + '" data-month="' + monthKey(p) + '" href="' + U.detailHref(p) + '" aria-label="' + esc(aria) + '"' +
      ' style="width:' + Math.floor(it.ar * h) + 'px;height:' + Math.floor(h) + 'px;--tilt:' + (tileCount % 2 ? '-1.2deg' : '1.2deg') + '">' +
      '<img src="' + esc(p.file.thumb) + '" alt="" loading="lazy" decoding="async">' +
      (badges ? '<span class="tile-badges" aria-hidden="true">' + badges + '</span>' : '') +
      '<span class="tile-label" aria-hidden="true">' + esc(p.title || 'Untitled') + '</span>' +
      '<span class="paws" aria-hidden="true">' + PAW + PAW + PAW + '</span>' +
      '</a>'
    );
  }

  /* ---------------- home ---------------- */

  function renderHome() {
    decorate();

    // The filter row and date pill sit right under the top bar, whatever its height on this screen.
    var bar = document.querySelector('.topbar');
    function barHeight() {
      document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px');
    }
    barHeight();
    window.addEventListener('resize', barHeight);
    document.getElementById('stripes').outerHTML = stripesBand();

    var photos = document.getElementById('photos');
    var sentinel = document.getElementById('sentinel');
    var meta = document.getElementById('meta');
    var count = document.getElementById('count');
    var tail = document.getElementById('tail');
    var state = U.galleryState();
    var pages = state ? state.pages : 1;
    var loading = false;

    function draw() {
      var list = U.visible();
      var shown = list.slice(0, pages * T.pageSize);
      var cs = getComputedStyle(photos);
      var width = photos.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-gap')) || 8;
      var targetH = width < 560 ? 200 : width < 1000 ? 270 : 340;

      meta.textContent = list.length + ' pieces · ' + shortMonth(monthKey(list[list.length - 1])) + ' – ' + shortMonth(monthKey(list[0]));
      count.textContent = 'Newest first';

      tileCount = 0;
      photos.innerHTML =
        '<div class="rows">' +
        rowsFor(shown, width, targetH, gap)
          .map(function (r) {
            return '<div class="row">' + r.items.map(function (it) { return tile(it, r.h); }).join('') + '</div>';
          })
          .join('') +
        '</div>';

      var done = shown.length >= list.length;
      sentinel.innerHTML = done ? 'That’s every piece. (Padded with repeats of the five provided pieces.)' : '';
      sentinel.dataset.done = done ? '1' : '';
      buildTimeline();
      setTimeout(nearEnd, 0);
    }

    // The next page loads by itself once the end of the gallery is near.
    function loadMore() {
      if (loading || sentinel.dataset.done) return;
      loading = true;
      sentinel.innerHTML = '<span class="walk" aria-hidden="true">' + PAW + PAW + PAW + PAW + '</span><span class="visually-hidden">Loading more art</span>';
      setTimeout(function () {
        pages += 1;
        loading = false;
        draw();
      }, 800);
    }

    function nearEnd() {
      if (sentinel.getBoundingClientRect().top < window.innerHeight + 300) loadMore();
    }

    function onScroll() {
      nearEnd();
      tail.style.setProperty('--p', scrollProgress());
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    photos.addEventListener('click', function (e) {
      if (e.target.closest('a.tile')) U.saveGalleryState(pages);
    });

    var raf = 0;
    new ResizeObserver(function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }).observe(photos);

    U.bindNsfwSwitches(draw);
    draw();
    datePill();

    if (state) {
      requestAnimationFrame(function () {
        window.scrollTo(0, state.y);
      });
      U.clearGalleryState();
    }
  }

  /* The month of the first piece in view, shown while scrolling. */
  function currentMonth(y) {
    var tiles = document.querySelectorAll('.tile[data-month]');
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i].getBoundingClientRect().bottom + window.scrollY >= y) return monthLabel(tiles[i].dataset.month);
    }
    return tiles.length ? monthLabel(tiles[tiles.length - 1].dataset.month) : '';
  }

  function datePill() {
    var pill = document.getElementById('date-pill');
    var timer = 0;
    window.addEventListener(
      'scroll',
      function () {
        var start = document.getElementById('photos').getBoundingClientRect().top + window.scrollY;
        if (window.scrollY < start - 120) {
          pill.classList.remove('is-on');
          return;
        }
        pill.innerHTML = PAW + esc(currentMonth(window.scrollY + 100));
        pill.classList.add('is-on');
        clearTimeout(timer);
        timer = setTimeout(function () {
          pill.classList.remove('is-on');
        }, 900);
      },
      { passive: true }
    );
  }

  /* Timeline: a ringed tail down the right edge that fills as you scroll, marks the years,
     and travels through the album when dragged or clicked. */
  var timelineBound = false;
  function buildTimeline() {
    var el = document.getElementById('timeline');
    var docH = document.documentElement.scrollHeight;
    var trackH = el.clientHeight;
    var years = {};
    document.querySelectorAll('.tile[data-month]').forEach(function (t) {
      var y = t.dataset.month.slice(0, 4);
      if (!(y in years)) years[y] = t.getBoundingClientRect().top + window.scrollY;
    });
    var lastTop = -Infinity;
    el.innerHTML =
      '<span class="track"></span><span class="fill"></span>' +
      Object.keys(years)
        .sort(function (a, b) { return years[a] - years[b] || b.localeCompare(a); })
        .map(function (y) {
          var top = Math.min(trackH - 8, Math.max(8, (years[y] / Math.max(1, docH)) * trackH, lastTop + 20));
          lastTop = top;
          return '<span class="year" style="top:' + top + 'px">' + y + '</span>';
        })
        .join('') +
      '<span class="bubble"></span>';
    el.style.setProperty('--p', scrollProgress());

    if (timelineBound) return;
    timelineBound = true;
    window.addEventListener('scroll', function () {
      el.style.setProperty('--p', scrollProgress());
    }, { passive: true });

    function at(e) {
      var r = el.getBoundingClientRect();
      var ratio = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      var d = document.documentElement.scrollHeight - window.innerHeight;
      return { y: ratio * d, py: e.clientY - r.top };
    }
    el.addEventListener('pointermove', function (e) {
      var a = at(e);
      var b = el.querySelector('.bubble');
      b.style.top = a.py + 'px';
      b.innerHTML = PAW + esc(currentMonth(a.y + 100));
      if (el.classList.contains('is-dragging')) window.scrollTo(0, a.y);
    });
    el.addEventListener('pointerdown', function (e) {
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
      window.scrollTo(0, at(e).y);
    });
    el.addEventListener('pointerup', function () {
      el.classList.remove('is-dragging');
    });
  }

  /* ---------------- the photo viewer page ---------------- */

  function personLinks(list) {
    if (!list || !list.length) return '';
    return '<span class="person-links">' + list.map(function (l) { return '<a href="' + esc(l.url) + '">' + esc(l.label) + U.icon('external') + '</a>'; }).join('') + '</span>';
  }

  function row(icon, label, html) {
    return html ? '<div class="detail-row">' + U.icon(icon) + '<div><span class="label">' + label + '</span>' + html + '</div></div>' : '';
  }

  // Artists and characters are both people, so they render the same way.
  function personHTML(person) {
    if (person.own)
      return (
        '<div class="person"><span class="person-dot own" aria-hidden="true"><img src="assets/tigy-portrait.gif" alt=""></span><div>' +
        '<span class="person-name"><a href="index.html">Tigy</a></span></div></div>'
      );
    return (
      '<div class="person"><span class="person-dot" aria-hidden="true">' + esc(person.name.charAt(0)) + '</span><div>' +
      '<span class="person-name"><a href="#">' + U.ph(person.name, person.placeholder) + '</a></span>' + personLinks(person.links) + '</div></div>'
    );
  }

  function peopleHTML(list) {
    return list.map(personHTML).join('');
  }

  var nav = { prev: null, next: null };
  var bound = false;
  var infoOpen = window.innerWidth > 1100;

  function toast(text) {
    var t = document.getElementById('toast');
    if (!text) return;
    t.innerHTML = PAW + esc(text);
    t.classList.add('is-on');
    clearTimeout(t._h);
    t._h = setTimeout(function () {
      t.classList.remove('is-on');
    }, 2200);
  }

  function renderDetail() {
    var root = document.getElementById('photo');
    var p = U.byId(U.param('id') || 'tigy-portrait');

    if (!bound) {
      bound = true;
      decorate();
      U.bindNsfwSwitches(renderDetail);
      U.bindPrevNext(function () { return nav.prev; }, function () { return nav.next; }, root);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !document.querySelector('.viewer')) location.href = 'index.html';
      });
    }
    nav.prev = nav.next = null;

    var switchHTML =
      '<button type="button" class="round theme-btn" data-theme-toggle></button>' +
      '<label class="switch"><span class="label">Show NSFW</span><input type="checkbox" role="switch" data-nsfw-switch' + (U.showNsfw() ? ' checked' : '') + '>' +
      '<span class="track" aria-hidden="true"><span class="thumb">' + PAW + '</span></span></label>';
    var left =
      '<div class="left"><a class="round" href="index.html" aria-label="Back to the album" title="Back to the album">' + U.icon('arrow-left') + '</a>' +
      '<a class="logo" href="index.html">' + MARK + 'Tigy</a></div>';

    function wireSwitch() {
      var input = root.querySelector('[data-nsfw-switch]');
      if (input)
        input.addEventListener('change', function () {
          U.setShowNsfw(input.checked);
        });
    }

    if (!p) {
      document.title = 'Not found · Tigy';
      root.className = 'photo info-closed';
      root.innerHTML =
        '<div class="stage"><div class="stage-top">' + left + '</div>' +
        '<section class="shy"><h1>No tiger here</h1><p>This piece doesn’t exist or isn’t published.</p>' +
        '<a class="pad dark" href="index.html">' + PAW + 'Back to the album</a></section></div>';
      return;
    }

    if (p.nsfw && !U.showNsfw() && !U.confirmedOnce(p.id)) {
      document.title = 'NSFW piece · Tigy';
      root.className = 'photo info-closed';
      root.innerHTML =
        '<div class="stage"><div class="stage-top">' + left + '<div class="right">' + switchHTML + '</div></div>' +
        '<section class="shy" aria-labelledby="nsfw-h">' +
        '<h1 id="nsfw-h">This one’s marked NSFW</h1>' +
        '<p>Tigy’s keeping it covered until you say so. Your choice is only remembered in this browser.</p>' +
        '<div class="choices"><button type="button" class="pad dark" data-act="once">' + PAW + 'Show this piece</button>' +
        '<button type="button" class="pad" data-act="always">Show NSFW everywhere</button></div>' +
        '</section></div>';
      wireSwitch();
      root.querySelector('[data-act="once"]').addEventListener('click', function () {
        U.confirmOnce(p.id);
        renderDetail();
      });
      root.querySelector('[data-act="always"]').addEventListener('click', function () {
        U.setShowNsfw(true);
      });
      return;
    }

    var nb = U.neighbours(p.id);
    var f = p.file;
    var title = p.title || 'Untitled';
    var ext = f.master.split('.').pop();
    document.title = title + ' · Tigy';

    var tags = p.tags.length
      ? '<div class="tags">' + p.tags.map(function (t) { return '<a href="#">#' + esc(t) + '</a>'; }).join('') + '</div>'
      : '';

    root.className = 'photo' + (infoOpen ? '' : ' info-closed');
    root.innerHTML =
      '<div class="stage">' +
      '<div class="stage-top">' + left + '<div class="right">' + switchHTML +
      '<button type="button" class="round" data-act="share" aria-label="Share" title="Share">' + U.icon('share') + '</button>' +
      '<button type="button" class="round" data-act="full" aria-label="Zoom" title="Zoom">' + U.icon('expand') + '</button>' +
      '<button type="button" class="round' + (infoOpen ? ' is-on' : '') + '" data-act="info" aria-label="Credits and info" title="Credits and info" aria-pressed="' + infoOpen + '">' + U.icon('info') + '</button>' +
      '<a class="round" href="' + esc(f.master) + '" download="' + slug(p.title) + '.' + ext + '" aria-label="Download original" title="Download original">' + U.icon('download') + '</a>' +
      '</div></div>' +
      (nb.prev ? '<a class="stage-nav prev" href="' + U.detailHref(nb.prev) + '" aria-label="Previous: ' + esc(nb.prev.title || 'Untitled piece') + '">' + U.icon('arrow-left') + '</a>' : '') +
      '<button type="button" class="stage-img' + (f.transparent ? ' is-transparent' : '') + '" aria-label="Zoom into ' + esc(title) + '">' +
      '<img src="' + esc(f.full) + '" alt="' + esc(p.title || 'Art of Tigy') + '" width="' + f.w + '" height="' + f.h + '"></button>' +
      (nb.next ? '<a class="stage-nav next" href="' + U.detailHref(nb.next) + '" aria-label="Next: ' + esc(nb.next.title || 'Untitled piece') + '">' + U.icon('arrow-right') + '</a>' : '') +
      '<span class="stage-count">' + (nb.index + 1) + ' of ' + nb.total + '</span>' +
      '</div>' +
      '<div class="info-wrap" id="info">' +
      '<article class="info" aria-labelledby="title">' +
      '<div class="info-head"><span>' + (nb.index + 1) + ' of ' + nb.total + '</span>' +
      '<button type="button" class="round" data-act="info-close" aria-label="Close credits">' + U.icon('x') + '</button></div>' +
      '<h1 id="title"' + (p.title ? '' : ' class="untitled"') + '>' + esc(title) + '</h1>' +
      (p.description ? '<p class="desc">' + esc(p.description) + '</p>' : '') +
      (p.mock ? '<p class="mock-flag">' + esc(p.mock) + '</p>' : '') +
      row('palette', 'Art by', peopleHTML(p.artists)) +
      row('users', 'Characters', peopleHTML(p.characters)) +
      row('tag', 'Tags', tags) +
      row('calendar', 'Date', p.date ? '<div class="ph" title="Placeholder for the mockup">' + U.formatDate(p.date) + '</div>' : '<div>Added ' + U.formatDate(p.added) + '</div>') +
      row('image', 'Original file', '<div>' + esc(f.masterLabel) + '</div>') +
      '<div class="info-actions">' +
      '<a class="pad dark" href="' + esc(f.master) + '" download="' + slug(p.title) + '.' + ext + '"><span style="display:inline-flex;gap:8px;align-items:center">' + PAW + 'Download original</span></a>' +
      '<button type="button" class="pad" data-act="share">' + U.icon('share') + 'Share</button>' +
      '<button type="button" class="pad light" data-act="full">' + U.icon('expand') + 'Full view</button>' +
      '</div>' +
      '</article></div>';

    wireSwitch();
    paintThemeButtons();

    function full() {
      U.openViewer({ src: f.master, alt: p.title || 'Art of Tigy' });
    }
    root.querySelector('.stage-img').addEventListener('click', full);
    root.querySelectorAll('[data-act="full"]').forEach(function (b) {
      b.addEventListener('click', full);
    });
    root.querySelectorAll('[data-act="share"]').forEach(function (b) {
      b.addEventListener('click', function () {
        U.share(p).then(function (r) {
          toast(r === 'copied' ? 'Link copied!' : r === 'shared' ? 'Shared!' : r === 'cancelled' ? '' : 'Couldn’t copy the link');
        });
      });
    });

    function setInfo(open) {
      infoOpen = open;
      root.classList.toggle('info-closed', !open);
      var b = root.querySelector('[data-act="info"]');
      b.classList.toggle('is-on', open);
      b.setAttribute('aria-pressed', String(open));
    }
    root.querySelector('[data-act="info"]').addEventListener('click', function () {
      if (window.innerWidth <= 1100) {
        document.getElementById('info').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      setInfo(!infoOpen);
    });
    root.querySelector('[data-act="info-close"]').addEventListener('click', function () {
      setInfo(false);
    });

    nav.prev = nb.prev && U.detailHref(nb.prev);
    nav.next = nb.next && U.detailHref(nb.next);
  }

  window.TigyAlbum = { home: renderHome, detail: renderDetail };
})();
