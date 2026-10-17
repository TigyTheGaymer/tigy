/*
 * Mockup content for the public site pages.
 * Real: the five art pieces, the name Tigy, the interests from the reference sheet.
 * Placeholder (marked with placeholder: true): every person other than Tigy,
 * social link, title and date.
 * People are one directory: a person is credited on a piece as an artist, as a
 * character, or both. Characters have no owners.
 * Repeats pad the gallery so paging can be judged.
 */
(function () {
  var ASSET = 'assets/';

  var FILES = {
    ref: {
      thumb: ASSET + 'tigy-ref-sheet-thumb.jpg',
      full: ASSET + 'tigy-ref-sheet-full.jpg',
      master: ASSET + 'tigy-ref-sheet.png',
      masterLabel: 'PNG · 6000 × 3650 · 10.1 MB',
      w: 6000, h: 3650, transparent: false,
    },
    pookie: {
      thumb: ASSET + 'hey-pookie-thumb.jpg',
      full: ASSET + 'hey-pookie-full.jpg',
      master: ASSET + 'hey-pookie.png',
      masterLabel: 'PNG · 1620 × 2117 · 3.5 MB',
      w: 1620, h: 2117, transparent: false,
    },
    hearts: {
      thumb: ASSET + 'tigy-hearts.png',
      full: ASSET + 'tigy-hearts.png',
      master: ASSET + 'tigy-hearts.png',
      masterLabel: 'PNG · 512 × 512 · 111 KB',
      w: 512, h: 512, transparent: true,
    },
    portrait: {
      thumb: ASSET + 'tigy-portrait.gif',
      full: ASSET + 'tigy-portrait.gif',
      master: ASSET + 'tigy-portrait.gif',
      masterLabel: 'GIF · 560 × 560 · animated · 357 KB',
      w: 560, h: 560, transparent: false,
    },
    chibi: {
      thumb: ASSET + 'tigy-chibi.png',
      full: ASSET + 'tigy-chibi.png',
      master: ASSET + 'tigy-chibi.png',
      masterLabel: 'PNG · 512 × 512 · 170 KB',
      w: 512, h: 512, transparent: true,
    },
  };

  function links() {
    return [
      { label: 'Bluesky', url: '#' },
      { label: 'Twitter', url: '#' },
    ];
  }

  // Tigy is the site's own person: credited without links, linking to the home page.
  var TIGY_PERSON = { name: 'Tigy', own: true };
  var FRIEND = { name: 'Character name', links: [{ label: 'Bluesky', url: '#' }], placeholder: true };

  var real = [
    {
      id: 'tigy-portrait',
      file: FILES.portrait,
      title: 'Tigy portrait',
      date: '2026-04-08',
      artists: [{ name: 'Artist name', links: links(), placeholder: true }],
      characters: [TIGY_PERSON],
      tags: ['animated', 'bust'],
      animated: true,
      nsfw: false,
    },
    {
      id: 'ref-sheet',
      file: FILES.ref,
      title: 'Tigy reference sheet',
      date: '2026-03-21',
      artists: [{ name: 'Artist name', links: links(), placeholder: true }],
      characters: [TIGY_PERSON],
      tags: ['reference sheet', 'full body', 'expressions'],
      description: 'Side, front and back views, with paw, eye and expression studies.',
      nsfw: false,
    },
    {
      id: 'hey-pookie',
      file: FILES.pookie,
      title: 'Hey Pookie!',
      date: '2026-02-14',
      set: 'Hey Pookie',
      artists: [{ name: 'Artist name', links: links(), placeholder: true }],
      characters: [TIGY_PERSON, FRIEND],
      tags: ['comic', 'couple'],
      description: 'A three-panel comic.',
      nsfw: false,
    },
    {
      id: 'hey-pookie-alt',
      file: FILES.pookie,
      title: 'Hey Pookie! (alternate)',
      date: '2026-02-14',
      set: 'Hey Pookie',
      artists: [{ name: 'Artist name', links: links(), placeholder: true }],
      characters: [TIGY_PERSON, FRIEND],
      tags: ['comic', 'couple'],
      nsfw: true,
      mock: 'Flagged NSFW for this mockup only, to show the NSFW states. Same image as the clean version.',
    },
    {
      id: 'happy-tigy',
      file: FILES.hearts,
      title: 'Happy Tigy',
      date: '2025-12-03',
      artists: [{ name: 'Artist name', links: links(), placeholder: true }],
      characters: [TIGY_PERSON],
      tags: ['sticker', 'chibi'],
      nsfw: false,
    },
    {
      // Only the image: no title, credits, tags or date. Sorted by the day it was added.
      id: 'chibi-tigy',
      file: FILES.chibi,
      added: '2025-11-20',
      artists: [],
      characters: [],
      tags: [],
      nsfw: false,
    },
  ];

  // Repeats of the real pieces, so the gallery has enough entries to page.
  var cycle = [real[1], real[4], real[2], real[5]];
  var repeats = [];
  for (var i = 0; i < 12; i++) {
    var src = cycle[i % cycle.length];
    var d = new Date(Date.UTC(2025, 9 - i, 12 + (i % 9)));
    var copy = Object.assign({}, src, {
      id: src.id + '-r' + (i + 1),
      repeat: true,
      set: undefined,
      nsfw: false,
      mock: undefined,
    });
    if (src.date) copy.date = d.toISOString().slice(0, 10);
    else copy.added = d.toISOString().slice(0, 10);
    repeats.push(copy);
  }

  window.TIGY = {
    profile: {
      name: 'Tigy',
      species: 'Tiger',
      interests: ['Gaming', 'Plants', 'Photography'],
      ownerName: 'Tigy',
    },
    socials: [
      { label: 'Bluesky', brand: 'bluesky', handle: '@handle', url: '#', placeholder: true },
      { label: 'Telegram', brand: 'telegram', handle: '@handle', url: '#', placeholder: true },
      { label: 'Twitter', brand: 'twitter', handle: '@handle', url: '#', placeholder: true },
      { label: 'Fur Affinity', brand: 'furaffinity', handle: 'handle', url: '#', placeholder: true },
    ],
    pieces: real.concat(repeats),
    // The real site pages 24 at a time; the mockup pages 12 so "load more" can be seen.
    pageSize: 12,
  };
})();
