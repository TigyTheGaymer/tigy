/*
 * Behaviour shared by the mockup pages: ordering, the NSFW switch, prev/next,
 * share, scroll restore and the fullscreen viewer. The pages style the
 * markup with its own CSS; nothing here sets colours or type.
 */
(function () {
  var T = window.TIGY;
  var NSFW_KEY = 'tigy-mock-show-nsfw';
  var CONFIRMED_KEY = 'tigy-mock-nsfw-confirmed';
  var SCROLL_KEY = 'tigy-mock-gallery';

  /* ---------- icons (Lucide paths, 24 grid, 2px stroke) ---------- */
  var ICONS = {
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
    expand: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'external': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  };

  function icon(name, cls) {
    return (
      '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') +
      '</svg>'
    );
  }

  /* ---------- text helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function formatDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  /** Wraps placeholder text so the pages can mark it. */
  function ph(text, isPlaceholder) {
    return isPlaceholder
      ? '<span class="ph" title="Placeholder for the mockup">' + esc(text) + '</span>'
      : esc(text);
  }

  /* ---------- ordering and visibility ---------- */
  function sortDate(p) {
    return p.date || p.added || '0000-00-00';
  }

  function ordered() {
    return T.pieces.slice().sort(function (a, b) {
      var d = sortDate(b).localeCompare(sortDate(a));
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });
  }

  function visible() {
    var show = showNsfw();
    return ordered().filter(function (p) {
      return show || !p.nsfw;
    });
  }

  function byId(id) {
    for (var i = 0; i < T.pieces.length; i++) if (T.pieces[i].id === id) return T.pieces[i];
    return null;
  }

  function neighbours(id) {
    // The current piece stays in the sequence even when it is an NSFW piece
    // the visitor confirmed once with the switch off.
    var show = showNsfw();
    var list = ordered().filter(function (p) {
      return show || !p.nsfw || p.id === id;
    });
    var i = list.findIndex(function (p) {
      return p.id === id;
    });
    return {
      index: i,
      total: list.length,
      prev: i > 0 ? list[i - 1] : null,
      next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
    };
  }

  /* ---------- NSFW switch (browser-only, off by default) ---------- */
  function store(kind) {
    try {
      return kind === 'session' ? window.sessionStorage : window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function showNsfw() {
    var s = store();
    try {
      return !!s && s.getItem(NSFW_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setShowNsfw(on) {
    var s = store();
    try {
      if (s) s.setItem(NSFW_KEY, on ? '1' : '0');
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('tigy:nsfw', { detail: on }));
  }

  function confirmedOnce(id) {
    var s = store('session');
    try {
      return !!s && (s.getItem(CONFIRMED_KEY) || '').split(',').indexOf(id) >= 0;
    } catch (e) {
      return false;
    }
  }

  function confirmOnce(id) {
    var s = store('session');
    try {
      if (!s) return;
      var list = (s.getItem(CONFIRMED_KEY) || '').split(',').filter(Boolean);
      list.push(id);
      s.setItem(CONFIRMED_KEY, list.join(','));
    } catch (e) {}
  }

  /** Wires every [data-nsfw-switch] checkbox on the page to the stored choice. */
  function bindNsfwSwitches(onChange) {
    var inputs = document.querySelectorAll('[data-nsfw-switch]');
    inputs.forEach(function (input) {
      input.checked = showNsfw();
      input.addEventListener('change', function () {
        setShowNsfw(input.checked);
      });
    });
    document.addEventListener('tigy:nsfw', function (e) {
      inputs.forEach(function (input) {
        input.checked = e.detail;
      });
      if (onChange) onChange(e.detail);
    });
  }

  /* ---------- URLs ---------- */
  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function detailHref(p) {
    return 'detail.html?id=' + encodeURIComponent(p.id);
  }

  /* ---------- gallery paging and scroll restore ---------- */
  function galleryState() {
    var s = store('session');
    try {
      var raw = s && s.getItem(SCROLL_KEY + location.pathname.replace(/[^/]+$/, ''));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveGalleryState(pages) {
    var s = store('session');
    try {
      if (s)
        s.setItem(
          SCROLL_KEY + location.pathname.replace(/[^/]+$/, ''),
          JSON.stringify({ pages: pages, y: window.scrollY })
        );
    } catch (e) {}
  }

  function clearGalleryState() {
    var s = store('session');
    try {
      if (s) s.removeItem(SCROLL_KEY + location.pathname.replace(/[^/]+$/, ''));
    } catch (e) {}
  }

  /* ---------- share ---------- */
  function share(piece) {
    var url = new URL(detailHref(piece), location.href).href;
    var title = piece.title || 'Art of Tigy';
    if (navigator.share) {
      return navigator
        .share({ title: title, url: url })
        .then(function () {
          return 'shared';
        })
        .catch(function () {
          return 'cancelled';
        });
    }
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(url).then(
        function () {
          return 'copied';
        },
        function () {
          return 'failed';
        }
      );
    }
    return Promise.resolve('failed');
  }

  /* ---------- prev/next by keyboard and swipe ---------- */
  /** prevHref / nextHref are functions returning the current target, or null. */
  function bindPrevNext(prevFn, nextFn, swipeEl) {
    function go(fn) {
      var href = fn();
      if (href) location.href = href;
    }
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (document.querySelector('.viewer')) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowLeft') go(prevFn);
      if (e.key === 'ArrowRight') go(nextFn);
    });
    if (!swipeEl) return;
    var x0 = null,
      y0 = null;
    swipeEl.addEventListener(
      'touchstart',
      function (e) {
        if (e.touches.length !== 1) return;
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
      },
      { passive: true }
    );
    swipeEl.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
      if (document.querySelector('.viewer')) return;
      if (dx > 0) go(prevFn);
      if (dx < 0) go(nextFn);
    });
  }

  /* ---------- fullscreen viewer with zoom and pan ---------- */
  function openViewer(opts) {
    var prevFocus = document.activeElement;
    var root = document.createElement('div');
    root.className = 'viewer ' + (opts.className || '');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Full view: ' + (opts.alt || 'artwork'));
    root.innerHTML =
      '<div class="viewer-stage"><img class="viewer-img" draggable="false" alt=""></div>' +
      '<div class="viewer-bar">' +
      '<button type="button" class="viewer-btn" data-act="out" aria-label="Zoom out">' + icon('minus') + '</button>' +
      '<output class="viewer-zoom" aria-live="polite">Fit</output>' +
      '<button type="button" class="viewer-btn" data-act="in" aria-label="Zoom in">' + icon('plus') + '</button>' +
      '<button type="button" class="viewer-btn" data-act="fit" aria-label="Fit to screen">' + icon('fit') + '</button>' +
      '<button type="button" class="viewer-btn viewer-close" data-act="close" aria-label="Close full view">' + icon('x') + '</button>' +
      '</div>' +
      '<p class="viewer-hint">Scroll or pinch to zoom · drag to move · Esc to close</p>';

    var stage = root.querySelector('.viewer-stage');
    var img = root.querySelector('.viewer-img');
    var out = root.querySelector('.viewer-zoom');
    img.src = opts.src;
    img.alt = opts.alt || '';

    var s = 1,
      x = 0,
      y = 0;
    var MAX = 8;

    function clamp() {
      var w = img.offsetWidth * s,
        h = img.offsetHeight * s;
      var mx = Math.max(0, (w - stage.clientWidth) / 2);
      var my = Math.max(0, (h - stage.clientHeight) / 2);
      x = Math.min(mx, Math.max(-mx, x));
      y = Math.min(my, Math.max(-my, y));
    }

    function apply(animate) {
      clamp();
      img.style.transition = animate ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
      img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
      out.textContent = s <= 1.001 ? 'Fit' : Math.round(s * 100) + '%';
      root.classList.toggle('is-zoomed', s > 1.001);
    }

    function zoomAt(factor, cx, cy, animate) {
      var r = stage.getBoundingClientRect();
      var px = (cx == null ? r.left + r.width / 2 : cx) - (r.left + r.width / 2);
      var py = (cy == null ? r.top + r.height / 2 : cy) - (r.top + r.height / 2);
      var ns = Math.min(MAX, Math.max(1, s * factor));
      x = px - (px - x) * (ns / s);
      y = py - (py - y) * (ns / s);
      s = ns;
      apply(animate);
    }

    function fit() {
      s = 1;
      x = 0;
      y = 0;
      apply(true);
    }

    stage.addEventListener(
      'wheel',
      function (e) {
        e.preventDefault();
        zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY, false);
      },
      { passive: false }
    );

    var pts = new Map();
    var last = null;
    var pinch = null;
    stage.addEventListener('pointerdown', function (e) {
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      last = { x: e.clientX, y: e.clientY };
      if (pts.size === 2) {
        var a = Array.from(pts.values());
        pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), s: s };
      }
      root.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) {
        var a = Array.from(pts.values());
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        zoomAt((pinch.s * (d / pinch.d)) / s, (a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, false);
      } else if (pts.size === 1 && last) {
        x += e.clientX - last.x;
        y += e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        apply(false);
      }
    });
    function up(e) {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) {
        last = null;
        root.classList.remove('is-dragging');
      }
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('dblclick', function (e) {
      if (s > 1.001) fit();
      else zoomAt(2.5, e.clientX, e.clientY, true);
    });

    function close() {
      root.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('viewer-lock');
      setTimeout(function () {
        root.remove();
        if (prevFocus && prevFocus.focus) prevFocus.focus();
      }, 220);
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === '+' || e.key === '=') zoomAt(1.5, null, null, true);
      else if (e.key === '-') zoomAt(1 / 1.5, null, null, true);
      else if (e.key === '0') fit();
      else if (e.key === 'Tab') {
        var f = root.querySelectorAll('button');
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    }

    root.querySelector('.viewer-bar').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'in') zoomAt(1.5, null, null, true);
      if (act === 'out') zoomAt(1 / 1.5, null, null, true);
      if (act === 'fit') fit();
      if (act === 'close') close();
    });

    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('viewer-lock');
    document.body.appendChild(root);
    requestAnimationFrame(function () {
      root.classList.add('is-open');
      root.querySelector('.viewer-close').focus();
    });
    return close;
  }

  T.ui = {
    icon: icon,
    esc: esc,
    ph: ph,
    formatDate: formatDate,
    ordered: ordered,
    visible: visible,
    byId: byId,
    neighbours: neighbours,
    showNsfw: showNsfw,
    setShowNsfw: setShowNsfw,
    confirmedOnce: confirmedOnce,
    confirmOnce: confirmOnce,
    bindNsfwSwitches: bindNsfwSwitches,
    param: param,
    detailHref: detailHref,
    galleryState: galleryState,
    saveGalleryState: saveGalleryState,
    clearGalleryState: clearGalleryState,
    share: share,
    bindPrevNext: bindPrevNext,
    openViewer: openViewer,
  };
})();
