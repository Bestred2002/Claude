// myTV — cross-platform TV/Radio streaming PWA
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const STORAGE_KEY = 'mytv.listUrl';
const CHANNELS_KEY = 'mytv.channels';
const FAV_KEY = 'mytv.favs';
const TAB_KEY = 'mytv.tab';

// Lista predefinita: M3U pubblica con i canali italiani in chiaro
// (iptv-org, mantenuta dalla community su GitHub).
const DEFAULT_LIST_URL = 'https://iptv-org.github.io/iptv/countries/it.m3u';

const RADIO_STATIONS = window.RADIO_CATALOG || [];
const TV_CATALOG = window.TV_CATALOG || [];

// Inizializza preferiti di default al primo avvio
if (!localStorage.getItem('mytv.favsInit') && Array.isArray(window.DEFAULT_FAVS)) {
  localStorage.setItem('mytv.favs', JSON.stringify(window.DEFAULT_FAVS));
  localStorage.setItem('mytv.favsInit', '1');
}

function normName(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
}

// Unisce la lista caricata col catalogo: ogni canale ha sempre un logo,
// e mostra anche i canali del catalogo senza stream (placeholder).
function mergeWithCatalog(loaded) {
  const byName = new Map();
  // Prima il catalogo (così l'ordine "italiano standard" è preservato)
  for (const c of TV_CATALOG) byName.set(normName(c.name), { ...c });
  // Poi la lista caricata: aggiunge stream / sovrascrive nome
  for (const c of (loaded || [])) {
    const key = normName(c.name);
    const existing = byName.get(key);
    if (existing) {
      byName.set(key, { ...existing, ...c, logo: c.logo || existing.logo });
    } else {
      byName.set(key, c);
    }
  }
  return [...byName.values()];
}

let hls = null;
let loadedChannels = [];
let channels = mergeWithCatalog([]);
let currentTab = localStorage.getItem(TAB_KEY) || 'tv';
let currentItem = null;
let favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
let showOnlyFavs = false;
let searchQuery = '';

// ---------- List loading ----------
async function loadFromUrl(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const text = await resp.text();
  let list = parseList(text);
  if (!list || !list.length) throw new Error('Lista vuota o formato non riconosciuto');
  channels = list;
  localStorage.setItem(STORAGE_KEY, url);
  localStorage.setItem(CHANNELS_KEY, JSON.stringify(list));
  render();
}

function parseList(text) {
  text = text.trim();
  // JSON
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : (data.channels || data.list || data.items || []);
      return arr.map(normalizeChannel).filter(c => c.stream);
    } catch (e) { /* fall through */ }
  }
  // M3U/M3U8 playlist (channel list, not media manifest)
  if (text.startsWith('#EXTM3U')) {
    const lines = text.split(/\r?\n/);
    const out = [];
    let pending = null;
    for (const line of lines) {
      if (line.startsWith('#EXTINF')) {
        const nameMatch = line.match(/,(.+)$/);
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        pending = {
          name: nameMatch ? nameMatch[1].trim() : 'Canale',
          logo: logoMatch ? logoMatch[1] : null,
        };
      } else if (line && !line.startsWith('#')) {
        if (pending) {
          pending.stream = line.trim();
          out.push(pending);
          pending = null;
        }
      }
    }
    return out;
  }
  return null;
}

function normalizeChannel(c) {
  return {
    name: c.name || c.title || c.channel || 'Canale',
    stream: c.stream || c.url || c.src || c.manifest || c.hls || '',
    logo: c.logo || c.image || c.icon || null,
    color: c.color || null,
  };
}

function loadCached() {
  const cached = localStorage.getItem(CHANNELS_KEY);
  if (cached) {
    try { loadedChannels = JSON.parse(cached); } catch (e) { loadedChannels = []; }
  }
  channels = mergeWithCatalog(loadedChannels);
}

// ---------- Rendering ----------
function render() {
  const list = $('#channelList');
  list.innerHTML = '';
  const items = currentTab === 'tv' ? channels : RADIO_STATIONS;
  const filtered = items.filter(c => {
    if (showOnlyFavs && !favs.has(c.name)) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery)) return false;
    return true;
  });

  if (currentTab === 'tv' && loadedChannels.length === 0) {
    const banner = document.createElement('li');
    banner.style.listStyle = 'none';
    banner.style.padding = '12px 14px';
    banner.style.margin = '0 0 8px';
    banner.style.background = '#2a1a05';
    banner.style.color = '#ffb35a';
    banner.style.borderRadius = '12px';
    banner.style.fontSize = '14px';
    banner.innerHTML = 'Nessuna lista canali caricata. I loghi sono visibili, ma per riprodurre i canali tocca <strong>+</strong> e inserisci l\'URL della tua lista (JSON o M3U).';
    list.appendChild(banner);
  }

  for (const ch of filtered) {
    const li = document.createElement('li');
    li.className = 'channel-item';
    if (currentItem && currentItem.name === ch.name) li.classList.add('playing');

    const logo = document.createElement('div');
    logo.className = 'logo';
    if (ch.logo) {
      const img = document.createElement('img');
      img.src = ch.logo; img.alt = ch.name;
      img.onerror = () => { logo.textContent = initials(ch.name); };
      logo.appendChild(img);
    } else {
      logo.style.background = ch.color || colorFor(ch.name);
      logo.textContent = initials(ch.name);
    }

    const name = document.createElement('div');
    name.className = 'channel-name';
    name.textContent = ch.name;

    const actions = document.createElement('button');
    actions.className = 'icon-btn channel-actions';
    actions.setAttribute('aria-label', 'Opzioni');
    actions.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';
    actions.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFav(ch);
    });
    if (favs.has(ch.name)) actions.style.color = 'var(--accent)';

    li.appendChild(logo);
    li.appendChild(name);
    li.appendChild(actions);
    if (!ch.stream) {
      li.style.opacity = '0.55';
      li.addEventListener('click', () => alert('Nessuno stream disponibile per "' + ch.name + '". Carica una lista canali con il tasto +.'));
    } else {
      li.addEventListener('click', () => play(ch));
    }
    list.appendChild(li);
  }
}

function initials(name) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360}, 55%, 35%)`;
}

function toggleFav(ch) {
  if (favs.has(ch.name)) favs.delete(ch.name); else favs.add(ch.name);
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  render();
}

// ---------- Player ----------
function play(ch) {
  currentItem = ch;
  $('#nowPlaying').textContent = ch.name;
  const video = $('#video');
  if (hls) { hls.destroy(); hls = null; }

  const url = ch.stream;
  const isHls = /\.m3u8(\?|$)/i.test(url);

  if (isHls && window.Hls && Hls.isSupported()) {
    hls = new Hls({ lowLatencyMode: true });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        console.warn('HLS error', data);
      }
    });
  } else {
    video.src = url;
    video.play().catch(()=>{});
  }
  if (window.mytvBridge) window.mytvBridge.sendNowPlaying(ch.name);
  render();
}

function reloadStream() { if (currentItem) play(currentItem); }

// ---------- UI wiring ----------
function setTab(tab) {
  currentTab = tab;
  localStorage.setItem(TAB_KEY, tab);
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  render();
}

function openModal() { $('#modal').classList.remove('hidden'); $('#listUrl').value = localStorage.getItem(STORAGE_KEY) || ''; setTimeout(()=>$('#listUrl').focus(), 100); }
function closeModal() { $('#modal').classList.add('hidden'); }

function openMenu() { $('#sideMenu').classList.remove('hidden'); }
function closeMenu() { $('#sideMenu').classList.add('hidden'); }

function toggleSearch() {
  const bar = $('#searchBar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) $('#searchInput').focus();
  else { searchQuery = ''; $('#searchInput').value = ''; render(); }
}

async function enterFullscreen() {
  const el = $('#video');
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen(); // iOS
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch (e) {}
}

async function loadDefaultListIfNeeded() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  if (localStorage.getItem('mytv.defaultTried')) return;
  localStorage.setItem('mytv.defaultTried', '1');
  try {
    await loadFromUrl(DEFAULT_LIST_URL);
  } catch (e) {
    console.warn('Lista default non caricata:', e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCached();
  setTab(currentTab);
  loadDefaultListIfNeeded();

  $('#addBtn').addEventListener('click', openModal);
  $('#cancelBtn').addEventListener('click', closeModal);
  $('#loadBtn').addEventListener('click', async () => {
    const url = $('#listUrl').value.trim();
    if (!url) return;
    $('#loadBtn').textContent = 'Caricamento…';
    try {
      await loadFromUrl(url);
      closeModal();
    } catch (e) {
      alert('Errore caricamento lista: ' + e.message);
    } finally {
      $('#loadBtn').textContent = 'Carica';
    }
  });

  $('#reloadBtn').addEventListener('click', async () => {
    const url = localStorage.getItem(STORAGE_KEY);
    if (url) {
      try { await loadFromUrl(url); } catch (e) { alert('Errore: ' + e.message); }
    }
  });

  $('#menuBtn').addEventListener('click', openMenu);
  $('#closeMenuBtn').addEventListener('click', closeMenu);
  $('#sideMenu').addEventListener('click', (e) => { if (e.target.id === 'sideMenu') closeMenu(); });

  $('#restoreDefaultBtn').addEventListener('click', async () => {
    $('#restoreDefaultBtn').textContent = 'Caricamento…';
    try {
      await loadFromUrl(DEFAULT_LIST_URL);
      closeMenu();
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      $('#restoreDefaultBtn').textContent = 'Ripristina lista predefinita';
    }
  });

  $('#clearListBtn').addEventListener('click', () => {
    if (!confirm('Rimuovere la lista caricata?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CHANNELS_KEY);
    localStorage.removeItem('mytv.defaultTried');
    loadedChannels = [];
    channels = mergeWithCatalog([]);
    render();
    closeMenu();
  });
  $('#resetFavBtn').addEventListener('click', () => {
    if (!confirm('Cancellare i preferiti?')) return;
    favs = new Set();
    localStorage.setItem(FAV_KEY, '[]');
    render();
  });

  $('#favBtn').addEventListener('click', () => {
    showOnlyFavs = !showOnlyFavs;
    $('#favBtn').style.color = showOnlyFavs ? 'var(--accent)' : '';
    render();
  });

  $('#searchBtn').addEventListener('click', toggleSearch);
  $('#closeSearch').addEventListener('click', toggleSearch);
  $('#searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
  });

  $$('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));

  $('#playPauseBtn').addEventListener('click', () => {
    const v = $('#video');
    if (v.paused) v.play(); else v.pause();
  });
  $('#reloadStreamBtn').addEventListener('click', reloadStream);
  $('#fullscreenBtn').addEventListener('click', enterFullscreen);
  $('#closePlayer').addEventListener('click', () => {
    const v = $('#video');
    v.pause(); v.removeAttribute('src'); v.load();
    if (hls) { hls.destroy(); hls = null; }
    currentItem = null;
    $('#nowPlaying').textContent = '';
    render();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  // Bridge con il wrapper Electron (Mac/Win/Linux) per la barra dei menu
  if (window.mytvBridge) {
    const sendCatalog = () => {
      window.mytvBridge.sendCatalog({
        tv: channels.map(c => ({ name: c.name, stream: c.stream || null })),
        radio: RADIO_STATIONS.map(c => ({ name: c.name })),
      });
    };
    sendCatalog();
    const origRender = render;
    window.__origRender = origRender;
    // Re-invia il catalogo quando la lista cambia
    const obs = new MutationObserver(() => sendCatalog());
    obs.observe($('#channelList'), { childList: true });

    window.mytvBridge.onPlay(({ name, kind }) => {
      const pool = kind === 'radio' ? RADIO_STATIONS : channels;
      const ch = pool.find(c => c.name === name);
      if (ch) {
        setTab(kind);
        play(ch);
      }
    });
    window.mytvBridge.onToggle(() => {
      const v = $('#video');
      if (v.paused) v.play(); else v.pause();
    });
    window.mytvBridge.onStop(() => {
      const v = $('#video');
      v.pause(); v.removeAttribute('src'); v.load();
      if (hls) { hls.destroy(); hls = null; }
      currentItem = null;
      window.mytvBridge.sendNowPlaying(null);
      render();
    });
  }
});

// Notifica al wrapper il "now playing" ad ogni play()
const _origPlay = window.play;

