'use strict';

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const APP_VERSION = '4.0.1';
const SETTINGS_KEY = 'scraper404_definitive_settings';
const HISTORY_KEY = 'scraper404_definitive_history';
const MAX_HISTORY = 10;
const MAX_TABLE_ROWS = 1000;
const MAX_TABLE_CELLS = 300000; /* presupuesto global de celdas: protege memoria sin recortar páginas reales */
const MAX_CSS_FILES = 16;
const MAX_CSS_TOTAL = 6 * 1024 * 1024;
const MAX_LOCAL_TOTAL = 20 * 1024 * 1024;
const MAX_LOCAL_FILES = 2000;

const DEFAULT_SETTINGS = {
  proxyMode: 'auto',
  customProxy: '',
  timeout: 12000,
  maxHtml: 8 * 1024 * 1024,
  engineMode: 'auto',
  engineEndpoint: 'http://127.0.0.1:40404',
  engineKey: '',
  engineBrowser: 'chromium',
  engineWaitUntil: 'domcontentloaded',
  engineAllowPrivate: false,
  engineBlockAds: true
};

/* ===================== MOTOR DE APARIENCIA (v3.1.0) ===================== */
const APPEARANCE_KEY = 'scraper404_definitive_appearance';

const SKINS = [
  { id: 'obsidian', name: 'Obsidian', note: 'Universo 404 · oro sobre negro', swatches: ['#090b11', '#111520', '#e2b45f', '#6ad9d1'] },
  { id: 'cobalt', name: 'Cobalt', note: 'Azul técnico de alto contraste', swatches: ['#070b14', '#0f1626', '#5b9cff', '#6fe3d8'] },
  { id: 'viridian', name: 'Viridian', note: 'Verde terminal, bajo cansancio', swatches: ['#050d0b', '#0c1a16', '#4fd39a', '#96f0c6'] },
  { id: 'crimson', name: 'Crimson', note: 'Rojo forense, alerta', swatches: ['#0d0708', '#1a0e11', '#ff5f6d', '#ffa8ab'] },
  { id: 'mono', name: 'Mono', note: 'Neutro puro, sin acento cromático', swatches: ['#0a0a0b', '#131315', '#e6e6ea', '#ffffff'] },
  { id: 'paper', name: 'Paper', note: 'Claro real para lectura e impresión', swatches: ['#f4f1ea', '#ffffff', '#9a6b1f', '#1f6f6a'] }
];
const SKIN_IDS = SKINS.map((skin) => skin.id);
const DENSITIES = ['compact', 'normal', 'comfortable'];
const MOTIONS = ['on', 'off'];
const DEFAULT_APPEARANCE = { skin: 'obsidian', density: 'normal', motion: 'on' };

/* Sanea siempre: localStorage es entrada no confiable y alimenta dataset/CSS. */
function normalizeAppearance(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  return {
    skin: SKIN_IDS.includes(value.skin) ? value.skin : DEFAULT_APPEARANCE.skin,
    density: DENSITIES.includes(value.density) ? value.density : DEFAULT_APPEARANCE.density,
    motion: MOTIONS.includes(value.motion) ? value.motion : DEFAULT_APPEARANCE.motion
  };
}

function loadAppearance() {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '{}')); }
  catch { return { ...DEFAULT_APPEARANCE }; }
}

function saveAppearance() {
  try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(state.appearance)); }
  catch { /* almacenamiento no disponible */ }
}

/* Mantiene theme-color y manifest coherentes con el skin activo. */
const SKIN_THEME_COLOR = { obsidian: '#090b11', cobalt: '#070b14', viridian: '#050d0b', crimson: '#0d0708', mono: '#0a0a0b', paper: '#f4f1ea' };

function applyAppearance() {
  const root = document.documentElement;
  const { skin, density, motion } = state.appearance;
  root.dataset.skin = skin;
  root.dataset.density = density;
  root.dataset.motion = motion;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', SKIN_THEME_COLOR[skin] || SKIN_THEME_COLOR.obsidian);
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.setAttribute('content', skin === 'paper' ? 'light' : 'dark');
  syncAppearanceControls();
}

function renderSkinGrid() {
  const grid = $('skin-grid');
  if (!grid || grid.dataset.ready === '1') return;
  grid.textContent = '';
  SKINS.forEach((skin) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'skin-card';
    card.dataset.skin = skin.id;
    card.setAttribute('aria-pressed', String(state.appearance.skin === skin.id));
    const strip = document.createElement('div');
    strip.className = 'skin-card__swatches';
    skin.swatches.forEach((color) => {
      const chip = document.createElement('i');
      chip.style.background = color;
      strip.appendChild(chip);
    });
    const label = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = skin.name;
    const note = document.createElement('small');
    note.textContent = skin.note;
    label.append(name, note);
    card.append(strip, label);
    card.addEventListener('click', () => {
      state.appearance.skin = skin.id;
      saveAppearance();
      applyAppearance();
      toast(`Skin ${skin.name} aplicado.`);
    });
    grid.appendChild(card);
  });
  grid.dataset.ready = '1';
}

function syncAppearanceControls() {
  $$('#skin-grid .skin-card').forEach((card) => {
    card.setAttribute('aria-pressed', String(card.dataset.skin === state.appearance.skin));
  });
  $$('#density-seg button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.density === state.appearance.density));
  });
  $$('#motion-seg button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.motion === state.appearance.motion));
  });
}

function openSettings(tab = 'appearance') {
  configureDialogs();
  renderSkinGrid();
  syncAppearanceControls();
  switchSettingsTab(tab);
  $('settings-dialog').showModal();
}

function switchSettingsTab(tab) {
  const selected = ['appearance', 'engine', 'local'].includes(tab) ? tab : 'appearance';
  ['appearance', 'engine', 'local'].forEach((name) => {
    $(`tab-${name}`).setAttribute('aria-selected', String(selected === name));
    $(`pane-${name}`).hidden = selected !== name;
  });
  $('settings-title').textContent = selected === 'appearance' ? 'Apariencia' : selected === 'engine' ? 'Descarga web y CORS' : 'Motor local';
}

function bindAppearanceControls() {
  $('btn-skin').addEventListener('click', () => openSettings('appearance'));
  $$('.dialog__tabs button').forEach((btn) => {
    btn.addEventListener('click', () => switchSettingsTab(btn.dataset.tab));
  });
  $$('#density-seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.appearance.density = btn.dataset.density;
      saveAppearance();
      applyAppearance();
    });
  });
  $$('#motion-seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.appearance.motion = btn.dataset.motion;
      saveAppearance();
      applyAppearance();
    });
  });
}

const state = {
  mode: 'url',
  settings: loadSettings(),
  appearance: loadAppearance(),
  abortController: null,
  localFiles: [],
  document: null,
  html: '',
  css: '',
  result: null,
  selectorResults: [],
  regexResults: [],
  baseline: null,
  contentMarkdown: null,
  batchRows: [],
  batchRunning: false,
  engine: {
    connected: false,
    paired: false,
    health: null,
    lastError: '',
    lastRender: null,
    previewURL: ''
  }
};

const TECH_PATTERNS = [
  ['WordPress', /wp-content|wp-includes|wordpress/i, 'CMS'],
  ['WooCommerce', /woocommerce/i, 'E-commerce'],
  ['Shopify', /cdn\.shopify\.com|shopify-section|Shopify\.theme/i, 'E-commerce'],
  ['PrestaShop', /prestashop/i, 'E-commerce'],
  ['Magento', /Magento_|\/static\/version\d+\/frontend\/|mage\/(?:requirejs|cookies|translate)/i, 'E-commerce'],
  ['Webflow', /webflow\.com|w-webflow|data-wf-/i, 'Builder'],
  ['Wix', /wixstatic\.com|wix-code|wix-thunderbolt/i, 'Builder'],
  ['Squarespace', /squarespace\.com|static1\.squarespace/i, 'Builder'],
  ['Framer', /framerusercontent\.com|data-framer-/i, 'Builder'],
  ['React', /react(?:\.production)?\.min\.js|data-reactroot|__REACT_DEVTOOLS_GLOBAL_HOOK__/i, 'Framework'],
  ['Next.js', /\/_next\/|__NEXT_DATA__/i, 'Framework'],
  ['Vue', /vue(?:\.global|\.runtime)?(?:\.prod)?\.js|data-v-[a-f0-9]{6,}/i, 'Framework'],
  ['Nuxt', /\/_nuxt\/|__NUXT__/i, 'Framework'],
  ['Angular', /ng-version|angular(?:\.min)?\.js/i, 'Framework'],
  ['Svelte', /svelte-[a-z0-9]+|\/_app\/immutable\//i, 'Framework'],
  ['Astro', /astro-island|data-astro-cid/i, 'Framework'],
  ['Gatsby', /___gatsby|gatsby-/i, 'Framework'],
  ['jQuery', /jquery(?:-|\.)[\d.]+(?:\.min)?\.js|jquery\.min\.js/i, 'Library'],
  ['Bootstrap', /bootstrap(?:\.min)?\.(?:css|js)|class=["'][^"']*\bcontainer-fluid\b/i, 'UI framework'],
  ['Tailwind CSS', /tailwind(?:\.min)?\.css|class=["'][^"']*\b(?:sm:|md:|lg:|xl:|2xl:|bg-[a-z]+-\d{2,3}|text-[a-z]+-\d{2,3})/i, 'UI framework'],
  ['Bulma', /bulma(?:\.min)?\.css/i, 'UI framework'],
  ['Material UI / Material', /material-ui|mui\.com|mdc-/i, 'UI framework'],
  ['Font Awesome', /fontawesome|font-awesome|fa-[a-z-]+/i, 'Iconos'],
  ['Google Fonts', /fonts\.googleapis\.com|fonts\.gstatic\.com/i, 'Tipografía'],
  ['Adobe Fonts', /use\.typekit\.net/i, 'Tipografía'],
  ['Google Analytics', /google-analytics\.com|googletagmanager\.com\/gtag|gtag\(/i, 'Analytics'],
  ['Google Tag Manager', /googletagmanager\.com\/gtm|GTM-[A-Z0-9]+/i, 'Tag manager'],
  ['Meta Pixel', /connect\.facebook\.net.*fbevents|fbq\(/i, 'Tracking'],
  ['Hotjar', /static\.hotjar\.com|hj\(/i, 'Analytics'],
  ['Microsoft Clarity', /clarity\.ms|clarity\(/i, 'Analytics'],
  ['Cloudflare', /cloudflare|__cf_bm|cdn-cgi/i, 'Infraestructura'],
  ['Vercel', /vercel-insights|\.vercel\.app/i, 'Hosting'],
  ['Netlify', /netlify|\.netlify\.app/i, 'Hosting'],
  ['GitHub Pages', /github\.io/i, 'Hosting']
];

const PROXY_MODES = ['auto', 'direct', 'allorigins', 'codetabs', 'custom'];
const ALLOWED_TIMEOUTS = [8000, 12000, 18000, 25000];
const ALLOWED_HTML_LIMITS = [4 * 1024 * 1024, 8 * 1024 * 1024, 12 * 1024 * 1024];

function normalizeSettings(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  let proxyMode = PROXY_MODES.includes(value.proxyMode) ? value.proxyMode : DEFAULT_SETTINGS.proxyMode;
  const timeout = ALLOWED_TIMEOUTS.includes(Number(value.timeout)) ? Number(value.timeout) : DEFAULT_SETTINGS.timeout;
  const maxHtml = ALLOWED_HTML_LIMITS.includes(Number(value.maxHtml)) ? Number(value.maxHtml) : DEFAULT_SETTINGS.maxHtml;
  let customProxy = typeof value.customProxy === 'string' ? value.customProxy.trim().slice(0, 2000) : '';
  if (proxyMode === 'custom') {
    try {
      const parsed = new URL(customProxy.replaceAll('{url}', encodeURIComponent('https://example.com/')));
      if (!customProxy.includes('{url}') || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('invalid');
    } catch {
      proxyMode = DEFAULT_SETTINGS.proxyMode;
      customProxy = '';
    }
  }
  const engineMode = ['auto', 'local', 'browser'].includes(value.engineMode) ? value.engineMode : DEFAULT_SETTINGS.engineMode;
  let engineEndpoint = typeof value.engineEndpoint === 'string' ? value.engineEndpoint.trim().slice(0, 500) : DEFAULT_SETTINGS.engineEndpoint;
  try {
    const parsed = new URL(engineEndpoint);
    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('invalid');
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    engineEndpoint = parsed.href.replace(/\/$/, '');
  } catch { engineEndpoint = DEFAULT_SETTINGS.engineEndpoint; }
  const engineKey = typeof value.engineKey === 'string' ? value.engineKey.trim().slice(0, 256) : '';
  const engineBrowser = ['chromium', 'chrome', 'msedge', 'firefox', 'webkit'].includes(value.engineBrowser) ? value.engineBrowser : DEFAULT_SETTINGS.engineBrowser;
  const engineWaitUntil = ['domcontentloaded', 'load', 'networkidle'].includes(value.engineWaitUntil) ? value.engineWaitUntil : DEFAULT_SETTINGS.engineWaitUntil;
  return {
    proxyMode, customProxy, timeout, maxHtml,
    engineMode, engineEndpoint, engineKey, engineBrowser, engineWaitUntil,
    engineAllowPrivate: Boolean(value.engineAllowPrivate),
    engineBlockAds: value.engineBlockAds !== false
  };
}

function loadSettings() {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
  catch { toast('El navegador no permite guardar ajustes en esta sesión.'); }
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-ES');
}

function slugify(value) {
  return String(value || 'scraper-404')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9áéíóúüñ]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'scraper-404';
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function csvEscape(value) {
  let text = String(value ?? '').replace(/\r?\n/g, ' ');
  /* Excel/Sheets tratan =,+,-,@ y tambien TAB/CR iniciales como formula. */
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCSV(rows, columns) {
  const header = columns.map(([label]) => csvEscape(label)).join(',');
  const lines = rows.map((row) => columns.map(([, key]) => csvEscape(typeof key === 'function' ? key(row) : row[key])).join(','));
  return `\uFEFF${[header, ...lines].join('\r\n')}`;
}

function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function normalizeURL(raw, fallbackProtocol = 'https:') {
  let value = String(raw || '').trim();
  if (!value) throw new Error('Introduce una URL válida.');
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) value = `${fallbackProtocol}//${value}`;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Solo se admiten URL HTTP o HTTPS.');
  if (url.username || url.password) throw new Error('No se admiten credenciales dentro de la URL.');
  url.hash = '';
  return url.href;
}

function resolveURL(raw, base) {
  try {
    const url = new URL(String(raw || '').trim(), base);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.username = '';
    url.password = '';
    return url.href;
  } catch {
    return null;
  }
}

function safeProtocol(raw, base) {
  try {
    const url = new URL(String(raw || '').trim(), base);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function topEntries(map, limit = 12) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function countMap(map, value, amount = 1) {
  const key = String(value || '').trim();
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function setStatus(title, detail, percent, mode = 'loading') {
  const box = $('analysis-status');
  box.hidden = false;
  box.classList.toggle('is-error', mode === 'error');
  $('status-title').textContent = title;
  $('status-detail').textContent = detail;
  $('status-percent').textContent = `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
  $('status-progress').style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function finishStatus(title, detail) {
  setStatus(title, detail, 100, 'done');
  setTimeout(() => {
    if ($('analysis-status').dataset.keep !== 'true') $('analysis-status').hidden = true;
  }, 1400);
}

function setMode(mode) {
  state.mode = mode;
  $$('.mode-switch__item').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.source-panel').forEach((panel) => {
    const active = panel.id === `source-${mode}`;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

function selectView(name) {
  $$('.workspace-nav__item').forEach((button) => button.classList.toggle('is-active', button.dataset.view === name));
  $$('[data-view-panel]').forEach((panel) => {
    const active = panel.dataset.viewPanel === name;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

function configureDialogs() {
  $('proxy-mode').value = state.settings.proxyMode;
  $('custom-proxy').value = state.settings.customProxy;
  $('timeout-input').value = String(state.settings.timeout);
  $('max-html-input').value = String(state.settings.maxHtml);
  $('engine-mode').value = state.settings.engineMode;
  $('engine-endpoint').value = state.settings.engineEndpoint;
  $('engine-key').value = state.settings.engineKey;
  $('engine-browser').value = state.settings.engineBrowser;
  $('engine-wait').value = state.settings.engineWaitUntil;
  $('engine-allow-private').checked = state.settings.engineAllowPrivate;
  $('engine-block-ads').checked = state.settings.engineBlockAds;
}



function normalizeEngineEndpoint(raw) {
  const parsed = new URL(String(raw || '').trim());
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('El motor debe ejecutarse en http://127.0.0.1, localhost o ::1.');
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.href.replace(/\/$/, '');
}

function engineURL(relativePath) {
  return `${normalizeEngineEndpoint(state.settings.engineEndpoint)}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
}

function loopbackFetch(url, init = {}) {
  const options = { ...init, mode: init.mode || 'cors' };
  try {
    return fetch(new Request(url, { ...options, targetAddressSpace: 'loopback' }));
  } catch {
    return fetch(url, options);
  }
}

function describeEngineConnectionError(error) {
  const message = error?.message || String(error || 'Error de conexión');
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'No se pudo acceder al motor local. Comprueba que está iniciado y, si la web está publicada por HTTPS, acepta el permiso del navegador para conectar con este dispositivo.';
  }
  return message;
}

async function engineRequest(relativePath, payload = null, options = {}) {
  const method = options.method || (payload === null ? 'GET' : 'POST');
  const headers = { 'X-Scraper404-Key': state.settings.engineKey };
  if (!(payload instanceof FormData) && payload !== null) headers['Content-Type'] = 'application/json';
  const response = await loopbackFetch(engineURL(relativePath), {
    method,
    headers,
    body: payload === null ? undefined : payload instanceof FormData ? payload : JSON.stringify(payload),
    cache: 'no-store',
    signal: options.signal || AbortSignal.timeout(options.timeout || 180000)
  });
  let data;
  try { data = await response.json(); }
  catch { data = { ok: false, error: `Respuesta no válida del motor local (HTTP ${response.status}).` }; }
  if (!response.ok || data.ok === false) throw new Error(data.error || `Motor local: HTTP ${response.status}`);
  return data;
}

function updateEngineStatus(status = '') {
  const pill = $('engine-pill');
  if (!pill) return;
  pill.classList.toggle('offline', !state.engine.connected);
  pill.classList.toggle('is-detected', Boolean(state.engine.health) && !state.engine.paired);
  const label = state.engine.connected
    ? `conectado · v${state.engine.health?.version || APP_VERSION}`
    : state.engine.health && !state.engine.paired ? 'detectado · falta clave' : status || 'desconectado';
  pill.lastChild.textContent = `: ${label}`;
  pill.title = state.engine.lastError || 'Abrir configuración del motor local';
  const result = $('engine-test-result');
  if (result) {
    result.textContent = state.engine.connected ? `Conectado · ${state.engine.health?.name || 'motor local'}` : state.engine.lastError || label;
    result.classList.toggle('is-ok', state.engine.connected);
    result.classList.toggle('is-error', !state.engine.connected && Boolean(state.engine.lastError));
  }
}

async function probeLocalEngine(showMessage = false) {
  state.engine.lastError = '';
  try {
    const response = await loopbackFetch(engineURL('/api/v1/health'), { cache: 'no-store', signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    state.engine.health = health;
    state.engine.paired = false;
    state.engine.connected = false;
    if (!state.settings.engineKey) throw new Error('Motor encontrado. Introduce la clave mostrada al arrancarlo.');
    await engineRequest('/api/v1/history?limit=1', null, { method: 'GET', timeout: 3500 });
    state.engine.paired = true;
    state.engine.connected = true;
    updateEngineStatus();
    renderEngineCapabilities();
    if (showMessage) toast('Motor local conectado y clave verificada.');
    return true;
  } catch (error) {
    state.engine.connected = false;
    state.engine.paired = false;
    state.engine.lastError = describeEngineConnectionError(error);
    updateEngineStatus();
    if (showMessage) toast(error.message);
    return false;
  }
}

async function applyDesktopEngineConfig() {
  const bridge = window.scraper404Desktop;
  if (!bridge?.getEngineConfig) return false;
  try {
    const config = await bridge.getEngineConfig();
    if (!config?.endpoint || !config?.key) return false;
    state.settings = normalizeSettings({
      ...state.settings,
      engineMode: 'local',
      engineEndpoint: config.endpoint,
      engineKey: config.key
    });
    configureDialogs();
    document.documentElement.dataset.desktop = 'true';
    return true;
  } catch (error) {
    console.warn('No se pudo recibir la configuración de escritorio:', error);
    return false;
  }
}

function shouldPreferLocalEngine() {
  return state.settings.engineMode !== 'browser' && ($('opt-local-engine')?.checked !== false);
}

async function fetchRenderedMain(url) {
  if (shouldPreferLocalEngine()) {
    if (!state.engine.connected) await probeLocalEngine(false);
    if (state.engine.connected) {
      try {
        setStatus('Renderizando en el motor local', `${state.settings.engineBrowser} · JavaScript real · sesión local`, 10);
        const rendered = await engineRequest('/api/v1/render', {
          url,
          browser: state.settings.engineBrowser,
          waitUntil: state.settings.engineWaitUntil,
          timeoutMs: Math.max(25000, state.settings.timeout * 2),
          fullPage: true,
          scroll: { enabled: Boolean($('opt-scroll')?.checked), maxSteps: 30, delayMs: 250 },
          screenshot: Boolean($('opt-screenshot')?.checked),
          pdf: Boolean($('opt-pdf')?.checked),
          blockAds: state.settings.engineBlockAds,
          allowPrivate: state.settings.engineAllowPrivate,
          profileName: $('session-name')?.value.trim() || ''
        }, { signal: state.abortController?.signal, timeout: 150000 });
        state.engine.lastRender = rendered;
        return {
          text: rendered.html,
          bytes: rendered.bytes,
          contentType: rendered.contentType || 'text/html; charset=utf-8',
          finalURL: rendered.finalURL || url,
          proxy: `Motor local · ${rendered.browser}`,
          engine: rendered
        };
      } catch (error) {
        state.engine.lastError = error.message;
        if (state.settings.engineMode === 'local') throw new Error(`El modo exige motor local: ${error.message}`);
        console.warn('Motor local no disponible; se usa el modo web:', error);
        toast(`Motor local no disponible. Continuando en modo web: ${error.message}`);
      }
    } else if (state.settings.engineMode === 'local') {
      throw new Error(`El modo exige motor local: ${state.engine.lastError || 'no conectado'}`);
    }
  }
  return fetchResource(url, state.settings.maxHtml, 'HTML principal', 8, { skipLocal: true });
}

function absoluteEngineArtifactURL(relative) {
  return new URL(relative, `${normalizeEngineEndpoint(state.settings.engineEndpoint)}/`).href;
}

async function fetchEngineArtifact(artifact) {
  const response = await loopbackFetch(absoluteEngineArtifactURL(artifact.url), {
    headers: { 'X-Scraper404-Key': state.settings.engineKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error(`No se pudo recuperar ${artifact.filename}: HTTP ${response.status}`);
  return response.blob();
}

async function downloadEngineArtifact(artifact) {
  try {
    const blob = await fetchEngineArtifact(artifact);
    downloadBlob(artifact.filename, blob);
  } catch (error) { toast(error.message); }
}

function renderEngineCapabilities() {
  const target = $('engine-capabilities');
  if (!target) return;
  clear(target);
  const caps = state.engine.health?.capabilities;
  const rows = caps ? [
    ['Navegadores', Array.isArray(caps.browsers) ? caps.browsers.join(' · ') : 'Playwright'],
    ['SQLite', caps.sqlite ? 'Disponible' : 'No disponible'],
    ['OCR', caps.ocr ? 'Tesseract local' : 'No disponible'],
    ['Ollama', caps.ollama?.available ? `${caps.ollama.models?.length || 0} modelos` : 'No detectado'],
    ['FFmpeg', caps.ffmpeg?.available ? 'Disponible' : 'No detectado'],
    ['Git', caps.git?.available ? 'Disponible' : 'No detectado']
  ] : [['Motor local', state.engine.lastError || 'Sin comprobar']];
  rows.forEach(([label, value]) => {
    const card = document.createElement('article');
    card.className = 'engine-capability';
    const span = document.createElement('span'); span.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value;
    card.append(span, strong); target.appendChild(card);
  });
}

async function renderEngineResult(result) {
  renderEngineCapabilities();
  const engine = result.engine;
  const actions = $('engine-artifact-actions');
  const preview = $('engine-preview');
  const tbody = $('engine-api-table')?.querySelector('tbody');
  clear(actions); clear(preview); if (tbody) clear(tbody);
  $('engine-artifact-count').textContent = engine?.artifacts?.length || 0;
  $('engine-api-count').textContent = engine?.apiRequests?.length || 0;
  if (!engine) {
    const p = document.createElement('p'); p.className = 'empty-state';
    p.textContent = 'Este expediente se generó en modo web. Conecta el motor local para obtener DOM renderizado, capturas, PDF, cookies y peticiones API.';
    preview.appendChild(p);
    $('engine-performance').textContent = state.engine.lastError || 'Motor local no utilizado.';
    return;
  }
  const screenshot = engine.artifacts?.find((item) => item.type === 'screenshot');
  if (screenshot) {
    try {
      const blob = await fetchEngineArtifact(screenshot);
      if (state.engine.previewURL) URL.revokeObjectURL(state.engine.previewURL);
      state.engine.previewURL = URL.createObjectURL(blob);
      const image = document.createElement('img');
      image.src = state.engine.previewURL;
      image.alt = `Captura completa de ${result.page.host}`;
      image.loading = 'lazy';
      preview.appendChild(image);
    } catch (error) {
      const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = error.message; preview.appendChild(p);
    }
  } else {
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se solicitó captura para este expediente.'; preview.appendChild(p);
  }
  (engine.artifacts || []).forEach((artifact) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'secondary-btn';
    button.textContent = artifact.type === 'pdf' ? 'Descargar PDF' : artifact.type === 'screenshot' ? 'Descargar PNG' : `Descargar ${artifact.filename}`;
    button.addEventListener('click', () => downloadEngineArtifact(artifact));
    actions.appendChild(button);
  });
  (engine.apiRequests || []).slice(0, 500).forEach((item) => {
    const row = document.createElement('tr');
    [item.method, item.type, item.status || '—', item.url].forEach((value) => { const td = document.createElement('td'); td.textContent = String(value ?? ''); row.appendChild(td); });
    tbody?.appendChild(row);
  });
  if (tbody && !tbody.children.length) appendEmptyTableRow(tbody, 4, 'No se observaron peticiones XHR/fetch durante el renderizado.');
  $('engine-performance').textContent = JSON.stringify({
    browser: engine.browser,
    finalURL: engine.finalURL,
    durationMs: engine.durationMs,
    performance: engine.performance,
    cookies: engine.cookies?.length || 0,
    networkRequests: engine.network?.length || 0,
    consoleErrors: engine.consoleErrors || []
  }, null, 2);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function isPrivateOrLocalURL(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return true;
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.lan') || host.endsWith('.internal') || host.endsWith('.home') || host.endsWith('.home.arpa')) return true;
    if (host === '::1') return true;
    if (host.includes(':')) {
      if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
      const mappedDecimal = host.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
      if (mappedDecimal) return isPrivateOrLocalURL(`http://${mappedDecimal}/`);
      const mappedHex = host.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
      if (mappedHex) {
        const value = (parseInt(mappedHex[1], 16) * 65536) + parseInt(mappedHex[2], 16);
        const mappedIPv4 = `${Math.floor(value / 16777216) % 256}.${Math.floor(value / 65536) % 256}.${Math.floor(value / 256) % 256}.${value % 256}`;
        return isPrivateOrLocalURL(`http://${mappedIPv4}/`);
      }
    }
    const parts = host.split('.').map(Number);
    if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
      const [a, b] = parts;
      return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    }
    return false;
  } catch {
    return true;
  }
}

function validateProxyTemplate(template) {
  const value = String(template || '').trim();
  if (!value.includes('{url}')) throw new Error('El proxy personalizado debe incluir {url}.');
  let url;
  try { url = new URL(value.replaceAll('{url}', encodeURIComponent('https://example.com/'))); }
  catch { throw new Error('La plantilla del proxy personalizado no forma una URL válida.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('El proxy personalizado debe usar HTTP o HTTPS.');
  if (url.username || url.password) throw new Error('No se admiten credenciales dentro de la URL del proxy.');
  return value.slice(0, 2000);
}

function proxyDefinitions(targetURL) {
  const encoded = encodeURIComponent(targetURL);
  return {
    direct: { name: 'Directo', url: targetURL },
    allorigins: { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encoded}` },
    codetabs: { name: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encoded}` },
    custom: {
      name: 'Proxy personalizado',
      url: state.settings.customProxy.includes('{url}')
        ? state.settings.customProxy.replaceAll('{url}', encoded)
        : ''
    }
  };
}

function proxyOrder(targetURL) {
  const definitions = proxyDefinitions(targetURL);
  if (isPrivateOrLocalURL(targetURL)) return [{ ...definitions.direct, name: 'Directo (URL privada/local)' }];
  const mode = PROXY_MODES.includes(state.settings.proxyMode) ? state.settings.proxyMode : DEFAULT_SETTINGS.proxyMode;
  if (mode === 'auto') return [definitions.direct, definitions.allorigins, definitions.codetabs];
  return [definitions[mode]].filter(Boolean);
}

async function fetchAttempt(requestURL, maxBytes, parentSignal) {
  const safeMaxBytes = Math.max(1, Number(maxBytes) || DEFAULT_SETTINGS.maxHtml);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  parentSignal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), state.settings.timeout);
  try {
    const response = await fetch(requestURL, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'text/html,application/xhtml+xml,text/css,application/xml,text/plain;q=0.8,*/*;q=0.5' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared && declared > safeMaxBytes) throw new Error(`respuesta superior a ${formatBytes(safeMaxBytes)}`);

    let bytes;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > safeMaxBytes) {
            await reader.cancel('size limit');
            throw new Error(`respuesta superior a ${formatBytes(safeMaxBytes)}`);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock?.();
      }
      bytes = new Uint8Array(total);
      let offset = 0;
      chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
    } else {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > safeMaxBytes) throw new Error(`respuesta superior a ${formatBytes(safeMaxBytes)}`);
      bytes = new Uint8Array(buffer);
    }

    const charset = /charset=([^;]+)/i.exec(response.headers.get('content-type') || '')?.[1]?.trim() || 'utf-8';
    let text;
    try { text = new TextDecoder(charset).decode(bytes); }
    catch { text = new TextDecoder('utf-8').decode(bytes); }
    return {
      text,
      bytes: bytes.byteLength,
      contentType: response.headers.get('content-type') || '',
      finalURL: response.url
    };
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}

async function fetchResource(targetURL, maxBytes, label = 'recurso', progressBase = 0, options = {}) {
  if (!options.skipLocal && shouldPreferLocalEngine() && state.engine.connected) {
    try {
      setStatus(`Descargando ${label}`, 'Motor local · petición directa sin CORS', progressBase);
      const local = await engineRequest('/api/v1/fetch', {
        url: targetURL,
        maxBytes,
        timeoutMs: Math.max(15000, state.settings.timeout * 2),
        allowPrivate: state.settings.engineAllowPrivate
      }, { signal: state.abortController?.signal, timeout: 130000 });
      return { ...local, proxy: 'Motor local', targetURL };
    } catch (error) {
      if (state.settings.engineMode === 'local') throw error;
      console.warn(`El motor local no pudo descargar ${label}; se prueban métodos web:`, error);
    }
  }
  const attempts = proxyOrder(targetURL).filter((item) => item?.url);
  if (!attempts.length) throw new Error('Configura una plantilla válida para el proxy personalizado.');
  let lastError = null;
  for (let index = 0; index < attempts.length; index += 1) {
    if (state.abortController?.signal.aborted) throw new DOMException('Análisis cancelado', 'AbortError');
    const attempt = attempts[index];
    setStatus(`Descargando ${label}`, `Intento ${index + 1}/${attempts.length} mediante ${attempt.name}`, progressBase + Math.min(8, index * 2));
    try {
      const result = await fetchAttempt(attempt.url, maxBytes, state.abortController?.signal);
      return { ...result, proxy: attempt.name, targetURL };
    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError' && state.abortController?.signal.aborted) throw error;
    }
  }
  const reason = lastError?.name === 'AbortError' ? 'tiempo de espera agotado' : (lastError?.message || 'error desconocido');
  const privacyNote = isPrivateOrLocalURL(targetURL) ? ' Por privacidad, las URL privadas/locales solo se intentan de forma directa y nunca mediante proxies públicos.' : '';
  throw new Error(`No se pudo descargar ${label}: ${reason}. El sitio puede bloquear proxies o requerir JavaScript, autenticación o protección anti-bot.${privacyNote}`);
}

function looksLikeHTML(text, contentType = '') {
  if (/html|xhtml/i.test(contentType)) return true;
  return /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<title[\s>]|<meta[\s>]/i.test(text.slice(0, 25000));
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = await worker(items[index], index); }
      catch (error) { results[index] = { error }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function metaContent(doc, selector) {
  return cleanText(doc.querySelector(selector)?.getAttribute('content') || '', 2000);
}

function getAccessibleName(element) {
  const aria = cleanText(element.getAttribute('aria-label') || '');
  if (aria) return aria;
  const labelledBy = cleanText(element.getAttribute('aria-labelledby') || '');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map((id) => cleanText(element.ownerDocument.getElementById(id)?.textContent || '')).filter(Boolean).join(' ');
    if (text) return text;
  }
  const text = cleanText(element.textContent || '');
  if (text) return text;
  const imageAlt = cleanText(element.querySelector('img[alt]')?.getAttribute('alt') || '');
  return imageAlt || cleanText(element.getAttribute('title') || '');
}

function extractMetadata(doc, baseURL) {
  const title = cleanText(doc.querySelector('title')?.textContent || '', 1000);
  const canonicalRaw = doc.querySelector('link[rel~="canonical"]')?.getAttribute('href') || '';
  const alternateLanguages = $$('link[rel~="alternate"][hreflang]', doc).map((link) => ({
    lang: cleanText(link.getAttribute('hreflang') || '', 50),
    url: resolveURL(link.getAttribute('href'), baseURL)
  })).filter((item) => item.url);
  const icons = $$('link[rel*="icon"]', doc).map((link) => ({
    rel: cleanText(link.getAttribute('rel') || '', 100),
    sizes: cleanText(link.getAttribute('sizes') || '', 100),
    url: resolveURL(link.getAttribute('href'), baseURL)
  })).filter((item) => item.url);
  const openGraph = {};
  $$('meta[property^="og:"]', doc).forEach((meta) => {
    const key = cleanText(meta.getAttribute('property') || '', 100);
    const value = cleanText(meta.getAttribute('content') || '', 2000);
    if (key && value && !(key in openGraph)) openGraph[key] = value;
  });
  const twitter = {};
  $$('meta[name^="twitter:"]', doc).forEach((meta) => {
    const key = cleanText(meta.getAttribute('name') || '', 100);
    const value = cleanText(meta.getAttribute('content') || '', 2000);
    if (key && value && !(key in twitter)) twitter[key] = value;
  });
  return {
    title,
    titleLength: title.length,
    description: metaContent(doc, 'meta[name="description" i]'),
    keywords: metaContent(doc, 'meta[name="keywords" i]'),
    author: metaContent(doc, 'meta[name="author" i]'),
    robots: metaContent(doc, 'meta[name="robots" i]'),
    viewport: metaContent(doc, 'meta[name="viewport" i]'),
    themeColor: metaContent(doc, 'meta[name="theme-color" i]'),
    generator: metaContent(doc, 'meta[name="generator" i]'),
    applicationName: metaContent(doc, 'meta[name="application-name" i]'),
    charset: cleanText(doc.querySelector('meta[charset]')?.getAttribute('charset') || doc.characterSet || '', 50),
    lang: cleanText(doc.documentElement.getAttribute('lang') || '', 50),
    canonical: resolveURL(canonicalRaw, baseURL) || canonicalRaw,
    alternateLanguages,
    icons,
    openGraph,
    twitter,
    manifest: resolveURL(doc.querySelector('link[rel="manifest"]')?.getAttribute('href') || '', baseURL),
    cspMeta: cleanText(doc.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.getAttribute('content') || '', 4000)
  };
}

function extractStructuredData(doc) {
  const items = [];
  $$('script[type="application/ld+json" i]', doc).forEach((script, index) => {
    const raw = script.textContent.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      list.forEach((entry) => {
        const type = Array.isArray(entry?.['@type']) ? entry['@type'].join(', ') : (entry?.['@type'] || entry?.['@graph']?.[0]?.['@type'] || 'Schema sin @type');
        items.push({ index: index + 1, valid: true, type: cleanText(type, 200), data: entry });
      });
    } catch (error) {
      items.push({ index: index + 1, valid: false, type: 'JSON-LD inválido', error: error.message, raw: raw.slice(0, 3000) });
    }
  });
  return items;
}

function extractHeadings(doc) {
  return $$('h1,h2,h3,h4,h5,h6', doc).map((heading, index) => ({
    index: index + 1,
    level: Number(heading.tagName.slice(1)),
    tag: heading.tagName.toLowerCase(),
    text: cleanText(heading.textContent || '', 500),
    id: cleanText(heading.id || '', 150)
  }));
}

function extractLinks(doc, baseURL) {
  const base = new URL(baseURL);
  const seen = new Set();
  const links = [];
  const emails = new Set();
  const phones = new Set();
  $$('a[href]', doc).forEach((anchor) => {
    const raw = String(anchor.getAttribute('href') || '').trim();
    if (!raw || raw.startsWith('#')) return;
    const parsed = safeProtocol(raw, baseURL);
    if (!parsed) return;
    if (parsed.protocol === 'mailto:') {
      const value = decodeURIComponent(parsed.pathname).split('?')[0].trim();
      if (value) emails.add(value);
      const key = `mailto:${value}`;
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ text: getAccessibleName(anchor), url: key, type: 'email', rel: cleanText(anchor.rel), target: cleanText(anchor.target), title: cleanText(anchor.title) });
      }
      return;
    }
    if (parsed.protocol === 'tel:') {
      const value = decodeURIComponent(parsed.pathname).trim();
      if (value) phones.add(value);
      const key = `tel:${value}`;
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ text: getAccessibleName(anchor), url: key, type: 'phone', rel: cleanText(anchor.rel), target: cleanText(anchor.target), title: cleanText(anchor.title) });
      }
      return;
    }
    parsed.hash = '';
    const absolute = parsed.href;
    if (seen.has(absolute)) return;
    seen.add(absolute);
    let type = 'external';
    if (parsed.hostname === base.hostname) type = 'internal';
    else if (parsed.hostname.endsWith(`.${base.hostname}`) || base.hostname.endsWith(`.${parsed.hostname}`)) type = 'subdomain';
    links.push({
      text: getAccessibleName(anchor),
      url: absolute,
      type,
      rel: cleanText(anchor.getAttribute('rel') || '', 200),
      target: cleanText(anchor.getAttribute('target') || '', 50),
      title: cleanText(anchor.getAttribute('title') || '', 300),
      nofollow: /\bnofollow\b/i.test(anchor.getAttribute('rel') || ''),
      sponsored: /\bsponsored\b/i.test(anchor.getAttribute('rel') || ''),
      ugc: /\bugc\b/i.test(anchor.getAttribute('rel') || '')
    });
  });

  const bodyText = doc.body?.textContent || '';
  (bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).slice(0, 200).forEach((email) => emails.add(email));
  (bodyText.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []).slice(0, 100).map((phone) => cleanText(phone, 40)).filter((phone) => /\d{8,}/.test(phone.replace(/\D/g, ''))).forEach((phone) => phones.add(phone));
  return { links, emails: Array.from(emails), phones: Array.from(phones) };
}

function parseSrcset(value, baseURL) {
  return String(value || '').split(',').map((part) => part.trim().split(/\s+/)[0]).map((url) => resolveURL(url, baseURL)).filter(Boolean);
}

function extractImages(doc, baseURL) {
  const images = [];
  const seen = new Set();
  $$('img', doc).forEach((image, index) => {
    const raw = image.getAttribute('src') || image.getAttribute('data-src') || image.getAttribute('data-lazy-src') || '';
    const resolved = resolveURL(raw, baseURL);
    const sources = [
      ...parseSrcset(image.getAttribute('srcset'), baseURL),
      ...parseSrcset(image.getAttribute('data-srcset'), baseURL),
      ...$$('source[srcset]', image.closest('picture') || document.createDocumentFragment()).flatMap((source) => parseSrcset(source.getAttribute('srcset'), baseURL))
    ];
    const key = resolved || sources[0] || `inline-${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    images.push({
      index: index + 1,
      url: resolved,
      sources: Array.from(new Set(sources)),
      alt: image.hasAttribute('alt') ? cleanText(image.getAttribute('alt') || '', 500) : null,
      title: cleanText(image.getAttribute('title') || '', 300),
      loading: cleanText(image.getAttribute('loading') || '', 30),
      decoding: cleanText(image.getAttribute('decoding') || '', 30),
      fetchPriority: cleanText(image.getAttribute('fetchpriority') || '', 30),
      width: cleanText(image.getAttribute('width') || '', 30),
      height: cleanText(image.getAttribute('height') || '', 30),
      role: cleanText(image.getAttribute('role') || '', 50),
      className: cleanText(image.getAttribute('class') || '', 300),
      inlineData: /^data:/i.test(raw),
      decorative: image.getAttribute('alt') === '' || /presentation|none/i.test(image.getAttribute('role') || '')
    });
  });
  return images;
}

function extractAssets(doc, baseURL, images) {
  const assets = [];
  const push = (type, raw, attrs = '') => {
    if (!raw) return;
    const url = resolveURL(raw, baseURL) || cleanText(raw, 2000);
    let origin = 'inline';
    if (/^https?:/i.test(url)) {
      try { origin = new URL(url).hostname === new URL(baseURL).hostname ? 'same-origin' : 'external'; }
      catch { origin = 'unknown'; }
    }
    assets.push({ type, url, attrs, origin });
  };
  $$('link[rel~="stylesheet"]', doc).forEach((item) => push('stylesheet', item.getAttribute('href'), `media=${item.media || 'all'}`));
  $$('script', doc).forEach((item) => push(item.type === 'module' ? 'script-module' : 'script', item.getAttribute('src') || '[inline]', [item.async && 'async', item.defer && 'defer', item.type && `type=${item.type}`].filter(Boolean).join(' ')));
  $$('link[rel="preload"],link[rel="modulepreload"],link[rel="prefetch"],link[rel="preconnect"]', doc).forEach((item) => push(item.rel, item.getAttribute('href'), `as=${item.as || ''}`));
  $$('link[rel*="icon"],link[rel="manifest"]', doc).forEach((item) => push(item.rel, item.getAttribute('href'), item.getAttribute('sizes') || ''));
  $$('video[src],audio[src],source[src],track[src]', doc).forEach((item) => push(item.tagName.toLowerCase(), item.getAttribute('src'), item.getAttribute('type') || ''));
  $$('iframe[src]', doc).forEach((item) => push('iframe', item.getAttribute('src'), `title=${cleanText(item.getAttribute('title') || '', 100)}`));
  images.forEach((image) => {
    if (image.url) push('image', image.url, [image.loading && `loading=${image.loading}`, image.width && image.height && `${image.width}×${image.height}`].filter(Boolean).join(' '));
  });
  return assets.slice(0, 5000);
}

function extractForms(doc, baseURL) {
  return $$('form', doc).map((form, index) => {
    const controls = $$('input,select,textarea,button', form);
    return {
      index: index + 1,
      action: resolveURL(form.getAttribute('action') || baseURL, baseURL),
      method: (form.getAttribute('method') || 'get').toLowerCase(),
      controls: controls.length,
      passwordFields: controls.filter((el) => el.matches('input[type="password"]')).length,
      fileFields: controls.filter((el) => el.matches('input[type="file"]')).length,
      names: controls.map((el) => cleanText(el.getAttribute('name') || '', 100)).filter(Boolean).slice(0, 50)
    };
  });
}

/* v3.2.0 — Extracción total de tablas.
   Antes: slice(0,30) tablas x slice(0,50) filas x slice(0,25) celdas, y `rowCount`
   informaba el total real mientras `rows[]` solo llevaba 50 → pérdida silenciosa.
   Ahora se extrae todo hasta un presupuesto global de celdas, se expande
   colspan/rowspan y, si se recorta, queda registrado de forma explícita. */
function extractTables(doc) {
  const budget = { cells: MAX_TABLE_CELLS };
  const all = $$('table', doc);
  const tables = all.map((table, index) => extractOneTable(table, index, budget));
  return Object.assign(tables, {
    tableCount: all.length,
    truncated: tables.some((t) => t.truncated)
  });
}

/* Expande colspan/rowspan a una rejilla real: sin esto, una tabla con celdas
   combinadas se exporta desalineada y el CSV sale corrupto. */
function extractOneTable(table, index, budget) {
  const domRows = $$('tr', table);
  const grid = [];
  const pending = new Map();
  let truncated = false;
  let cellsSeen = 0;

  for (let r = 0; r < domRows.length; r++) {
    if (budget.cells <= 0) { truncated = true; break; }
    const out = [];
    let col = 0;
    const place = (value) => {
      while (pending.has(`${r},${col}`)) { out[col] = pending.get(`${r},${col}`); pending.delete(`${r},${col}`); col++; }
      out[col] = value;
      col++;
    };
    for (const cell of $$('th,td', domRows[r])) {
      if (budget.cells <= 0) { truncated = true; break; }
      const text = cleanText(cell.textContent || '', 2000);
      const colspan = Math.min(Math.max(parseInt(cell.getAttribute('colspan'), 10) || 1, 1), 100);
      const rowspan = Math.min(Math.max(parseInt(cell.getAttribute('rowspan'), 10) || 1, 1), 100);
      for (let c = 0; c < colspan; c++) {
        place(text);
        budget.cells--;
        cellsSeen++;
        for (let rs = 1; rs < rowspan; rs++) pending.set(`${r + rs},${col - 1}`, text);
      }
    }
    while (pending.has(`${r},${col}`)) { out[col] = pending.get(`${r},${col}`); pending.delete(`${r},${col}`); col++; }
    for (let i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = '';
    grid.push(out);
  }

  const headerRow = table.querySelector('thead tr, tr:has(th)');
  return {
    index: index + 1,
    caption: cleanText(table.querySelector('caption')?.textContent || '', 300),
    headers: headerRow ? $$('th', headerRow).map((th) => cleanText(th.textContent || '', 500)) : [],
    rows: grid,
    rowCount: domRows.length,
    extractedRows: grid.length,
    cellCount: cellsSeen,
    columnCount: Math.max(0, ...grid.map((row) => row.length)),
    truncated,
    id: table.id || '',
    className: cleanText(table.className || '', 200)
  };
}

/* v3.2.0 — Exporta una tabla extraída tal cual, con la rejilla ya expandida. */
function tableToCSV(table) {
  const width = table.columnCount || Math.max(0, ...table.rows.map((r) => r.length));
  const pad = (row) => { const out = row.slice(0, width); while (out.length < width) out.push(''); return out; };
  return table.rows.map((row) => pad(row).map(csvEscape).join(',')).join('\r\n');
}

function downloadTableCSV(table) {
  const slug = (table.caption || `tabla-${table.index}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || `tabla-${table.index}`;
  download(`${slug}.csv`, '\ufeff' + tableToCSV(table), 'text/csv;charset=utf-8');
  toast(`Tabla exportada: ${table.extractedRows} filas.`);
}

function extractComponents(doc) {
  const definitions = [
    ['Header', 'header'], ['Navegación', 'nav'], ['Main', 'main'], ['Secciones', 'section'], ['Artículos', 'article'], ['Sidebar', 'aside'], ['Footer', 'footer'],
    ['Botones', 'button,[role="button"],input[type="button"],input[type="submit"]'], ['Formularios', 'form'], ['Diálogos', 'dialog,[role="dialog"],[class*="modal" i]'],
    ['Tarjetas', '[class*="card" i],[class*="tile" i]'], ['Hero', '[class*="hero" i],[class*="masthead" i]'], ['Tabs', '[role="tablist"],[class*="tabs" i]'],
    ['Acordeones', 'details,[class*="accordion" i]'], ['Carruseles', '[class*="carousel" i],[class*="slider" i],[class*="swiper" i]'], ['Grids', '[class*="grid" i]'],
    ['Breadcrumbs', '[aria-label*="breadcrumb" i],[class*="breadcrumb" i]'], ['FAQ', '[class*="faq" i]'], ['Pricing', '[class*="pricing" i],[class*="price" i]'],
    ['Testimonios', '[class*="testimonial" i],[class*="review" i]'], ['Tablas', 'table'], ['Vídeo', 'video,iframe[src*="youtube" i],iframe[src*="vimeo" i]']
  ];
  return definitions.map(([name, selector]) => ({ name, count: doc.querySelectorAll(selector).length })).filter((item) => item.count > 0);
}

function extractContent(doc) {
  const clone = doc.cloneNode(true);
  $$('script,style,noscript,template,svg,canvas', clone).forEach((element) => element.remove());
  const fullText = cleanText(clone.body?.textContent || '', 5_000_000);
  const main = clone.querySelector('main,article,[role="main"]');
  const mainText = cleanText(main?.textContent || '', 5_000_000);
  const words = fullText ? fullText.split(/\s+/).filter(Boolean) : [];
  const mainWords = mainText ? mainText.split(/\s+/).filter(Boolean) : [];
  const paragraphs = $$('p', doc).map((p) => cleanText(p.textContent || '', 5000)).filter(Boolean);
  return {
    wordCount: words.length,
    mainWordCount: mainWords.length,
    characterCount: fullText.length,
    readingMinutes: Math.max(1, Math.ceil(words.length / 220)),
    paragraphCount: paragraphs.length,
    averageParagraphWords: paragraphs.length ? Math.round(paragraphs.reduce((sum, text) => sum + text.split(/\s+/).length, 0) / paragraphs.length) : 0,
    textSample: fullText.slice(0, 1500)
  };
}

function stripCSSComments(css) {
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function normalizeColor(value) {
  const color = String(value || '').trim().toLowerCase();
  if (!color || ['transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'none'].includes(color)) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(color)) {
    if (color.length === 4 || color.length === 5) return `#${color.slice(1).split('').map((char) => char + char).join('')}`;
    return color;
  }
  if (/^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i.test(color)) return color.replace(/\s+/g, ' ');
  const named = new Set(['black','white','red','green','blue','navy','teal','aqua','cyan','lime','yellow','orange','purple','magenta','fuchsia','gray','grey','silver','maroon','olive','beige','ivory','snow','whitesmoke','aliceblue','gold','pink','coral','tomato','indigo','violet','brown','crimson']);
  return named.has(color) ? color : null;
}

function parseColorToRGB(value) {
  const color = String(value || '').trim().toLowerCase();
  const named = {
    black:'#000000',white:'#ffffff',red:'#ff0000',green:'#008000',blue:'#0000ff',navy:'#000080',teal:'#008080',aqua:'#00ffff',cyan:'#00ffff',lime:'#00ff00',yellow:'#ffff00',orange:'#ffa500',purple:'#800080',magenta:'#ff00ff',fuchsia:'#ff00ff',gray:'#808080',grey:'#808080',silver:'#c0c0c0',maroon:'#800000',olive:'#808000',beige:'#f5f5dc',ivory:'#fffff0',snow:'#fffafa',whitesmoke:'#f5f5f5',aliceblue:'#f0f8ff',gold:'#ffd700',pink:'#ffc0cb',coral:'#ff7f50',tomato:'#ff6347',indigo:'#4b0082',violet:'#ee82ee',brown:'#a52a2a',crimson:'#dc143c'
  };
  const input = named[color] || color;
  const hex = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(input);
  if (hex) return [parseInt(hex[1].slice(0, 2), 16), parseInt(hex[1].slice(2, 4), 16), parseInt(hex[1].slice(4, 6), 16)];
  const rgb = /^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)/i.exec(input);
  if (rgb) return rgb.slice(1, 4).map((part) => part.endsWith('%') ? Math.round(parseFloat(part) * 2.55) : Math.max(0, Math.min(255, Math.round(parseFloat(part)))));
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/i.exec(input);
  if (hsl) {
    const h = ((parseFloat(hsl[1]) % 360) + 360) % 360 / 360;
    const s = parseFloat(hsl[2]) / 100;
    const l = parseFloat(hsl[3]) / 100;
    const hue = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (s === 0) r = g = b = l;
    else {
      const q = l < .5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue(p, q, h + 1/3); g = hue(p, q, h); b = hue(p, q, h - 1/3);
    }
    return [r, g, b].map((item) => Math.round(item * 255));
  }
  return null;
}

function luminance(value) {
  const rgb = parseColorToRGB(value);
  if (!rgb) return null;
  const normalized = rgb.map((channel) => {
    const s = channel / 255;
    return s <= .03928 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
  });
  return .2126 * normalized[0] + .7152 * normalized[1] + .0722 * normalized[2];
}

function saturation(value) {
  const rgb = parseColorToRGB(value);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

function collectMatches(text, regex, map, normalizer = (value) => value.trim(), limit = 10000) {
  let match;
  let count = 0;
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) && count < limit) {
    const value = normalizer(match[1] || match[0]);
    if (value) countMap(map, value);
    count += 1;
  }
}

function analyzeCSS(cssText, doc) {
  const css = stripCSSComments(cssText);
  const variables = new Map();
  const variableUsage = new Map();
  const colors = new Map();
  const backgroundColors = new Map();
  const textColors = new Map();
  const fonts = new Map();
  const fontSizes = new Map();
  const fontWeights = new Map();
  const radii = new Map();
  const shadows = new Map();
  const spacing = new Map();
  const gradients = new Map();
  const transitions = new Map();
  const animations = new Map();
  const breakpoints = new Map();
  const zIndexes = new Map();
  const displays = new Map();

  collectMatches(css, /(--[\w-]+)\s*:\s*([^;}{]+)/g, variables, (name) => name);
  let variableMatch;
  const variableRegex = /(--[\w-]+)\s*:\s*([^;}{]+)/g;
  variables.clear();
  while ((variableMatch = variableRegex.exec(css))) {
    const name = variableMatch[1].trim();
    const value = variableMatch[2].trim().slice(0, 500);
    if (!variables.has(name)) variables.set(name, { value, declarations: 0 });
    variables.get(name).declarations += 1;
  }
  const useRegex = /var\(\s*(--[\w-]+)/g;
  while ((variableMatch = useRegex.exec(css))) countMap(variableUsage, variableMatch[1]);

  const colorRegex = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^;{}]+?\)|\b(?:black|white|red|green|blue|navy|teal|aqua|cyan|lime|yellow|orange|purple|magenta|fuchsia|gray|grey|silver|maroon|olive|beige|ivory|snow|whitesmoke|aliceblue|gold|pink|coral|tomato|indigo|violet|brown|crimson)\b/gi;
  collectMatches(css, colorRegex, colors, normalizeColor, 15000);

  let declaration;
  const declarationRegex = /([\w-]+)\s*:\s*([^;{}]+)/g;
  while ((declaration = declarationRegex.exec(css))) {
    const property = declaration[1].toLowerCase();
    const value = declaration[2].trim().slice(0, 1200);
    const collectColorValues = (target) => {
      const direct = (value.match(colorRegex) || []).map(normalizeColor).filter(Boolean);
      direct.forEach((color) => countMap(target, color));
      if (!direct.length) {
        Array.from(value.matchAll(/var\(\s*(--[\w-]+)/g)).forEach(([, name]) => {
          const resolved = normalizeColor((variables.get(name)?.value.match(colorRegex) || [])[0] || '');
          if (resolved) countMap(target, resolved);
        });
      }
    };
    if (/^(?:background|background-color)$/.test(property)) collectColorValues(backgroundColors);
    if (property === 'color') collectColorValues(textColors);
    if (property === 'font-family') countMap(fonts, value.replace(/\s*!important\s*$/i, '').slice(0, 300));
    if (property === 'font-size') countMap(fontSizes, value.replace(/\s*!important\s*$/i, ''));
    if (property === 'font-weight') countMap(fontWeights, value.replace(/\s*!important\s*$/i, ''));
    if (property === 'border-radius') countMap(radii, value.replace(/\s*!important\s*$/i, ''));
    if (property === 'box-shadow' && value !== 'none') countMap(shadows, value.replace(/\s*!important\s*$/i, '').slice(0, 500));
    if (/^(?:margin|margin-top|margin-right|margin-bottom|margin-left|padding|padding-top|padding-right|padding-bottom|padding-left|gap|row-gap|column-gap)$/.test(property)) {
      value.split(/\s+/).filter((part) => /^(?:-?[\d.]+(?:px|rem|em|vh|vw|%)|0|var\(--)/i.test(part)).forEach((part) => countMap(spacing, part));
    }
    if (/^(?:transition|transition-duration)$/.test(property)) countMap(transitions, value.slice(0, 300));
    if (/^(?:animation|animation-name|animation-duration)$/.test(property)) countMap(animations, value.slice(0, 300));
    if (property === 'z-index') countMap(zIndexes, value);
    if (property === 'display') countMap(displays, value);
  }

  collectMatches(css, /((?:linear|radial|conic)-gradient\([^;{}]+\))/gi, gradients, (value) => value.replace(/\s+/g, ' ').slice(0, 500), 2000);
  collectMatches(css, /@media\s*\(([^)]+)\)/gi, breakpoints, (value) => value.replace(/\s+/g, ' ').slice(0, 300), 2000);

  const variableList = Array.from(variables.entries()).map(([name, item]) => ({ name, value: item.value, uses: variableUsage.get(name) || 0, declarations: item.declarations })).sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  const componentSelectors = {
    card: (css.match(/[^{}]*(?:\.card\b|\[class[^\]]*card)[^{}]*\{/gi) || []).length,
    button: (css.match(/[^{}]*(?:button\b|\.btn\b|\.button\b)[^{}]*\{/gi) || []).length,
    nav: (css.match(/[^{}]*(?:nav\b|\.navbar\b|\.nav\b)[^{}]*\{/gi) || []).length,
    modal: (css.match(/[^{}]*(?:dialog\b|\.modal\b)[^{}]*\{/gi) || []).length,
    form: (css.match(/[^{}]*(?:form\b|input\b|textarea\b|select\b)[^{}]*\{/gi) || []).length
  };
  const featureFlags = {
    darkMedia: /prefers-color-scheme\s*:\s*dark/i.test(css),
    reducedMotion: /prefers-reduced-motion/i.test(css),
    containerQueries: /@container\b/i.test(css),
    cssGrid: /display\s*:\s*grid|grid-template/i.test(css),
    flexbox: /display\s*:\s*(?:inline-)?flex/i.test(css),
    backdropBlur: /backdrop-filter\s*:[^;}]*(?:blur|saturate)/i.test(css),
    customFonts: /@font-face\b/i.test(css),
    logicalProperties: /\b(?:margin|padding|border)-(?:inline|block)|\binset-(?:inline|block)/i.test(css),
    animations: /@keyframes\b/i.test(css)
  };

  const tokens = inferDesignTokens({ variables: variableList, colors, backgroundColors, textColors, fonts, fontSizes, fontWeights, radii, shadows, spacing, gradients, transitions, animations });
  const style = inferStyle({ css, tokens, colors, fonts, radii, shadows, featureFlags, doc });

  return {
    bytes: new Blob([cssText]).size,
    rulesApprox: (css.match(/\{/g) || []).length,
    variables: variableList,
    colors: topEntries(colors, 40).map(([value, count]) => ({ value, count, luminance: luminance(value) })),
    backgroundColors: topEntries(backgroundColors, 20).map(([value, count]) => ({ value, count })),
    textColors: topEntries(textColors, 20).map(([value, count]) => ({ value, count })),
    fonts: topEntries(fonts, 20).map(([value, count]) => ({ value, count })),
    fontSizes: topEntries(fontSizes, 30).map(([value, count]) => ({ value, count })),
    fontWeights: topEntries(fontWeights, 20).map(([value, count]) => ({ value, count })),
    radii: topEntries(radii, 20).map(([value, count]) => ({ value, count })),
    shadows: topEntries(shadows, 16).map(([value, count]) => ({ value, count })),
    spacing: topEntries(spacing, 30).map(([value, count]) => ({ value, count })),
    gradients: topEntries(gradients, 16).map(([value, count]) => ({ value, count })),
    transitions: topEntries(transitions, 15).map(([value, count]) => ({ value, count })),
    animations: topEntries(animations, 15).map(([value, count]) => ({ value, count })),
    breakpoints: topEntries(breakpoints, 20).map(([value, count]) => ({ value, count })),
    zIndexes: topEntries(zIndexes, 20).map(([value, count]) => ({ value, count })),
    displays: topEntries(displays, 12).map(([value, count]) => ({ value, count })),
    componentSelectors,
    featureFlags,
    tokens,
    style
  };
}

function inferDesignTokens(input) {
  const variable = (regex) => input.variables.find((item) => regex.test(item.name))?.value || null;
  const colorList = topEntries(input.colors, 30).map(([value, count]) => ({ value, count, lum: luminance(value), sat: saturation(value) })).filter((item) => item.lum !== null);
  const backgrounds = topEntries(input.backgroundColors, 12).map(([value]) => value);
  const textColors = topEntries(input.textColors, 12).map(([value]) => value);
  const saturated = colorList.filter((item) => item.sat > .28 && item.lum > .025 && item.lum < .92);
  const darkNeutrals = colorList.filter((item) => item.sat < .18 && item.lum < .25);
  const lightNeutrals = colorList.filter((item) => item.sat < .18 && item.lum > .72);
  const background = variable(/--(?:color-)?(?:bg|background)(?:-|$)/i) || backgrounds[0] || darkNeutrals[0]?.value || lightNeutrals[0]?.value || '#ffffff';
  const bgLum = luminance(background) ?? .8;
  const surface = variable(/--(?:color-)?(?:surface|panel|card)(?:-|$)/i) || backgrounds.find((item) => item !== background) || (bgLum < .5 ? '#171a22' : '#f5f6f8');
  const primary = variable(/--(?:color-)?primary(?:-|$)/i) || variable(/--(?:color-)?accent(?:-|$)/i) || saturated[0]?.value || (bgLum < .5 ? '#7aa8ff' : '#2457d6');
  const accent = variable(/--(?:color-)?(?:accent|secondary)(?:-|$)/i) || saturated.find((item) => item.value !== primary)?.value || primary;
  const text = variable(/--(?:color-)?(?:text|foreground|fg)(?:-|$)/i) || textColors.find((item) => (luminance(item) ?? 0) > (bgLum < .5 ? .55 : 0) && (luminance(item) ?? 1) < (bgLum < .5 ? 1.01 : .45)) || (bgLum < .5 ? '#f5f7fa' : '#15171b');
  const muted = variable(/--(?:color-)?(?:muted|subtle|secondary-text)(?:-|$)/i) || colorList.find((item) => item.sat < .2 && Math.abs(item.lum - bgLum) > .12 && Math.abs(item.lum - (luminance(text) ?? .5)) > .08)?.value || (bgLum < .5 ? '#9aa3b2' : '#667085');
  const border = variable(/--(?:color-)?border(?:-|$)/i) || colorList.find((item) => item.sat < .16 && Math.abs(item.lum - bgLum) > .04)?.value || (bgLum < .5 ? '#2b3242' : '#d9dde5');
  const fontBody = variable(/--(?:font-)?(?:body|sans|base)(?:-|$)/i) || topEntries(input.fonts, 1)[0]?.[0] || 'system-ui, sans-serif';
  const fontHeading = variable(/--(?:font-)?(?:heading|display|title)(?:-|$)/i) || topEntries(input.fonts, 2)[1]?.[0] || fontBody;
  const baseSize = variable(/--(?:font-)?(?:size-base|text-base)(?:-|$)/i) || topEntries(input.fontSizes, 1)[0]?.[0] || '16px';
  const radius = variable(/--(?:radius|border-radius)(?:-|$)/i) || topEntries(input.radii, 1)[0]?.[0] || '8px';
  const shadow = variable(/--(?:shadow|box-shadow)(?:-|$)/i) || topEntries(input.shadows, 1)[0]?.[0] || '0 10px 30px rgba(0,0,0,.12)';
  const spacing = topEntries(input.spacing, 8).map(([value]) => value);
  const transition = topEntries(input.transitions, 1)[0]?.[0] || '180ms ease';
  return {
    color: { background, surface, primary, accent, text, muted, border },
    typography: { body: fontBody, heading: fontHeading, baseSize },
    shape: { radius, shadow },
    spacing: spacing.length ? spacing : ['4px','8px','12px','16px','24px','32px','48px'],
    motion: { transition }
  };
}

function inferStyle({ css, tokens, colors, fonts, radii, shadows, featureFlags, doc }) {
  const tags = [];
  const scores = new Map();
  const add = (name, amount) => scores.set(name, (scores.get(name) || 0) + amount);
  const backgroundLum = luminance(tokens.color.background);
  const fontText = topEntries(fonts, 5).map(([value]) => value).join(' ').toLowerCase();
  const radiusValues = topEntries(radii, 8).map(([value]) => value).join(' ');
  const colorValues = topEntries(colors, 12).map(([value]) => value).join(' ');
  const cardCount = doc.querySelectorAll('[class*="card" i],[class*="panel" i],[class*="tile" i]').length;
  const dashboardCount = doc.querySelectorAll('[class*="dashboard" i],[class*="sidebar" i],[class*="metric" i],[class*="stat" i]').length;

  if (backgroundLum !== null && backgroundLum < .28) { tags.push('Tema oscuro'); add('Dark premium', 4); }
  else { tags.push('Tema claro'); add('Minimal claro', 2); }
  if (featureFlags.backdropBlur) { tags.push('Glassmorphism'); add('Glassmorphism', 6); }
  if (/linear-gradient|radial-gradient|conic-gradient/i.test(css)) { tags.push('Gradientes'); add('Visual contemporáneo', 2); }
  if (/monospace|cascadia|consolas|jetbrains mono|fira code/i.test(fontText)) { tags.push('Tipografía mono'); add('Tech / cyber', 4); }
  if (/serif|georgia|garamond|times/i.test(fontText)) { tags.push('Editorial'); add('Editorial', 4); }
  if (featureFlags.cssGrid && featureFlags.flexbox) tags.push('Grid + Flex');
  if (cardCount > 5) { tags.push('Sistema de tarjetas'); add('SaaS / dashboard', 3); }
  if (dashboardCount > 2) add('SaaS / dashboard', 4);
  if (shadows.size > 8) { tags.push('Profundidad marcada'); add('Visual contemporáneo', 2); }
  if (/\b0(?:px|rem|em)?\b/.test(radiusValues) && radii.size < 3 && /border\s*:\s*(?:2|3|4)px/i.test(css)) { tags.push('Geometría dura'); add('Brutalista', 5); }
  if (/cyan|aqua|#00ffff|#0ff|#00e|#7aa8ff|#6ad9/i.test(colorValues) && backgroundLum !== null && backgroundLum < .25) add('Tech / cyber', 3);
  if (/box-shadow\s*:[^;]*(?:inset)[^;]*,[^;]*(?:rgba|#)/i.test(css) && radii.size > 0) add('Neumorphism', 2);
  if (colors.size <= 8 && shadows.size <= 3 && cardCount < 6) { tags.push('Paleta contenida'); add('Minimal', 3); }
  if (/material-icons|mdc-|mat-/i.test(css)) add('Material Design', 5);
  if (/apple-system|sf pro|san francisco/i.test(fontText) && radii.size > 3) add('Apple-like', 3);

  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  const name = ranked[0]?.[0] || (backgroundLum !== null && backgroundLum < .4 ? 'Interfaz oscura contemporánea' : 'Interfaz web contemporánea');
  const confidence = Math.min(96, 35 + Math.min(25, colors.size) + Math.min(16, fonts.size * 4) + Math.min(12, radii.size * 2) + Math.min(8, shadows.size));
  return { name, tags: Array.from(new Set(tags)).slice(0, 10), confidence, alternatives: ranked.slice(1, 4).map(([label]) => label) };
}

function detectTechnologies(html, css, doc, extraSource = '') {
  const corpus = `${html.slice(0, 4_000_000)}\n${css.slice(0, 2_000_000)}\n${extraSource.slice(0, 1_000_000)}`;
  const found = [];
  TECH_PATTERNS.forEach(([name, pattern, category]) => {
    if (pattern.test(corpus)) found.push({ name, category, confidence: 'alta' });
  });
  const generator = cleanText(doc.querySelector('meta[name="generator" i]')?.getAttribute('content') || '');
  if (generator && !found.some((item) => generator.toLowerCase().includes(item.name.toLowerCase()))) {
    found.unshift({ name: generator, category: 'Generator', confidence: 'declarada' });
  }
  const moduleScripts = $$('script[type="module"]', doc).length;
  if (moduleScripts && !found.some((item) => item.name === 'JavaScript Modules')) found.push({ name: 'JavaScript Modules', category: 'Arquitectura', confidence: 'alta', detail: `${moduleScripts} módulos` });
  if (doc.querySelector('link[rel="manifest"]')) found.push({ name: 'PWA / Web App Manifest', category: 'Capacidad', confidence: 'alta' });
  if (doc.querySelector('amp-html,html[amp]')) found.push({ name: 'AMP', category: 'Framework', confidence: 'alta' });
  return found;
}

function makeCheck(status, title, detail, value = '', severity = 'low', fix = '') {
  return { status, title, detail, value, severity, fix };
}

function hasLabel(control, doc) {
  if (control.closest('label')) return true;
  const id = control.id;
  if (id) {
    try { if (doc.querySelector(`label[for="${CSS.escape(id)}"]`)) return true; }
    catch { /* CSS.escape may reject malformed id */ }
  }
  return Boolean(control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || control.getAttribute('title'));
}

function buildAccessibilityAudit(doc, metadata, headings, images) {
  const controls = $$('input,select,textarea', doc).filter((el) => !/^(hidden|button|submit|reset|image)$/i.test(el.getAttribute('type') || ''));
  const unlabeledControls = controls.filter((el) => !hasLabel(el, doc));
  const buttons = $$('button,[role="button"],input[type="button"],input[type="submit"]', doc);
  const namelessButtons = buttons.filter((el) => !getAccessibleName(el) && !cleanText(el.getAttribute('value') || ''));
  const anchors = $$('a[href]', doc);
  const namelessLinks = anchors.filter((el) => !getAccessibleName(el));
  const ids = new Map();
  $$('[id]', doc).forEach((el) => countMap(ids, el.id));
  const duplicateIDs = topEntries(ids, ids.size).filter(([, count]) => count > 1);
  const iframes = $$('iframe', doc);
  const untitledIframes = iframes.filter((el) => !cleanText(el.getAttribute('title') || ''));
  const missingAlt = images.filter((image) => image.alt === null);
  const headingJumps = [];
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level - headings[index - 1].level > 1) headingJumps.push(`${headings[index - 1].tag} → ${headings[index].tag}`);
  }
  const emptyHeadings = headings.filter((heading) => !heading.text);
  const checks = [
    makeCheck(metadata.lang ? 'pass' : 'fail', 'Idioma del documento', metadata.lang ? `Declarado como “${metadata.lang}”.` : 'Falta el atributo lang en <html>.', metadata.lang || 'Ausente', 'high', 'Añade lang="es" o el idioma real al elemento <html>.'),
    makeCheck(metadata.title ? 'pass' : 'fail', 'Título accesible del documento', metadata.title ? 'La página contiene un <title>.' : 'No se encontró un título de documento.', metadata.title ? `${metadata.titleLength} caracteres` : 'Ausente', 'high', 'Incluye un <title> único y descriptivo.'),
    makeCheck(doc.querySelector('main,[role="main"]') ? 'pass' : 'warn', 'Landmark principal', doc.querySelector('main,[role="main"]') ? 'Existe una región principal.' : 'No se detectó <main> ni role="main".', '', 'medium', 'Envuelve el contenido principal en <main>.'),
    makeCheck(missingAlt.length === 0 ? 'pass' : (missingAlt.length <= 2 ? 'warn' : 'fail'), 'Texto alternativo de imágenes', missingAlt.length ? `${missingAlt.length} imágenes no tienen atributo alt.` : 'Todas las imágenes tienen atributo alt, aunque su calidad debe revisarse manualmente.', `${missingAlt.length}/${images.length}`, missingAlt.length > 2 ? 'high' : 'medium', 'Añade alt descriptivo; usa alt="" solo en imágenes decorativas.'),
    makeCheck(unlabeledControls.length === 0 ? 'pass' : 'fail', 'Etiquetas de formularios', unlabeledControls.length ? `${unlabeledControls.length} controles no tienen etiqueta accesible.` : 'Los controles detectados tienen etiqueta o nombre accesible.', `${unlabeledControls.length}/${controls.length}`, 'high', 'Relaciona cada control con <label for>, aria-label o aria-labelledby.'),
    makeCheck(namelessButtons.length === 0 ? 'pass' : 'fail', 'Nombre de botones', namelessButtons.length ? `${namelessButtons.length} botones carecen de nombre accesible.` : 'Todos los botones tienen nombre accesible.', `${namelessButtons.length}/${buttons.length}`, 'high', 'Añade texto visible o aria-label a cada botón.'),
    makeCheck(namelessLinks.length === 0 ? 'pass' : 'warn', 'Nombre de enlaces', namelessLinks.length ? `${namelessLinks.length} enlaces carecen de texto o nombre accesible.` : 'Todos los enlaces tienen nombre accesible.', `${namelessLinks.length}/${anchors.length}`, 'medium', 'Evita enlaces vacíos; añade texto, alt en la imagen o aria-label.'),
    makeCheck(duplicateIDs.length === 0 ? 'pass' : 'fail', 'Identificadores únicos', duplicateIDs.length ? `${duplicateIDs.length} identificadores aparecen repetidos.` : 'No se detectaron IDs duplicados.', duplicateIDs.length ? duplicateIDs.slice(0, 4).map(([id, count]) => `${id}×${count}`).join(', ') : 'Correcto', 'high', 'Cada atributo id debe ser único en el documento.'),
    makeCheck(headingJumps.length === 0 ? 'pass' : 'warn', 'Orden de encabezados', headingJumps.length ? `${headingJumps.length} saltos de nivel detectados.` : 'No hay saltos evidentes en la jerarquía.', headingJumps.slice(0, 4).join(', '), 'medium', 'Mantén una jerarquía lógica sin saltar niveles por motivos visuales.'),
    makeCheck(emptyHeadings.length === 0 ? 'pass' : 'warn', 'Encabezados con contenido', emptyHeadings.length ? `${emptyHeadings.length} encabezados están vacíos.` : 'Los encabezados contienen texto.', `${emptyHeadings.length}`, 'medium', 'Elimina encabezados vacíos o añade un nombre significativo.'),
    makeCheck(untitledIframes.length === 0 ? 'pass' : 'warn', 'Título de iframes', untitledIframes.length ? `${untitledIframes.length} iframes no tienen title.` : 'Los iframes tienen título o no existen.', `${untitledIframes.length}/${iframes.length}`, 'medium', 'Añade title descriptivo a cada iframe.'),
    makeCheck(metadata.viewport ? 'pass' : 'warn', 'Viewport móvil', metadata.viewport ? 'Se ha declarado viewport.' : 'No se encontró meta viewport.', metadata.viewport || 'Ausente', 'medium', 'Añade <meta name="viewport" content="width=device-width,initial-scale=1">.'),
    makeCheck(doc.querySelector('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])') ? 'warn' : 'pass', 'Orden de foco manual', doc.querySelector('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])') ? 'Se detectaron valores tabindex positivos.' : 'No se detectaron tabindex positivos.', '', 'medium', 'Evita tabindex mayor que 0; conserva el orden natural del DOM.'),
    makeCheck(doc.querySelector('[autoplay]') ? 'warn' : 'pass', 'Contenido con autoplay', doc.querySelector('[autoplay]') ? 'Hay contenido multimedia con reproducción automática.' : 'No se detectó autoplay.', '', 'medium', 'Evita autoplay con sonido y ofrece controles para pausar.'),
    makeCheck(doc.querySelector('html[dir],body[dir]') || !/[\u0590-\u08ff]/.test(doc.body?.textContent || '') ? 'pass' : 'warn', 'Dirección de lectura', 'Comprobación básica de contenido bidireccional.', '', 'low', 'Declara dir cuando el idioma o fragmentos lo requieran.')
  ];
  return { checks, stats: { controls: controls.length, unlabeledControls: unlabeledControls.length, buttons: buttons.length, namelessButtons: namelessButtons.length, duplicateIDs: duplicateIDs.length, headingJumps: headingJumps.length, missingAlt: missingAlt.length } };
}

function buildSEOAudit(doc, metadata, headings, content, structuredData, links, images) {
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  const internalLinks = links.filter((link) => link.type === 'internal').length;
  const descriptionLength = metadata.description.length;
  const titleStatus = metadata.titleLength >= 25 && metadata.titleLength <= 65 ? 'pass' : (metadata.titleLength ? 'warn' : 'fail');
  const descriptionStatus = descriptionLength >= 90 && descriptionLength <= 170 ? 'pass' : (descriptionLength ? 'warn' : 'fail');
  const checks = [
    makeCheck(titleStatus, 'Título SEO', metadata.title ? `Longitud: ${metadata.titleLength} caracteres.` : 'Falta el elemento title.', `${metadata.titleLength}`, metadata.title ? 'medium' : 'high', 'Usa un título único, descriptivo y normalmente entre 25 y 65 caracteres.'),
    makeCheck(descriptionStatus, 'Meta description', metadata.description ? `Longitud: ${descriptionLength} caracteres.` : 'No se encontró meta description.', `${descriptionLength}`, metadata.description ? 'medium' : 'high', 'Redacta una descripción única y convincente, aproximadamente entre 90 y 170 caracteres.'),
    makeCheck(h1Count === 1 ? 'pass' : (h1Count === 0 ? 'fail' : 'warn'), 'Encabezado H1', h1Count === 1 ? 'Existe un único H1.' : `Se detectaron ${h1Count} encabezados H1.`, `${h1Count}`, h1Count === 0 ? 'high' : 'medium', 'Utiliza un H1 principal claro; evita usar H1 solo por estilo.'),
    makeCheck(metadata.canonical ? 'pass' : 'warn', 'URL canónica', metadata.canonical ? 'La página declara canonical.' : 'No se encontró canonical.', metadata.canonical || 'Ausente', 'medium', 'Añade una URL canónica absoluta cuando sea pertinente.'),
    makeCheck(metadata.robots ? 'pass' : 'warn', 'Meta robots', metadata.robots ? `Valor: ${metadata.robots}` : 'No se declaró meta robots; se aplicará el comportamiento predeterminado.', metadata.robots || 'Predeterminado', 'low', 'Declara robots cuando necesites controlar indexación o seguimiento.'),
    makeCheck(metadata.openGraph['og:title'] && metadata.openGraph['og:description'] ? 'pass' : 'warn', 'Open Graph', metadata.openGraph['og:title'] && metadata.openGraph['og:description'] ? 'Metadatos sociales principales presentes.' : 'Faltan etiquetas Open Graph principales.', Object.keys(metadata.openGraph).length, 'medium', 'Añade og:title, og:description, og:image y og:url.'),
    makeCheck(structuredData.some((item) => item.valid) ? 'pass' : 'warn', 'Datos estructurados', structuredData.some((item) => item.valid) ? `${structuredData.filter((item) => item.valid).length} bloques JSON-LD válidos.` : 'No se detectó JSON-LD válido.', `${structuredData.length}`, 'medium', 'Añade schema.org relevante y valida el JSON-LD.'),
    makeCheck(content.wordCount >= 250 ? 'pass' : 'warn', 'Contenido textual', `${formatNumber(content.wordCount)} palabras detectadas.`, `${content.wordCount}`, 'low', 'Asegúrate de que la página responda suficientemente a la intención de búsqueda; no rellenes por longitud.'),
    makeCheck(internalLinks > 0 ? 'pass' : 'warn', 'Enlazado interno', internalLinks ? `${internalLinks} enlaces internos únicos.` : 'No se detectaron enlaces internos.', `${internalLinks}`, 'medium', 'Añade navegación contextual hacia contenido relacionado.'),
    makeCheck(images.filter((image) => image.alt === null).length === 0 ? 'pass' : 'warn', 'Alt de imágenes', `${images.filter((image) => image.alt === null).length} imágenes sin atributo alt.`, '', 'medium', 'Describe imágenes informativas con alt útil.'),
    makeCheck(metadata.lang ? 'pass' : 'warn', 'Idioma para buscadores', metadata.lang ? `Idioma declarado: ${metadata.lang}.` : 'No se declaró idioma.', metadata.lang || 'Ausente', 'medium', 'Declara el idioma real de la página.'),
    makeCheck(metadata.canonical && /^https?:\/\//i.test(metadata.canonical) ? 'pass' : 'warn', 'Canonical absoluto', metadata.canonical ? 'La canonical se ha resuelto como URL absoluta.' : 'Sin canonical verificable.', '', 'low', 'Utiliza URL absoluta y coherente con protocolo, host y barra final.')
  ];
  return { checks, h1Count, internalLinks };
}

function buildPerformanceAudit(doc, htmlBytes, cssAnalysis, images, assets) {
  const domNodes = doc.querySelectorAll('*').length;
  const scripts = $$('script', doc);
  const externalScripts = scripts.filter((script) => script.src || script.getAttribute('src'));
  const blockingScripts = externalScripts.filter((script) => !script.async && !script.defer && script.type !== 'module');
  const stylesheets = $$('link[rel~="stylesheet"]', doc);
  const lazyImages = images.filter((image) => image.loading === 'lazy').length;
  const dimensionedImages = images.filter((image) => image.width && image.height).length;
  const inlineJSBytes = $$('script:not([src])', doc).reduce((sum, script) => sum + new Blob([script.textContent || '']).size, 0);
  const inlineCSSBytes = $$('style', doc).reduce((sum, style) => sum + new Blob([style.textContent || '']).size, 0);
  const checks = [
    makeCheck(htmlBytes < 1_000_000 ? 'pass' : (htmlBytes < 3_000_000 ? 'warn' : 'fail'), 'Peso del HTML', `Documento inicial de ${formatBytes(htmlBytes)}.`, formatBytes(htmlBytes), htmlBytes >= 3_000_000 ? 'high' : 'medium', 'Reduce markup repetido, datos embebidos y contenido innecesario.'),
    makeCheck(domNodes < 1500 ? 'pass' : (domNodes < 3000 ? 'warn' : 'fail'), 'Tamaño del DOM', `${formatNumber(domNodes)} nodos HTML.`, `${domNodes}`, domNodes >= 3000 ? 'high' : 'medium', 'Simplifica contenedores y evita renderizar listados enormes de una vez.'),
    makeCheck(stylesheets.length <= 8 ? 'pass' : (stylesheets.length <= 15 ? 'warn' : 'fail'), 'Hojas de estilo', `${stylesheets.length} hojas CSS externas.`, `${stylesheets.length}`, 'medium', 'Agrupa estilos críticos y elimina CSS no utilizado cuando sea posible.'),
    makeCheck(externalScripts.length <= 12 ? 'pass' : (externalScripts.length <= 25 ? 'warn' : 'fail'), 'Scripts externos', `${externalScripts.length} scripts externos.`, `${externalScripts.length}`, externalScripts.length > 25 ? 'high' : 'medium', 'Reduce dependencias y carga scripts solo donde se necesitan.'),
    makeCheck(blockingScripts.length === 0 ? 'pass' : (blockingScripts.length <= 3 ? 'warn' : 'fail'), 'Scripts bloqueantes', `${blockingScripts.length} scripts externos sin async, defer o type=module.`, `${blockingScripts.length}`, blockingScripts.length > 3 ? 'high' : 'medium', 'Usa defer o módulos cuando el orden y la lógica lo permitan.'),
    makeCheck(images.length === 0 || lazyImages / images.length >= .5 ? 'pass' : 'warn', 'Carga diferida de imágenes', images.length ? `${lazyImages} de ${images.length} usan loading="lazy".` : 'No hay imágenes.', `${lazyImages}/${images.length}`, 'medium', 'Aplica lazy loading a imágenes fuera del primer viewport.'),
    makeCheck(images.length === 0 || dimensionedImages / images.length >= .75 ? 'pass' : 'warn', 'Dimensiones de imágenes', images.length ? `${dimensionedImages} de ${images.length} declaran width y height.` : 'No hay imágenes.', `${dimensionedImages}/${images.length}`, 'medium', 'Declara dimensiones o aspect-ratio para reducir saltos de diseño.'),
    makeCheck(cssAnalysis.bytes < 2_000_000 ? 'pass' : (cssAnalysis.bytes < 5_000_000 ? 'warn' : 'fail'), 'CSS analizado', `${formatBytes(cssAnalysis.bytes)} entre estilos inline y hojas accesibles.`, formatBytes(cssAnalysis.bytes), cssAnalysis.bytes >= 5_000_000 ? 'high' : 'medium', 'Divide, purga y minifica CSS; evita frameworks completos si usas una fracción.'),
    makeCheck(inlineJSBytes < 250_000 ? 'pass' : 'warn', 'JavaScript inline', `${formatBytes(inlineJSBytes)} de JavaScript embebido.`, formatBytes(inlineJSBytes), 'medium', 'Mueve bloques grandes a archivos cacheables y revisa datos serializados.'),
    makeCheck(inlineCSSBytes < 180_000 ? 'pass' : 'warn', 'CSS inline', `${formatBytes(inlineCSSBytes)} dentro de <style>.`, formatBytes(inlineCSSBytes), 'low', 'Mantén inline solo el CSS crítico y externaliza el resto.'),
    makeCheck(doc.querySelector('link[rel="preconnect"],link[rel="dns-prefetch"]') || assets.filter((asset) => asset.origin === 'external').length < 4 ? 'pass' : 'warn', 'Conexiones externas', 'Comprobación de preconnect/dns-prefetch para orígenes externos.', '', 'low', 'Añade preconnect solo para orígenes críticos y estables.')
  ];
  return { checks, stats: { domNodes, scripts: scripts.length, externalScripts: externalScripts.length, blockingScripts: blockingScripts.length, stylesheets: stylesheets.length, lazyImages, dimensionedImages, inlineJSBytes, inlineCSSBytes } };
}

function buildSecurityAudit(doc, baseURL, metadata, assets, forms) {
  const base = new URL(baseURL);
  const targetBlankUnsafe = $$('a[target="_blank"]', doc).filter((anchor) => !/\bnoopener\b/i.test(anchor.getAttribute('rel') || ''));
  const inlineHandlers = $$('*', doc).reduce((sum, element) => sum + Array.from(element.attributes || []).filter((attr) => /^on/i.test(attr.name)).length, 0);
  const mixedAssets = assets.filter((asset) => base.protocol === 'https:' && /^http:\/\//i.test(asset.url));
  const insecureForms = forms.filter((form) => /^http:\/\//i.test(form.action || ''));
  const passwordForms = forms.filter((form) => form.passwordFields > 0);
  const externalScripts = assets.filter((asset) => /script/.test(asset.type) && asset.origin === 'external');
  const sriScripts = $$('script[src],link[rel="stylesheet"][href]', doc).filter((element) => {
    const raw = element.getAttribute('src') || element.getAttribute('href');
    const resolved = resolveURL(raw, baseURL);
    try { return resolved && new URL(resolved).hostname !== base.hostname && !element.hasAttribute('integrity'); }
    catch { return false; }
  });
  const checks = [
    makeCheck(base.protocol === 'https:' ? 'pass' : 'fail', 'HTTPS', base.protocol === 'https:' ? 'La página objetivo usa HTTPS.' : 'La URL usa HTTP sin cifrado.', base.protocol, 'critical', 'Publica el sitio completo bajo HTTPS.'),
    makeCheck(mixedAssets.length === 0 ? 'pass' : 'fail', 'Contenido mixto', mixedAssets.length ? `${mixedAssets.length} recursos HTTP dentro de una página HTTPS.` : 'No se detectó contenido mixto en el HTML.', `${mixedAssets.length}`, 'high', 'Actualiza recursos a HTTPS o elimínalos.'),
    makeCheck(targetBlankUnsafe.length === 0 ? 'pass' : 'warn', 'Enlaces target=_blank', targetBlankUnsafe.length ? `${targetBlankUnsafe.length} enlaces no declaran rel="noopener".` : 'Los enlaces en nueva pestaña incluyen noopener o no existen.', `${targetBlankUnsafe.length}`, 'medium', 'Añade rel="noopener noreferrer" a enlaces externos con target="_blank".'),
    makeCheck(inlineHandlers === 0 ? 'pass' : 'warn', 'Eventos JavaScript inline', inlineHandlers ? `${inlineHandlers} atributos on* detectados.` : 'No se detectaron controladores inline.', `${inlineHandlers}`, 'medium', 'Usa addEventListener y una CSP que evite unsafe-inline.'),
    makeCheck(metadata.cspMeta ? 'pass' : 'warn', 'Content Security Policy observable', metadata.cspMeta ? 'Existe una CSP declarada mediante meta.' : 'No se encontró CSP en el HTML; podría existir como cabecera, que esta app no puede confirmar.', metadata.cspMeta ? 'Meta CSP' : 'No verificable', 'medium', 'Configura CSP preferentemente como cabecera HTTP.'),
    makeCheck(insecureForms.length === 0 ? 'pass' : 'fail', 'Destino de formularios', insecureForms.length ? `${insecureForms.length} formularios envían a HTTP.` : 'No se detectaron acciones de formulario HTTP.', `${insecureForms.length}`, 'high', 'Envía formularios únicamente mediante HTTPS.'),
    makeCheck(!(base.protocol !== 'https:' && passwordForms.length) ? 'pass' : 'fail', 'Contraseñas en conexión segura', passwordForms.length ? `${passwordForms.length} formularios incluyen campos de contraseña.` : 'No hay campos de contraseña.', `${passwordForms.length}`, 'critical', 'Nunca recopiles contraseñas mediante HTTP.'),
    makeCheck(externalScripts.length <= 10 ? 'pass' : 'warn', 'Dependencias JavaScript externas', `${externalScripts.length} scripts de otros orígenes.`, `${externalScripts.length}`, 'medium', 'Reduce terceros, documenta su finalidad y revisa privacidad.'),
    makeCheck(sriScripts.length === 0 ? 'pass' : 'warn', 'Subresource Integrity', sriScripts.length ? `${sriScripts.length} scripts o CSS externos sin integrity.` : 'No se detectaron recursos externos candidatos sin SRI.', `${sriScripts.length}`, 'low', 'Usa integrity y crossorigin en recursos versionados de CDN cuando sea viable.'),
    makeCheck(doc.querySelector('iframe:not([sandbox])') ? 'warn' : 'pass', 'Aislamiento de iframes', doc.querySelector('iframe:not([sandbox])') ? 'Hay iframes sin atributo sandbox.' : 'Los iframes están aislados o no existen.', '', 'low', 'Aplica sandbox con permisos mínimos cuando controles la integración.')
  ];
  return { checks, stats: { targetBlankUnsafe: targetBlankUnsafe.length, inlineHandlers, mixedAssets: mixedAssets.length, insecureForms: insecureForms.length, externalScripts: externalScripts.length, missingSRI: sriScripts.length } };
}

function checkScore(checks) {
  const weights = { critical: 5, high: 4, medium: 2.5, low: 1 };
  const values = { pass: 100, warn: 58, fail: 15 };
  const total = checks.reduce((sum, check) => sum + weights[check.severity], 0) || 1;
  return Math.round(checks.reduce((sum, check) => sum + values[check.status] * weights[check.severity], 0) / total);
}

function buildIssues(audits) {
  const issues = [];
  Object.entries(audits).forEach(([category, audit]) => {
    (audit.checks || []).forEach((check) => {
      if (check.status === 'pass') return;
      issues.push({
        category,
        severity: check.status === 'fail' ? check.severity : (check.severity === 'critical' ? 'high' : check.severity),
        title: check.title,
        detail: check.detail,
        fix: check.fix
      });
    });
  });
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity] || a.category.localeCompare(b.category));
}

function buildScores(audits, design) {
  const scores = {
    seo: checkScore(audits.seo.checks),
    accessibility: checkScore(audits.accessibility.checks),
    performance: checkScore(audits.performance.checks),
    security: checkScore(audits.security.checks),
    design: Math.min(100, Math.round(25 + Math.min(25, design.colors.length * 2) + Math.min(20, design.variables.length / 2) + Math.min(12, design.fonts.length * 3) + Math.min(10, design.radii.length * 2) + Math.min(8, design.spacing.length)))
  };
  scores.overall = Math.round(scores.seo * .24 + scores.accessibility * .24 + scores.performance * .18 + scores.security * .19 + scores.design * .15);
  return scores;
}

function collectStylesheetURLs(doc, baseURL) {
  const seen = new Set();
  return $$('link[rel~="stylesheet"][href]', doc).map((link) => resolveURL(link.getAttribute('href'), baseURL)).filter((url) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  }).slice(0, MAX_CSS_FILES);
}

async function loadRemoteCSS(doc, baseURL) {
  if (!$('opt-css').checked) return { text: '', files: [], failed: [] };
  const urls = collectStylesheetURLs(doc, baseURL);
  if (!urls.length) return { text: '', files: [], failed: [] };
  let totalBytes = 0;
  const files = [];
  const failed = [];
  const results = await mapWithConcurrency(urls, 3, async (url, index) => {
    setStatus('Leyendo sistema visual', `Hoja CSS ${index + 1}/${urls.length}`, 25 + (index / Math.max(1, urls.length)) * 25);
    const remaining = MAX_CSS_TOTAL - totalBytes;
    if (remaining <= 0) return { error: new Error('Límite CSS total alcanzado') };
    const response = await fetchResource(url, Math.min(1_500_000, remaining), 'hoja CSS', 26 + index);
    totalBytes += response.bytes;
    return { url, text: response.text, bytes: response.bytes, proxy: response.proxy };
  });
  results.forEach((result, index) => {
    if (!result || result.error) failed.push({ url: urls[index], error: result?.error?.message || 'Error desconocido' });
    else files.push(result);
  });

  // Modo profundo: sigue @import una sola capa para completar el sistema visual
  // sin convertir la aplicación en un crawler masivo.
  if ($('opt-deep').checked && totalBytes < MAX_CSS_TOTAL) {
    const known = new Set(files.map((file) => file.url));
    const imported = [];
    const importRegex = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?/gi;
    files.forEach((file) => {
      let match;
      while ((match = importRegex.exec(file.text)) && imported.length < 8) {
        const resolved = resolveURL(match[1], file.url);
        if (resolved && !known.has(resolved)) { known.add(resolved); imported.push(resolved); }
      }
    });
    const importedResults = await mapWithConcurrency(imported, 2, async (url, index) => {
      setStatus('Análisis profundo', `CSS importado ${index + 1}/${imported.length}`, 47 + index);
      const remaining = MAX_CSS_TOTAL - totalBytes;
      if (remaining <= 0) return { error: new Error('Límite CSS total alcanzado') };
      const response = await fetchResource(url, Math.min(1_200_000, remaining), 'CSS importado', 47 + index);
      totalBytes += response.bytes;
      return { url, text: response.text, bytes: response.bytes, proxy: response.proxy, imported: true };
    });
    importedResults.forEach((result, index) => {
      if (!result || result.error) failed.push({ url: imported[index], error: result?.error?.message || 'Error desconocido' });
      else files.push(result);
    });
  }

  return { text: files.map((file) => `/* SOURCE: ${file.url} */\n${file.text}`).join('\n\n'), files, failed };
}

async function loadSiteFiles(baseURL, doc) {
  if (!$('opt-site-files').checked) return { robots: null, sitemap: null };
  const origin = new URL(baseURL).origin;
  const robotsURL = `${origin}/robots.txt`;
  const sitemapURL = `${origin}/sitemap.xml`;
  setStatus('Consultando arquitectura', 'robots.txt y sitemap.xml', 53);
  const [robotsResult, sitemapResult] = await Promise.all([
    fetchResource(robotsURL, 800_000, 'robots.txt', 53).catch((error) => ({ error })),
    fetchResource(sitemapURL, 3_000_000, 'sitemap.xml', 55).catch((error) => ({ error }))
  ]);
  let robots = null;
  let sitemap = null;
  if (!robotsResult.error) {
    const sitemaps = Array.from(robotsResult.text.matchAll(/^sitemap:\s*(.+)$/gim)).map((match) => cleanText(match[1], 2000));
    robots = {
      url: robotsURL,
      found: true,
      bytes: robotsResult.bytes,
      sitemaps,
      userAgents: (robotsResult.text.match(/^user-agent:/gim) || []).length,
      disallowRules: (robotsResult.text.match(/^disallow:/gim) || []).length,
      allowRules: (robotsResult.text.match(/^allow:/gim) || []).length,
      sample: robotsResult.text.slice(0, 5000)
    };
  } else robots = { url: robotsURL, found: false, error: robotsResult.error.message };
  if (!sitemapResult.error && /<(?:urlset|sitemapindex)[\s>]/i.test(sitemapResult.text)) {
    const parsed = new DOMParser().parseFromString(sitemapResult.text, 'application/xml');
    const locs = $$('loc', parsed).map((node) => cleanText(node.textContent || '', 2000)).filter(Boolean);
    sitemap = { url: sitemapURL, found: true, bytes: sitemapResult.bytes, count: locs.length, entries: locs.slice(0, 500) };
  } else sitemap = { url: sitemapURL, found: false, error: sitemapResult.error?.message || 'Respuesta no reconocida como sitemap' };

  let manifest = null;
  const manifestURL = resolveURL(doc?.querySelector('link[rel="manifest"]')?.getAttribute('href') || '', baseURL);
  if ($('opt-deep').checked && manifestURL) {
    setStatus('Análisis profundo', 'Leyendo Web App Manifest', 58);
    const manifestResult = await fetchResource(manifestURL, 600_000, 'web manifest', 58).catch((error) => ({ error }));
    if (!manifestResult.error) {
      try {
        const parsed = JSON.parse(manifestResult.text);
        manifest = { url: manifestURL, found: true, bytes: manifestResult.bytes, name: parsed.name || '', shortName: parsed.short_name || '', display: parsed.display || '', themeColor: parsed.theme_color || '', icons: Array.isArray(parsed.icons) ? parsed.icons.length : 0, data: parsed };
      } catch (error) {
        manifest = { url: manifestURL, found: false, error: `Manifest JSON no válido: ${error.message}` };
      }
    } else manifest = { url: manifestURL, found: false, error: manifestResult.error.message };
  }
  return { robots, sitemap, manifest };
}

function analyzeDocument({ html, cssText = '', baseURL, source, htmlBytes, cssFiles = [], cssFailed = [], siteFiles = {}, extraSource = '' }, commit = true) {
  if (commit) setStatus('Analizando estructura', 'Extrayendo metadatos, contenido y recursos', 62);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const parserError = doc.querySelector('parsererror');
  if (parserError) throw new Error('El documento no se pudo interpretar como HTML válido.');
  const inlineCSS = $$('style', doc).map((style) => style.textContent || '').join('\n');
  const allCSS = `${inlineCSS}\n${cssText}`;
  const metadata = extractMetadata(doc, baseURL);
  const structuredData = extractStructuredData(doc);
  const headings = extractHeadings(doc);
  const linkData = extractLinks(doc, baseURL);
  const images = extractImages(doc, baseURL);
  const assets = extractAssets(doc, baseURL, images);
  const forms = extractForms(doc, baseURL);
  const tables = extractTables(doc);
  const components = extractComponents(doc);
  const content = extractContent(doc);
  const feeds = extractFeeds(doc, baseURL);

  if (commit) setStatus('Reconstruyendo diseño', 'Extrayendo tokens, patrones y lenguaje visual', 72);
  const design = analyzeCSS(allCSS, doc);
  const technologies = detectTechnologies(html, allCSS, doc, extraSource);

  if (commit) setStatus('Ejecutando auditoría', 'SEO, accesibilidad, rendimiento y seguridad', 84);
  const audits = {
    seo: buildSEOAudit(doc, metadata, headings, content, structuredData, linkData.links, images),
    accessibility: buildAccessibilityAudit(doc, metadata, headings, images),
    performance: buildPerformanceAudit(doc, htmlBytes, design, images, assets),
    security: buildSecurityAudit(doc, baseURL, metadata, assets, forms)
  };
  const issues = buildIssues(audits);
  const scores = buildScores(audits, design);
  const result = {
    app: { name: 'Scraper 404 Omniscient', version: APP_VERSION },
    generatedAt: new Date().toISOString(),
    source,
    page: {
      url: baseURL,
      host: (() => { try { return new URL(baseURL).hostname; } catch { return 'local'; } })(),
      htmlBytes,
      cssBytes: design.bytes,
      cssFiles: cssFiles.map((file) => ({ url: file.url, bytes: file.bytes, proxy: file.proxy })),
      cssFailed,
      siteFiles
    },
    metadata,
    content,
    headings,
    links: linkData.links,
    contacts: { emails: linkData.emails, phones: linkData.phones },
    images,
    assets,
    forms,
    tables,
    structuredData,
    feeds,
    components,
    design,
    technologies,
    audits,
    issues,
    scores,
    stats: {
      links: linkData.links.length,
      internalLinks: linkData.links.filter((link) => link.type === 'internal').length,
      externalLinks: linkData.links.filter((link) => link.type === 'external' || link.type === 'subdomain').length,
      images: images.length,
      imagesMissingAlt: images.filter((image) => image.alt === null).length,
      headings: headings.length,
      assets: assets.length,
      forms: forms.length,
      tables: tables.length,
      technologies: technologies.length,
      cssVariables: design.variables.length,
      colors: design.colors.length,
      issues: issues.length
    }
  };
  if (commit) {
    state.document = doc;
    state.html = html;
    state.css = allCSS;
    state.result = result;
  }
  return result;
}

async function analyzeURL() {
  const url = normalizeURL($('url-input').value);
  $('url-input').value = url;
  state.abortController = new AbortController();
  state.engine.lastRender = null;
  setBusy(true);
  setStatus('Iniciando expediente', 'Validando URL y preparando motor', 4);
  try {
    const htmlResponse = await fetchRenderedMain(url);
    if (!looksLikeHTML(htmlResponse.text, htmlResponse.contentType)) throw new Error('La respuesta no parece contener una página HTML.');
    const analysisBaseURL = htmlResponse.finalURL || url;
    setStatus('HTML recibido', `${formatBytes(htmlResponse.bytes)} mediante ${htmlResponse.proxy}`, 22);
    const doc = new DOMParser().parseFromString(htmlResponse.text, 'text/html');
    const [cssData, siteFiles] = await Promise.all([
      loadRemoteCSS(doc, analysisBaseURL),
      loadSiteFiles(analysisBaseURL, doc)
    ]);
    const result = analyzeDocument({
      html: htmlResponse.text,
      cssText: cssData.text,
      baseURL: analysisBaseURL,
      source: {
        type: htmlResponse.engine ? 'local-engine' : 'url',
        label: url,
        proxy: htmlResponse.proxy,
        contentType: htmlResponse.contentType,
        browser: htmlResponse.engine?.browser || ''
      },
      htmlBytes: htmlResponse.bytes,
      cssFiles: cssData.files,
      cssFailed: cssData.failed,
      siteFiles
    });
    result.engine = htmlResponse.engine || null;
    if ($('opt-rendered').checked && !htmlResponse.engine && !/web\.archive\.org/i.test(url)) {
      setStatus('Rescate SPA', 'Obteniendo contenido renderizado mediante r.jina.ai', 90);
      result.rendered = await fetchRenderedContent(url);
    }
    completeAnalysis(result);
  } catch (error) {
    handleAnalysisError(error);
  } finally {
    setBusy(false);
    state.abortController = null;
  }
}

async function analyzePasted() {
  const html = $('paste-html').value.trim();
  if (!html) return toast('Pega primero el HTML que quieres analizar.');
  let baseURL;
  try { baseURL = normalizeURL($('paste-base').value || 'https://example.local/'); }
  catch (error) { return toast(error.message); }
  state.abortController = new AbortController();
  setBusy(true);
  setStatus('Analizando código pegado', 'Procesamiento completamente local', 18);
  try {
    const result = analyzeDocument({
      html,
      cssText: $('paste-css').value,
      baseURL,
      source: { type: 'paste', label: 'Código pegado localmente', proxy: 'Ninguno' },
      htmlBytes: new Blob([html]).size
    });
    completeAnalysis(result);
  } catch (error) {
    handleAnalysisError(error);
  } finally {
    setBusy(false);
    state.abortController = null;
  }
}

async function readLocalFiles(files) {
  const accepted = files.filter((file) => /\.(?:html?|css|js|json|xml|svg|txt)$/i.test(file.name));
  const total = accepted.reduce((sum, file) => sum + file.size, 0);
  if (!accepted.length) throw new Error('No se encontraron archivos HTML, CSS o JavaScript compatibles.');
  if (accepted.length > MAX_LOCAL_FILES) throw new Error(`El proyecto contiene ${accepted.length} archivos compatibles y supera el límite de ${MAX_LOCAL_FILES}. Divide el proyecto o elimina dependencias/compilados antes de analizarlo.`);
  if (total > MAX_LOCAL_TOTAL) throw new Error(`El proyecto supera el límite local de ${formatBytes(MAX_LOCAL_TOTAL)}.`);
  setStatus('Leyendo proyecto local', `${accepted.length} archivos seleccionados`, 18);
  const entries = await Promise.all(accepted.map(async (file) => ({
    name: file.name,
    path: file.webkitRelativePath || file.name,
    type: file.type,
    size: file.size,
    text: await file.text()
  })));
  return entries;
}

async function analyzeLocal() {
  if (!state.localFiles.length) return toast('Selecciona una carpeta o varios archivos.');
  state.abortController = new AbortController();
  setBusy(true);
  try {
    const entries = await readLocalFiles(state.localFiles);
    const htmlEntries = entries.filter((entry) => /\.html?$/i.test(entry.name));
    if (!htmlEntries.length) throw new Error('El proyecto no contiene ningún archivo HTML.');
    const main = htmlEntries.sort((a, b) => {
      const aIndex = /(^|\/)index\.html?$/i.test(a.path) ? -1000 : 0;
      const bIndex = /(^|\/)index\.html?$/i.test(b.path) ? -1000 : 0;
      return aIndex - bIndex || a.path.split('/').length - b.path.split('/').length || a.path.length - b.path.length;
    })[0];
    const cssEntries = entries.filter((entry) => /\.css$/i.test(entry.name));
    const scriptEntries = entries.filter((entry) => /\.js$/i.test(entry.name));
    const cssText = cssEntries.map((entry) => `/* LOCAL: ${entry.path} */\n${entry.text}`).join('\n\n');
    const extraSource = scriptEntries.map((entry) => entry.text).join('\n').slice(0, 3_000_000);
    const baseURL = `https://local.project/${main.path.replace(/[^/]+$/, '')}`;
    const result = analyzeDocument({
      html: main.text,
      cssText,
      baseURL,
      source: { type: 'local', label: main.path, proxy: 'Ninguno', files: entries.length },
      htmlBytes: main.size,
      cssFiles: cssEntries.map((entry) => ({ url: entry.path, bytes: entry.size, proxy: 'Local' })),
      extraSource
    });
    result.page.localInventory = entries.map(({ path, size, type }) => ({ path, size, type })).slice(0, 3000);
    completeAnalysis(result);
  } catch (error) {
    handleAnalysisError(error);
  } finally {
    setBusy(false);
    state.abortController = null;
  }
}

function setBusy(busy) {
  if (busy) clearStatusActions();
  ['btn-analyze', 'btn-analyze-paste', 'btn-analyze-local', 'btn-analyze-batch'].forEach((id) => { $(id).disabled = busy || (id === 'btn-analyze-local' && !state.localFiles.length); });
  $('btn-cancel').hidden = !busy;
}

function handleAnalysisError(error) {
  const cancelled = error?.name === 'AbortError';
  setStatus(cancelled ? 'Análisis cancelado' : 'No se pudo completar', cancelled ? 'La operación se detuvo sin guardar cambios.' : error.message, cancelled ? 0 : 100, 'error');
  $('analysis-status').dataset.keep = 'true';
  if (!cancelled) {
    console.error(error);
    if (state.mode === 'url' && /descargar HTML principal/i.test(error.message || '')) offerWayback($('url-input').value.trim());
  }
}

function completeAnalysis(result) {
  $('analysis-status').dataset.keep = 'false';
  setStatus('Generando expediente', 'Preparando paneles y exportaciones', 94);
  renderResult(result);
  saveHistoryEntry(result);
  finishStatus('Análisis completado', `${result.stats.issues} hallazgos · puntuación ${result.scores.overall}/100`);
  $('results').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function appendDetailList(target, rows) {
  clear(target);
  rows.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    if (value === null || value === undefined || value === '') {
      dd.textContent = '— no detectado';
      dd.className = 'is-empty';
    } else dd.textContent = String(value);
    target.append(dt, dd);
  });
}

function appendMetric(target, value, label) {
  const card = document.createElement('div');
  card.className = 'metric';
  const strong = document.createElement('strong');
  strong.textContent = value;
  const span = document.createElement('span');
  span.textContent = label;
  card.append(strong, span);
  target.appendChild(card);
}

function scoreColor(score) {
  if (score >= 85) return 'var(--green)';
  if (score >= 70) return 'var(--gold)';
  if (score >= 50) return 'var(--orange)';
  return 'var(--red)';
}

function renderScores(result) {
  const target = $('score-grid');
  clear(target);
  const entries = [
    ['Puntuación global', result.scores.overall, 'Auditoría combinada', true],
    ['SEO', result.scores.seo, 'Visibilidad'],
    ['Accesibilidad', result.scores.accessibility, 'Auditoría estática'],
    ['Rendimiento', result.scores.performance, 'Riesgo estimado'],
    ['Seguridad', result.scores.security, 'HTML observable'],
    ['Diseño', result.scores.design, 'Sistema extraído']
  ];
  entries.forEach(([label, score, subtitle, main]) => {
    const card = document.createElement('div');
    card.className = `score-card${main ? ' score-card--main' : ''}`;
    card.style.setProperty('--score-color', scoreColor(score));
    const span = document.createElement('span'); span.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = `${score}`;
    const small = document.createElement('small'); small.textContent = subtitle;
    card.append(span, strong, small);
    target.appendChild(card);
  });
}

function renderOverview(result) {
  const metrics = $('overview-metrics');
  clear(metrics);
  [
    [formatNumber(result.content.wordCount), 'Palabras'],
    [formatNumber(result.stats.links), 'Enlaces únicos'],
    [formatNumber(result.stats.images), 'Imágenes'],
    [formatNumber(result.stats.assets), 'Recursos'],
    [formatNumber(result.stats.cssVariables), 'Variables CSS'],
    [formatNumber(result.stats.technologies), 'Tecnologías']
  ].forEach(([value, label]) => appendMetric(metrics, value, label));

  $('issues-count').textContent = result.issues.length;
  const issuesTarget = $('issues-list');
  clear(issuesTarget);
  if (!result.issues.length) {
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se detectaron incidencias automáticas.'; issuesTarget.appendChild(p);
  } else {
    result.issues.slice(0, 18).forEach((issue) => {
      const article = document.createElement('article');
      article.className = `issue issue--${issue.severity}`;
      const mark = document.createElement('span'); mark.className = 'issue__mark'; mark.textContent = issue.severity === 'critical' ? '!!' : issue.severity[0].toUpperCase();
      const body = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = `${issue.title} · ${issue.category}`;
      const detail = document.createElement('p'); detail.textContent = issue.detail;
      body.append(title, detail);
      if (issue.fix) { const fix = document.createElement('small'); fix.textContent = `Acción: ${issue.fix}`; body.appendChild(fix); }
      article.append(mark, body);
      issuesTarget.appendChild(article);
    });
  }

  appendDetailList($('identity-list'), [
    ['Título', result.metadata.title],
    ['Descripción', result.metadata.description],
    ['Idioma', result.metadata.lang],
    ['Canonical', result.metadata.canonical],
    ['HTML', formatBytes(result.page.htmlBytes)],
    ['CSS analizado', formatBytes(result.page.cssBytes)],
    ['Lectura', `${result.content.readingMinutes} min`],
    ['Generador', result.metadata.generator]
  ]);

  const componentMap = $('component-map');
  clear(componentMap);
  result.components.forEach((item) => {
    const chip = document.createElement('span'); chip.className = 'component-chip';
    const name = document.createTextNode(`${item.name} `);
    const count = document.createElement('b'); count.textContent = item.count;
    chip.append(name, count); componentMap.appendChild(chip);
  });
}

function renderDesign(result) {
  const design = result.design;
  $('design-style-name').textContent = design.style.name;
  $('design-confidence').textContent = `${design.style.confidence}%`;
  const tags = $('design-tags'); clear(tags);
  [...design.style.tags, ...design.style.alternatives.map((item) => `Influencia: ${item}`)].slice(0, 10).forEach((text) => {
    const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = text; tags.appendChild(chip);
  });

  $('colors-count').textContent = design.colors.length;
  const palette = $('color-palette'); clear(palette);
  if (!design.colors.length) {
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se pudieron extraer colores CSS.'; palette.appendChild(p);
  } else {
    design.colors.slice(0, 16).forEach((color) => {
      const card = document.createElement('div'); card.className = 'swatch';
      const sample = document.createElement('div'); sample.className = 'swatch__color'; sample.style.setProperty('--swatch', color.value);
      const meta = document.createElement('div'); meta.className = 'swatch__meta';
      const strong = document.createElement('strong'); strong.textContent = color.value;
      const small = document.createElement('small'); small.textContent = `${color.count} apariciones`;
      meta.append(strong, small); card.append(sample, meta); palette.appendChild(card);
    });
  }

  const tokenTarget = $('token-preview'); clear(tokenTarget);
  Object.entries(design.tokens.color).forEach(([name, value]) => {
    const row = document.createElement('div'); row.className = 'token-row';
    const label = document.createElement('span'); label.textContent = name;
    const dot = document.createElement('span'); dot.className = 'token-dot'; dot.style.setProperty('--token', value);
    const code = document.createElement('code'); code.textContent = value;
    row.append(label, dot, code); tokenTarget.appendChild(row);
  });

  renderSummaryStack($('typography-summary'), [
    ['Familia principal', design.tokens.typography.body],
    ['Familia de títulos', design.tokens.typography.heading],
    ['Tamaño base inferido', design.tokens.typography.baseSize],
    ['Tamaños detectados', design.fontSizes.slice(0, 7).map((item) => item.value).join(' · ') || '—'],
    ['Pesos frecuentes', design.fontWeights.slice(0, 6).map((item) => item.value).join(' · ') || '—']
  ]);
  renderSummaryStack($('shape-summary'), [
    ['Radio dominante', design.tokens.shape.radius],
    ['Sombra dominante', design.tokens.shape.shadow],
    ['Radios detectados', design.radii.slice(0, 6).map((item) => item.value).join(' · ') || '—'],
    ['Gradientes', `${design.gradients.length}`],
    ['Motion', design.tokens.motion.transition]
  ]);

  const inventory = $('design-inventory'); clear(inventory);
  [
    ['Reglas CSS aprox.', formatNumber(design.rulesApprox)],
    ['Variables', formatNumber(design.variables.length)],
    ['Colores', formatNumber(design.colors.length)],
    ['Fuentes', formatNumber(design.fonts.length)],
    ['Escala de espacio', design.spacing.slice(0, 7).map((item) => item.value).join(' / ') || '—'],
    ['Breakpoints', design.breakpoints.slice(0, 5).map((item) => item.value).join(' · ') || '—'],
    ['Animaciones', formatNumber(design.animations.length)],
    ['Layouts', design.displays.slice(0, 5).map((item) => item.value).join(' · ') || '—']
  ].forEach(([label, value]) => {
    const item = document.createElement('div'); item.className = 'inventory-item';
    const span = document.createElement('span'); span.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value;
    item.append(span, strong); inventory.appendChild(item);
  });

  $('variables-count').textContent = design.variables.length;
  const tbody = $('variables-table').tBodies[0]; clear(tbody);
  design.variables.slice(0, MAX_TABLE_ROWS).forEach((item) => {
    const row = tbody.insertRow();
    [item.name, item.value, item.uses].forEach((value) => { const cell = row.insertCell(); cell.textContent = value; });
  });
  if (!design.variables.length) appendEmptyTableRow(tbody, 3, 'No se encontraron variables CSS personalizadas.');
}

function renderSummaryStack(target, rows) {
  clear(target);
  const stack = document.createElement('div'); stack.className = 'summary-stack';
  rows.forEach(([label, value]) => {
    const item = document.createElement('div'); item.className = 'summary-item';
    const span = document.createElement('span'); span.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value || '—';
    item.append(span, strong); stack.appendChild(item);
  });
  target.appendChild(stack);
}

function renderSEO(result) {
  appendDetailList($('seo-list'), [
    [`Título (${result.metadata.titleLength})`, result.metadata.title],
    [`Descripción (${result.metadata.description.length})`, result.metadata.description],
    ['Canonical', result.metadata.canonical],
    ['Robots', result.metadata.robots],
    ['Viewport', result.metadata.viewport],
    ['Charset', result.metadata.charset],
    ['Hreflang', result.metadata.alternateLanguages.map((item) => `${item.lang}: ${item.url}`).join(' · ')],
    ['robots.txt', result.page.siteFiles?.robots?.found ? `${result.page.siteFiles.robots.disallowRules} reglas disallow` : 'No verificado o no encontrado'],
    ['Sitemap', result.page.siteFiles?.sitemap?.found ? `${result.page.siteFiles.sitemap.count} URL` : 'No verificado o no encontrado']
  ]);
  $('headings-count').textContent = result.headings.length;
  const tree = $('heading-tree'); clear(tree);
  result.headings.slice(0, 250).forEach((heading) => {
    const row = document.createElement('div'); row.className = 'heading-row'; row.style.marginLeft = `${Math.max(0, heading.level - 1) * 10}px`;
    const level = document.createElement('span'); level.textContent = heading.tag.toUpperCase();
    const text = document.createElement('p'); text.textContent = heading.text || '— encabezado vacío';
    row.append(level, text); tree.appendChild(row);
  });
  if (!result.headings.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se encontraron encabezados.'; tree.appendChild(p); }

  const socialRows = [...Object.entries(result.metadata.openGraph), ...Object.entries(result.metadata.twitter)];
  appendDetailList($('social-list'), socialRows.length ? socialRows : [['Open Graph / Twitter', 'No detectado']]);
  $('schema-count').textContent = result.structuredData.length;
  const schemaTarget = $('schema-list'); clear(schemaTarget);
  result.structuredData.forEach((item) => {
    const card = document.createElement('div'); card.className = 'schema-item';
    const title = document.createElement('strong'); title.textContent = item.valid ? item.type : 'JSON-LD inválido';
    const code = document.createElement('code'); code.textContent = item.valid ? JSON.stringify(item.data).slice(0, 700) : `${item.error}: ${item.raw}`;
    card.append(title, code); schemaTarget.appendChild(card);
  });
  if (!result.structuredData.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se detectó JSON-LD.'; schemaTarget.appendChild(p); }
}

function renderCheckList(target, checks) {
  clear(target);
  checks.forEach((check) => {
    const card = document.createElement('div'); card.className = `check check--${check.status}`;
    const icon = document.createElement('span'); icon.className = 'check__icon'; icon.textContent = check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : '×';
    const body = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = check.title;
    const detail = document.createElement('p'); detail.textContent = check.detail;
    body.append(title, detail);
    const value = document.createElement('span'); value.className = 'check__value'; value.textContent = check.value || '';
    card.append(icon, body, value); target.appendChild(card);
  });
}

function renderAccessibility(result) {
  const metrics = $('a11y-metrics'); clear(metrics);
  [
    [result.audits.accessibility.stats.missingAlt, 'Imágenes sin alt'],
    [result.audits.accessibility.stats.unlabeledControls, 'Controles sin label'],
    [result.audits.accessibility.stats.namelessButtons, 'Botones sin nombre'],
    [result.audits.accessibility.stats.duplicateIDs, 'IDs duplicados'],
    [result.audits.accessibility.stats.headingJumps, 'Saltos de heading'],
    [result.scores.accessibility, 'Puntuación / 100']
  ].forEach(([value, label]) => appendMetric(metrics, value, label));
  renderCheckList($('a11y-checks'), result.audits.accessibility.checks);
}

function renderTech(result) {
  const target = $('tech-grid'); clear(target);
  if (!result.technologies.length) {
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se identificaron tecnologías con suficiente confianza.'; target.appendChild(p);
  } else {
    result.technologies.forEach((tech) => {
      const card = document.createElement('article'); card.className = 'tech-card';
      const category = document.createElement('span'); category.textContent = tech.category;
      const name = document.createElement('strong'); name.textContent = tech.name;
      const detail = document.createElement('small'); detail.textContent = `Confianza ${tech.confidence}${tech.detail ? ` · ${tech.detail}` : ''}`;
      card.append(category, name, detail); target.appendChild(card);
    });
  }
  renderCheckList($('performance-checks'), result.audits.performance.checks);
  renderCheckList($('security-checks'), result.audits.security.checks);
}

function appendEmptyTableRow(tbody, columns, text) {
  const row = tbody.insertRow(); const cell = row.insertCell(); cell.colSpan = columns; cell.className = 'empty-state'; cell.textContent = text;
}

function appendLinkCell(row, url) {
  const cell = row.insertCell();
  if (/^https?:/i.test(url)) {
    const anchor = document.createElement('a'); anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer nofollow'; anchor.textContent = url; cell.appendChild(anchor);
  } else cell.textContent = url;
}

function renderAssets(result, filter = '') {
  const tbody = $('assets-table').tBodies[0]; clear(tbody);
  const term = filter.trim().toLowerCase();
  const rows = result.assets.filter((asset) => !term || `${asset.type} ${asset.url} ${asset.attrs} ${asset.origin}`.toLowerCase().includes(term)).slice(0, MAX_TABLE_ROWS);
  rows.forEach((asset) => {
    const row = tbody.insertRow();
    row.insertCell().textContent = asset.type;
    appendLinkCell(row, asset.url);
    row.insertCell().textContent = asset.attrs || '—';
    row.insertCell().textContent = asset.origin;
  });
  if (!rows.length) appendEmptyTableRow(tbody, 4, 'No hay recursos que coincidan con el filtro.');
}

function renderLinks(result, filter = '', kind = 'all') {
  const tbody = $('links-table').tBodies[0]; clear(tbody);
  const term = filter.trim().toLowerCase();
  const rows = result.links.filter((link) => (kind === 'all' || link.type === kind) && (!term || `${link.text} ${link.url} ${link.type} ${link.rel}`.toLowerCase().includes(term))).slice(0, MAX_TABLE_ROWS);
  rows.forEach((link) => {
    const row = tbody.insertRow(); row.insertCell().textContent = link.text || '—'; appendLinkCell(row, link.url);
    const typeCell = row.insertCell(); const badge = document.createElement('span'); badge.className = `tag-badge tag-badge--${link.type}`; badge.textContent = link.type; typeCell.appendChild(badge);
    row.insertCell().textContent = link.rel || '—';
  });
  if (!rows.length) appendEmptyTableRow(tbody, 4, 'No hay enlaces que coincidan con el filtro.');
}

function renderImages(result, filter = '') {
  const target = $('image-gallery'); clear(target);
  const term = filter.trim().toLowerCase();
  const rows = result.images.filter((image) => !term || `${image.alt || ''} ${image.url || ''} ${image.className}`.toLowerCase().includes(term)).slice(0, 250);
  rows.forEach((image) => {
    const card = document.createElement('article'); card.className = 'image-card';
    const preview = document.createElement('div'); preview.className = 'image-card__preview';
    if (image.url && /^https:/i.test(image.url)) {
      const img = document.createElement('img'); img.src = image.url; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; preview.appendChild(img);
    } else { const placeholder = document.createElement('span'); placeholder.textContent = image.inlineData ? 'DATA URI' : 'SIN PREVIEW'; preview.appendChild(placeholder); }
    const body = document.createElement('div'); body.className = 'image-card__body';
    const title = document.createElement('strong'); title.textContent = image.alt === null ? '⚠ Sin atributo alt' : (image.alt || 'Imagen decorativa');
    body.appendChild(title);
    if (image.url) { const link = document.createElement('a'); link.href = image.url; link.target = '_blank'; link.rel = 'noopener noreferrer nofollow'; link.textContent = image.url; body.appendChild(link); }
    const meta = document.createElement('div'); meta.className = 'image-card__meta';
    [image.loading && `loading:${image.loading}`, image.width && image.height && `${image.width}×${image.height}`, image.sources.length && `${image.sources.length} srcset`].filter(Boolean).forEach((text) => { const badge = document.createElement('span'); badge.className = 'tag-badge'; badge.textContent = text; meta.appendChild(badge); });
    body.appendChild(meta); card.append(preview, body); target.appendChild(card);
  });
  if (!rows.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No hay imágenes que coincidan con el filtro.'; target.appendChild(p); }
}

function renderData(result) {
  const cards = $('detected-data'); clear(cards);
  [
    ['Emails', result.contacts.emails.length, result.contacts.emails.slice(0, 8).join(' · ')],
    ['Teléfonos', result.contacts.phones.length, result.contacts.phones.slice(0, 8).join(' · ')],
    ['Formularios', result.forms.length, result.forms.map((form) => `${form.method.toUpperCase()} · ${form.controls} controles`).slice(0, 5).join(' / ')],
    ['Tablas', result.tables.length, result.tables.map((table) => `${table.rowCount}×${table.columnCount}`).join(' · ')],
    ['JSON-LD', result.structuredData.length, result.structuredData.map((item) => item.type).slice(0, 8).join(' · ')],
    ['Párrafos', result.content.paragraphCount, `Media: ${result.content.averageParagraphWords} palabras`]
  ].forEach(([label, value, detail]) => {
    const card = document.createElement('article'); card.className = 'data-card';
    const span = document.createElement('span'); span.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value;
    const p = document.createElement('p'); p.textContent = detail || '—';
    card.append(span, strong, p); cards.appendChild(card);
  });
  $('tables-count').textContent = result.tables.length;
  const previews = $('tables-preview'); clear(previews);
  result.tables.forEach((table) => {
    const wrap = document.createElement('div'); wrap.className = 'table-preview';
    const head = document.createElement('div'); head.className = 'table-preview__head';
    const label = document.createElement('strong');
    /* Honestidad: se muestran 10 filas, se exportan todas las extraidas. */
    label.textContent = table.caption || `Tabla ${table.index}`;
    const meta = document.createElement('small');
    meta.textContent = table.truncated
      ? `${formatNumber(table.extractedRows)} de ${formatNumber(table.rowCount)} filas extraídas (recortada por límite) · ${table.columnCount} col.`
      : `${formatNumber(table.extractedRows)} filas × ${table.columnCount} col. · vista previa de 10`;
    const csvBtn = document.createElement('button');
    csvBtn.type = 'button'; csvBtn.className = 'secondary-btn'; csvBtn.textContent = 'CSV';
    csvBtn.addEventListener('click', () => downloadTableCSV(table));
    const labelBox = document.createElement('div'); labelBox.append(label, meta);
    head.append(labelBox, csvBtn);
    const htmlTable = document.createElement('table');
    table.rows.slice(0, 10).forEach((cells, rowIndex) => {
      const row = htmlTable.insertRow();
      cells.forEach((text) => { const cell = document.createElement(rowIndex === 0 && table.headers.length ? 'th' : 'td'); cell.textContent = text; row.appendChild(cell); });
    });
    wrap.append(head, htmlTable); previews.appendChild(wrap);
  });
  if (!result.tables.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se detectaron tablas HTML.'; previews.appendChild(p); }
}

function renderResult(result) {
  const link = $('result-url');
  link.textContent = result.page.url;
  link.href = result.page.url;
  $('result-meta').textContent = `${new Date(result.generatedAt).toLocaleString('es-ES')} · ${result.source.type.toUpperCase()} · ${formatBytes(result.page.htmlBytes)} HTML · ${formatBytes(result.page.cssBytes)} CSS`;
  renderScores(result);
  renderOverview(result);
  renderDesign(result);
  renderSEO(result);
  renderAccessibility(result);
  renderTech(result);
  renderAssets(result);
  renderLinks(result);
  renderImages(result);
  renderData(result);
  state.contentMarkdown = null;
  renderContentView(result);
  renderContrast(result);
  renderPreviews(result);
  renderFeeds(result);
  renderRendered(result);
  void renderEngineResult(result);
  renderCompare();
  $('regex-results').innerHTML = '<p class="empty-state">Introduce una expresión regular para empezar.</p>';
  $('btn-copy-regex').disabled = true;
  $('btn-export-regex').disabled = true;
  state.regexResults = [];
  $('selector-input').value = '';
  $('selector-results').innerHTML = '<p class="empty-state">Introduce un selector para empezar.</p>';
  $('btn-copy-selector').disabled = true;
  $('btn-export-selector').disabled = true;
  state.selectorResults = [];
  selectView('overview');
}

function safeCSSValue(value, fallback = '') {
  const text = String(value || '').replace(/[{}<>]/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return text.slice(0, 500) || fallback;
}

function tokenCSS(result) {
  const token = result.design.tokens;
  const spacing = token.spacing.slice(0, 8);
  return `/* Scraper 404 Omniscient · Design tokens inferidos
   Fuente: ${result.page.url}
   Generado: ${result.generatedAt}
   Revisa manualmente los valores antes de producción. */

:root {
  --color-background: ${safeCSSValue(token.color.background, '#ffffff')};
  --color-surface: ${safeCSSValue(token.color.surface, '#f5f6f8')};
  --color-primary: ${safeCSSValue(token.color.primary, '#2457d6')};
  --color-accent: ${safeCSSValue(token.color.accent, '#2457d6')};
  --color-text: ${safeCSSValue(token.color.text, '#15171b')};
  --color-muted: ${safeCSSValue(token.color.muted, '#667085')};
  --color-border: ${safeCSSValue(token.color.border, '#d9dde5')};

  --font-body: ${safeCSSValue(token.typography.body, 'system-ui, sans-serif')};
  --font-heading: ${safeCSSValue(token.typography.heading, 'var(--font-body)')};
  --font-size-base: ${safeCSSValue(token.typography.baseSize, '16px')};

  --radius-base: ${safeCSSValue(token.shape.radius, '8px')};
  --shadow-base: ${safeCSSValue(token.shape.shadow, '0 10px 30px rgba(0,0,0,.12)')};
  --transition-base: ${safeCSSValue(token.motion.transition, '180ms ease')};
${spacing.map((value, index) => `  --space-${index + 1}: ${safeCSSValue(value, `${(index + 1) * 4}px`)};`).join('\n')}
}
`;
}

function starterCSS(result) {
  return `${tokenCSS(result)}
* { box-sizing: border-box; }
html { color-scheme: ${luminance(result.design.tokens.color.background) < .45 ? 'dark' : 'light'}; }
body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-text);
  font: var(--font-size-base)/1.6 var(--font-body);
}
h1, h2, h3, h4 { font-family: var(--font-heading); line-height: 1.12; }
a { color: var(--color-primary); }
.container { width: min(1120px, calc(100% - 32px)); margin-inline: auto; }
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-base);
  padding: var(--space-4, 24px);
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2, 8px);
  border: 1px solid transparent;
  border-radius: var(--radius-base);
  background: var(--color-primary);
  color: var(--color-background);
  padding: .75rem 1rem;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--transition-base), filter var(--transition-base);
}
.button:hover { transform: translateY(-1px); filter: brightness(1.06); }
.button--secondary { background: var(--color-surface); color: var(--color-text); border-color: var(--color-border); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4, 24px); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; } }
`;
}

function designSystemMarkdown(result) {
  const d = result.design;
  const token = d.tokens;
  return `# Design System extraído — ${result.metadata.title || result.page.host}

> Generado por Scraper 404 Omniscient ${APP_VERSION} el ${new Date(result.generatedAt).toLocaleString('es-ES')}.  
> Fuente: ${result.page.url}  
> Confianza del análisis visual: ${d.style.confidence}%  
> Resultado inferido mediante análisis estático de HTML y CSS. Debe validarse visualmente.

## Dirección visual

- **Estilo principal:** ${d.style.name}
- **Rasgos:** ${d.style.tags.join(', ') || 'No determinados'}
- **Influencias posibles:** ${d.style.alternatives.join(', ') || 'No determinadas'}
- **Tema dominante:** ${(luminance(token.color.background) ?? .8) < .45 ? 'oscuro' : 'claro'}

## Paleta recomendada

| Token | Valor |
|---|---|
${Object.entries(token.color).map(([name, value]) => `| \`--color-${name}\` | \`${value}\` |`).join('\n')}

### Colores más frecuentes

${d.colors.slice(0, 16).map((item) => `- \`${item.value}\` — ${item.count} apariciones`).join('\n') || '- No se extrajeron colores.'}

## Tipografía

- **Cuerpo:** ${token.typography.body}
- **Títulos:** ${token.typography.heading}
- **Tamaño base:** ${token.typography.baseSize}
- **Escala detectada:** ${d.fontSizes.slice(0, 12).map((item) => item.value).join(' / ') || 'No determinada'}
- **Pesos frecuentes:** ${d.fontWeights.slice(0, 10).map((item) => item.value).join(' / ') || 'No determinados'}

## Espaciado, forma y profundidad

- **Escala de espacio:** ${token.spacing.join(' / ')}
- **Radio dominante:** ${token.shape.radius}
- **Radios detectados:** ${d.radii.slice(0, 10).map((item) => item.value).join(' / ') || 'No determinados'}
- **Sombra dominante:** ${token.shape.shadow}
- **Transición dominante:** ${token.motion.transition}

## Layout y responsive

- **Display frecuentes:** ${d.displays.slice(0, 10).map((item) => `${item.value} (${item.count})`).join(', ') || 'No determinado'}
- **Breakpoints:** ${d.breakpoints.slice(0, 12).map((item) => item.value).join(' · ') || 'No detectados'}
- **Grid CSS:** ${d.featureFlags.cssGrid ? 'Sí' : 'No detectado'}
- **Flexbox:** ${d.featureFlags.flexbox ? 'Sí' : 'No detectado'}
- **Container queries:** ${d.featureFlags.containerQueries ? 'Sí' : 'No detectadas'}
- **Reduced motion:** ${d.featureFlags.reducedMotion ? 'Contemplado' : 'No detectado'}

## Componentes observados

${result.components.map((item) => `- ${item.name}: ${item.count}`).join('\n') || '- No se identificaron componentes.'}

## Variables CSS originales

| Variable | Valor | Usos |
|---|---|---:|
${d.variables.slice(0, 150).map((item) => `| \`${item.name}\` | \`${String(item.value).replace(/\|/g, '\\|')}\` | ${item.uses} |`).join('\n') || '| — | No se encontraron variables | 0 |'}

## Reglas de aplicación recomendadas

1. Mantener la jerarquía visual y el contraste; no copiar elementos protegidos como logos, ilustraciones o contenido editorial.
2. Usar los tokens como punto de partida, no como una reproducción exacta sin revisión.
3. Validar contraste WCAG, estados de foco, responsive y reduced motion.
4. Consolidar variables duplicadas antes de aplicarlas a otro proyecto.
5. Conservar la personalidad propia del nuevo producto.
`;
}

function recreationPrompt(result) {
  const d = result.design;
  const t = d.tokens;
  return `Actúa como un equipo senior de diseño de producto y desarrollo frontend. Debes crear una interfaz original inspirada en el lenguaje visual analizado a continuación, sin copiar textos, marcas, logotipos, imágenes ni estructura propietaria de la web fuente.

OBJETIVO
Crear una aplicación o página premium, responsive, accesible y lista para producción que conserve los principios visuales detectados, pero tenga identidad propia.

FUENTE ANALIZADA
- URL de referencia: ${result.page.url}
- Estilo inferido: ${d.style.name}
- Confianza del análisis: ${d.style.confidence}%
- Rasgos visuales: ${d.style.tags.join(', ') || 'interfaz contemporánea'}
- Componentes observados: ${result.components.map((item) => `${item.name} (${item.count})`).join(', ')}

TOKENS VISUALES DE REFERENCIA
- Fondo: ${t.color.background}
- Superficie: ${t.color.surface}
- Primario: ${t.color.primary}
- Acento: ${t.color.accent}
- Texto: ${t.color.text}
- Texto secundario: ${t.color.muted}
- Bordes: ${t.color.border}
- Fuente de cuerpo: ${t.typography.body}
- Fuente de títulos: ${t.typography.heading}
- Tamaño base: ${t.typography.baseSize}
- Radio dominante: ${t.shape.radius}
- Sombra dominante: ${t.shape.shadow}
- Escala de espacio: ${t.spacing.join(' / ')}
- Motion: ${t.motion.transition}
- Breakpoints observados: ${d.breakpoints.slice(0, 10).map((item) => item.value).join(' · ') || 'usar breakpoints modernos estándar'}

DIRECCIÓN DE DISEÑO
1. Reinterpretar el estilo, no clonar la página.
2. Construir una jerarquía clara con navegación, hero o cabecera, contenido modular, tarjetas y llamadas a la acción solo cuando sean necesarias.
3. Usar profundidad, radios, bordes, gradientes y animaciones con la misma intensidad general detectada.
4. Mantener contraste legible y foco visible.
5. Diseñar mobile first para 360 px, tablet y escritorio grande.
6. Respetar prefers-reduced-motion.
7. Evitar apariencia de plantilla genérica, exceso de glassmorphism, iconos incoherentes y textos de relleno.
8. No incluir puntuaciones internas, etiquetas de “premium”, “recomendado” o autovaloraciones visibles.

REQUISITOS TÉCNICOS
- HTML semántico.
- CSS organizado mediante variables y componentes.
- JavaScript mínimo y progresivo.
- Sin dependencias salvo que aporten valor claro.
- Accesibilidad WCAG 2.2 AA como objetivo.
- Estados completos: hover, focus, active, disabled, loading, vacío y error.
- Verificar teclado, contraste, formularios y responsive.

ENTREGA
1. Árbol de archivos.
2. Código completo y funcional.
3. Design tokens documentados.
4. Explicación breve de las decisiones visuales.
5. Lista de pruebas realizadas.
`;
}

function styleGuideHTML(result) {
  const t = result.design.tokens;
  const colors = Object.entries(t.color);
  const safe = Object.fromEntries(colors.map(([key, value]) => [key, safeCSSValue(value, key === 'background' ? '#fff' : '#111')]));
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Style guide · ${htmlEscape(result.metadata.title || result.page.host)}</title>
<style>
:root{--bg:${safe.background};--surface:${safe.surface};--primary:${safe.primary};--accent:${safe.accent};--text:${safe.text};--muted:${safe.muted};--border:${safe.border};--radius:${safeCSSValue(t.shape.radius,'10px')};--shadow:${safeCSSValue(t.shape.shadow,'0 12px 34px rgba(0,0,0,.15)')};--body:${safeCSSValue(t.typography.body,'system-ui,sans-serif')};--heading:${safeCSSValue(t.typography.heading,'var(--body)')}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 var(--body)}main{width:min(1080px,calc(100% - 32px));margin:auto;padding:56px 0}h1,h2,h3{font-family:var(--heading);line-height:1.1}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.swatch,.card{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);box-shadow:var(--shadow);overflow:hidden}.swatch i{display:block;height:110px}.swatch div,.card{padding:16px}.button{display:inline-flex;border:0;border-radius:var(--radius);background:var(--primary);color:var(--bg);padding:12px 16px;font:inherit;font-weight:800}.button.secondary{background:transparent;color:var(--text);border:1px solid var(--border)}code{font-family:ui-monospace,monospace}.stack>*+*{margin-top:16px}
</style></head><body><main class="stack"><header><p class="muted">SCRAPER 404 DEFINITIVE · STYLE GUIDE INFERIDA</p><h1>${htmlEscape(result.design.style.name)}</h1><p class="muted">Fuente analizada: ${htmlEscape(result.page.url)} · Confianza ${result.design.style.confidence}%</p></header><section><h2>Paleta</h2><div class="grid">${colors.map(([name, value]) => `<article class="swatch"><i style="background:${htmlEscape(safe[name])}"></i><div><strong>${htmlEscape(name)}</strong><br><code>${htmlEscape(value)}</code></div></article>`).join('')}</div></section><section><h2>Tipografía</h2><article class="card"><h1>Título principal</h1><h2>Encabezado secundario</h2><p>Texto de cuerpo para comprobar ritmo, contraste y legibilidad. La guía es una interpretación automática y requiere revisión humana.</p><p class="muted">Texto secundario y metadatos.</p></article></section><section><h2>Componentes base</h2><article class="card"><h3>Tarjeta de ejemplo</h3><p>Superficie, borde, radio y sombra dominantes.</p><p><button class="button">Acción principal</button> <button class="button secondary">Secundaria</button></p></article></section></main></body></html>`;
}

function reportHTML(result) {
  const issueRows = result.issues.slice(0, 100).map((issue) => `<tr><td>${htmlEscape(issue.severity)}</td><td>${htmlEscape(issue.category)}</td><td><strong>${htmlEscape(issue.title)}</strong><br>${htmlEscape(issue.detail)}</td><td>${htmlEscape(issue.fix)}</td></tr>`).join('');
  const technologies = result.technologies.map((tech) => `<li><strong>${htmlEscape(tech.name)}</strong> — ${htmlEscape(tech.category)}</li>`).join('');
  const colors = result.design.colors.slice(0, 18).map((color) => `<div class="swatch"><i style="background:${htmlEscape(safeCSSValue(color.value, '#777'))}"></i><code>${htmlEscape(color.value)}</code><small>${color.count} usos</small></div>`).join('');
  const scores = Object.entries(result.scores).map(([name, score]) => `<div class="score"><span>${htmlEscape(name)}</span><strong>${score}</strong></div>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe Scraper 404 · ${htmlEscape(result.metadata.title || result.page.host)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#0b0d12;color:#ecebe7;font:15px/1.55 system-ui,sans-serif}main{width:min(1160px,calc(100% - 32px));margin:auto;padding:48px 0 80px}h1,h2{line-height:1.1}a{color:#e2b45f}.muted{color:#929bad}.scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.score,.card{border:1px solid #293043;border-radius:12px;background:#121620;padding:16px}.score span{display:block;color:#929bad;text-transform:uppercase;font-size:10px}.score strong{font:800 30px ui-monospace,monospace}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.palette{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}.swatch{border:1px solid #293043;border-radius:9px;overflow:hidden;background:#121620}.swatch i{display:block;height:70px}.swatch code,.swatch small{display:block;padding:6px 8px}.swatch small{padding-top:0;color:#929bad}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px;border-bottom:1px solid #293043;text-align:left;vertical-align:top}th{color:#929bad}code{font-family:ui-monospace,monospace;word-break:break-all}@media(max-width:760px){.grid{grid-template-columns:1fr}}
</style></head><body><main><p class="muted">SCRAPER 404 DEFINITIVE ${APP_VERSION}</p><h1>${htmlEscape(result.metadata.title || result.page.host)}</h1><p><a href="${htmlEscape(result.page.url)}">${htmlEscape(result.page.url)}</a></p><p class="muted">Generado ${htmlEscape(new Date(result.generatedAt).toLocaleString('es-ES'))}. Auditoría estática orientativa.</p><section class="scores">${scores}</section><div class="grid"><section class="card"><h2>Identidad</h2><p><strong>Descripción:</strong> ${htmlEscape(result.metadata.description || '—')}</p><p><strong>Estilo:</strong> ${htmlEscape(result.design.style.name)} (${result.design.style.confidence}%)</p><p><strong>Contenido:</strong> ${formatNumber(result.content.wordCount)} palabras, ${result.content.readingMinutes} min.</p><p><strong>Recursos:</strong> ${result.stats.assets} · Enlaces: ${result.stats.links} · Imágenes: ${result.stats.images}</p></section><section class="card"><h2>Tecnologías</h2><ul>${technologies || '<li>No identificadas</li>'}</ul></section></div><section class="card"><h2>Paleta dominante</h2><div class="palette">${colors || '<p>No extraída</p>'}</div></section><section class="card"><h2>Hallazgos priorizados (${result.issues.length})</h2><div style="overflow:auto"><table><thead><tr><th>Severidad</th><th>Área</th><th>Hallazgo</th><th>Corrección</th></tr></thead><tbody>${issueRows || '<tr><td colspan="4">Sin incidencias automáticas.</td></tr>'}</tbody></table></div></section><section class="card"><h2>Tokens</h2><pre><code>${htmlEscape(tokenCSS(result))}</code></pre></section></main></body></html>`;
}


/* ============================================================
   MÓDULOS v3.0.0 — OMNISCIENT
   ============================================================ */

function extractFeeds(doc, baseURL) {
  return $$('link[rel~="alternate" i]', doc)
    .filter((link) => /rss|atom|feed\+json|application\/json/i.test(link.getAttribute('type') || ''))
    .map((link) => ({
      title: cleanText(link.getAttribute('title') || 'Feed sin título', 200),
      type: cleanText(link.getAttribute('type') || '', 100),
      url: resolveURL(link.getAttribute('href') || '', baseURL) || ''
    }))
    .filter((feed) => feed.url)
    .slice(0, 20);
}

/* ---------- Contraste WCAG ---------- */

function contrastRatio(colorA, colorB) {
  const lumA = luminance(colorA);
  const lumB = luminance(colorB);
  if (lumA === null || lumB === null) return null;
  const [light, dark] = lumA >= lumB ? [lumA, lumB] : [lumB, lumA];
  return (light + 0.05) / (dark + 0.05);
}

function contrastVerdict(ratio) {
  if (ratio >= 7) return { level: 'AAA', status: 'pass' };
  if (ratio >= 4.5) return { level: 'AA', status: 'pass' };
  if (ratio >= 3) return { level: 'Solo texto grande (AA)', status: 'warn' };
  return { level: 'Insuficiente', status: 'fail' };
}

function resolveCSSColor(value, design) {
  const raw = String(value || '').trim();
  const match = /^var\(\s*(--[a-z0-9_-]+)\s*(?:,\s*([^)]+))?\)$/i.exec(raw);
  if (!match) return raw;
  const variable = design.variables.find((item) => item.name === match[1]);
  return (variable?.value || match[2] || '').trim();
}

function buildContrastMatrix(design) {
  const texts = design.textColors.slice(0, 6).map((item) => resolveCSSColor(item.value, design)).filter(Boolean);
  const backgrounds = design.backgroundColors.slice(0, 6).map((item) => resolveCSSColor(item.value, design)).filter(Boolean);
  if (!texts.length && design.tokens?.text) texts.push(design.tokens.text);
  if (!backgrounds.length && design.tokens?.background) backgrounds.push(design.tokens.background);
  const pairs = [];
  const seen = new Set();
  texts.forEach((text) => backgrounds.forEach((background) => {
    if (text === background) return;
    const key = `${text}|${background}`;
    if (seen.has(key)) return;
    seen.add(key);
    const ratio = contrastRatio(text, background);
    if (ratio === null) return;
    pairs.push({ text, background, ratio, ...contrastVerdict(ratio) });
  }));
  return pairs.sort((a, b) => a.ratio - b.ratio).slice(0, 30);
}

function renderContrast(result) {
  const target = $('contrast-table')?.querySelector('tbody');
  if (!target) return;
  clear(target);
  const pairs = buildContrastMatrix(result.design);
  $('contrast-count').textContent = pairs.length;
  if (!pairs.length) {
    appendEmptyTableRow(target, 4, 'No hay suficientes pares texto/fondo interpretables en el CSS accesible.');
    return;
  }
  pairs.forEach((pair) => {
    const row = document.createElement('tr');
    const sample = document.createElement('td');
    const chip = document.createElement('span');
    chip.className = 'contrast-chip';
    chip.textContent = 'Aa';
    chip.style.color = pair.text;
    chip.style.background = pair.background;
    sample.appendChild(chip);
    const colors = document.createElement('td');
    colors.textContent = `${pair.text} sobre ${pair.background}`;
    const ratio = document.createElement('td');
    ratio.textContent = `${pair.ratio.toFixed(2)}:1`;
    const verdict = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `contrast-badge contrast-badge--${pair.status}`;
    badge.textContent = pair.level;
    verdict.appendChild(badge);
    row.append(sample, colors, ratio, verdict);
    target.appendChild(row);
  });
}

/* ---------- Vista previa SERP y redes ---------- */

function renderPreviews(result) {
  const serp = $('serp-preview');
  const social = $('social-preview');
  if (!serp || !social) return;
  clear(serp); clear(social);
  const meta = result.metadata;
  let host = result.page.host || 'ejemplo.com';
  let path = '';
  try { const parsed = new URL(result.page.url); host = parsed.hostname; path = parsed.pathname !== '/' ? ` › ${parsed.pathname.split('/').filter(Boolean).join(' › ')}` : ''; } catch { /* URL local */ }

  const favicon = document.createElement('img');
  favicon.className = 'serp__favicon';
  favicon.alt = '';
  favicon.width = 18; favicon.height = 18;
  favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
  favicon.addEventListener('error', () => favicon.remove());
  const crumb = document.createElement('div');
  crumb.className = 'serp__crumb';
  const site = document.createElement('strong'); site.textContent = host;
  const route = document.createElement('span'); route.textContent = path;
  crumb.append(site, route);
  const head = document.createElement('div');
  head.className = 'serp__head';
  head.append(favicon, crumb);
  const title = document.createElement('p');
  title.className = 'serp__title';
  const rawTitle = meta.title || 'Página sin título';
  title.textContent = rawTitle.length > 60 ? `${rawTitle.slice(0, 60)}…` : rawTitle;
  const description = document.createElement('p');
  description.className = 'serp__description';
  const rawDescription = meta.description || 'Sin meta description. Google generará un fragmento automático a partir del contenido.';
  description.textContent = rawDescription.length > 158 ? `${rawDescription.slice(0, 158)}…` : rawDescription;
  serp.append(head, title, description);
  const serpNote = document.createElement('p');
  serpNote.className = 'preview-note';
  serpNote.textContent = `Título: ${(meta.title || '').length}/60 caracteres · Descripción: ${(meta.description || '').length}/158`;
  serp.appendChild(serpNote);

  const og = meta.openGraph || {};
  const tw = meta.twitter || {};
  const cardImage = og['og:image'] || tw['twitter:image'] || '';
  const cardTitle = og['og:title'] || tw['twitter:title'] || meta.title || 'Sin og:title';
  const cardDescription = og['og:description'] || tw['twitter:description'] || meta.description || '';
  const card = document.createElement('div');
  card.className = 'og-card';
  if (cardImage && /^https?:/i.test(cardImage)) {
    const image = document.createElement('img');
    image.className = 'og-card__image';
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.src = cardImage;
    image.addEventListener('error', () => image.replaceWith(buildOGPlaceholder('No se pudo cargar og:image')));
    card.appendChild(image);
  } else {
    card.appendChild(buildOGPlaceholder(cardImage ? 'og:image no es una URL absoluta' : 'Sin og:image — la tarjeta saldrá sin imagen'));
  }
  const cardBody = document.createElement('div');
  cardBody.className = 'og-card__body';
  const cardHost = document.createElement('small'); cardHost.textContent = host.toUpperCase();
  const cardHeading = document.createElement('strong'); cardHeading.textContent = cleanText(cardTitle, 90);
  const cardCopy = document.createElement('p'); cardCopy.textContent = cleanText(cardDescription, 160) || '— sin descripción social';
  cardBody.append(cardHost, cardHeading, cardCopy);
  card.appendChild(cardBody);
  social.appendChild(card);
}

function buildOGPlaceholder(text) {
  const block = document.createElement('div');
  block.className = 'og-card__placeholder';
  block.textContent = text;
  return block;
}

/* ---------- Feeds y contenido renderizado ---------- */

function renderFeeds(result) {
  const target = $('feeds-list');
  if (!target) return;
  clear(target);
  $('feeds-count').textContent = result.feeds?.length || 0;
  if (!result.feeds?.length) {
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'No se detectaron feeds RSS, Atom o JSON Feed.'; target.appendChild(p);
    return;
  }
  result.feeds.forEach((feed) => {
    const row = document.createElement('div');
    row.className = 'feed-row';
    const body = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = feed.title;
    const type = document.createElement('small'); type.textContent = feed.type || 'tipo no declarado';
    body.append(title, type);
    const link = document.createElement('a');
    link.href = feed.url; link.textContent = feed.url;
    link.target = '_blank'; link.rel = 'noopener noreferrer nofollow';
    row.append(body, link);
    target.appendChild(row);
  });
}

function renderRendered(result) {
  const card = $('rendered-card');
  if (!card) return;
  const target = $('rendered-content');
  clear(target);
  const rendered = result.rendered;
  card.hidden = !rendered;
  if (!rendered) return;
  if (!rendered.found) {
    const p = document.createElement('p'); p.className = 'empty-state';
    p.textContent = `Rescate SPA no disponible: ${rendered.error}`;
    target.appendChild(p);
    return;
  }
  const stats = document.createElement('p');
  stats.className = 'field-help';
  stats.textContent = `${formatNumber(rendered.words)} palabras renderizadas vía r.jina.ai (el HTML inicial contenía ${formatNumber(result.content.wordCount)}). El texto pasa por un servicio externo de lectura.`;
  const pre = document.createElement('pre');
  pre.className = 'rendered-excerpt';
  pre.textContent = rendered.excerpt;
  const actions = document.createElement('div');
  actions.className = 'panel-actions';
  const exportButton = document.createElement('button');
  exportButton.type = 'button'; exportButton.className = 'secondary-btn'; exportButton.textContent = 'Exportar texto renderizado';
  exportButton.addEventListener('click', () => download(`scraper404-${slugify(result.page.host)}-renderizado.md`, rendered.markdown, 'text/markdown;charset=utf-8'));
  actions.appendChild(exportButton);
  target.append(stats, pre, actions);
}

async function fetchRenderedContent(url) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  state.abortController?.signal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), Math.max(state.settings.timeout, 15000));
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'text/plain, text/markdown;q=0.9' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = (await response.text()).slice(0, 2_000_000);
    const words = (text.match(/\S+/g) || []).length;
    return { found: true, words, markdown: text, excerpt: cleanText(text.replace(/\s+/g, ' '), 2200) };
  } catch (error) {
    return { found: false, error: error.name === 'AbortError' ? 'tiempo de espera agotado' : error.message };
  } finally {
    clearTimeout(timer);
    state.abortController?.signal.removeEventListener('abort', onAbort);
  }
}


/* ---------- Vista de contenido: texto legible y descargable ---------- */

const SKIP_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'CANVAS', 'IFRAME', 'OBJECT', 'EMBED']);

function extractReadableMarkdown(doc) {
  const lines = [];
  let budget = 2_000_000;
  const push = (line) => {
    if (budget <= 0 || !line) return;
    budget -= line.length;
    if (lines[lines.length - 1] !== line) lines.push(line);
  };
  const inlineText = (node) => cleanText(node.textContent || '', 20000);
  const walk = (node) => {
    if (budget <= 0) return;
    Array.from(node.children || []).forEach((child) => {
      const tag = (child.tagName || '').toUpperCase();
      if (SKIP_CONTENT_TAGS.has(tag)) return;
      if (/^H[1-6]$/.test(tag)) { push(`${'#'.repeat(Number(tag[1]))} ${inlineText(child)}`); return; }
      if (tag === 'P' || tag === 'FIGCAPTION' || tag === 'DT' || tag === 'DD') { const text = inlineText(child); if (text) push(text); return; }
      if (tag === 'LI') { const text = inlineText(child); if (text) push(`- ${text}`); return; }
      if (tag === 'BLOCKQUOTE') { const text = inlineText(child); if (text) push(`> ${text}`); return; }
      if (tag === 'PRE') { const text = (child.textContent || '').trim().slice(0, 20000); if (text) push('```\n' + text + '\n```'); return; }
      if (tag === 'TABLE') {
        Array.from(child.querySelectorAll('tr')).slice(0, 100).forEach((tr) => {
          const cells = Array.from(tr.children).map((cell) => inlineText(cell).replace(/\|/g, '/')).filter(Boolean);
          if (cells.length) push(`| ${cells.join(' | ')} |`);
        });
        return;
      }
      if (tag === 'A' && !child.closest('p,li,h1,h2,h3,h4,h5,h6,td,th')) {
        const text = inlineText(child);
        const href = child.getAttribute('href') || '';
        if (text && href && !href.startsWith('#')) { push(`[${text}](${href})`); return; }
      }
      if (child.children.length) { walk(child); return; }
      const loose = inlineText(child);
      if (loose && loose.length > 1 && !['SPAN', 'B', 'I', 'EM', 'STRONG', 'SMALL', 'LABEL', 'BUTTON', 'TIME', 'CODE'].includes(tag)) push(loose);
    });
  };
  if (doc?.body) walk(doc.body);
  return lines.join('\n\n');
}

function contentMarkdown(result) {
  if (state.contentMarkdown?.url === result.page.url) return state.contentMarkdown.text;
  const header = `# ${result.metadata.title || result.page.host}\n\n> Fuente: ${result.page.url}\n> Extraído: ${new Date(result.generatedAt).toLocaleString('es-ES')} · Scraper 404 Omniscient v${APP_VERSION}\n> ${formatNumber(result.content.wordCount)} palabras · lectura estimada ${result.content.readingMinutes} min\n\n---\n\n`;
  const text = header + (extractReadableMarkdown(state.document) || '_No se pudo reconstruir texto legible del documento._');
  state.contentMarkdown = { url: result.page.url, text };
  return text;
}

function contentPlainText(result) {
  return contentMarkdown(result)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[->]\s+/gm, '')
    .replace(/^```$/gm, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
}

function renderContentView(result) {
  const target = $('content-body');
  if (!target) return;
  const metrics = $('content-metrics');
  clear(metrics);
  [
    [formatNumber(result.content.wordCount), 'Palabras'],
    [formatNumber(result.content.paragraphCount), 'Párrafos'],
    [`${result.content.readingMinutes} min`, 'Lectura estimada'],
    [formatBytes(result.page.htmlBytes), 'HTML original'],
    [result.rendered?.found ? formatNumber(result.rendered.words) : '—', 'Palabras renderizadas (SPA)']
  ].forEach(([value, label]) => appendMetric(metrics, value, label));
  renderContentBody(result);
}

function renderContentBody(result) {
  const target = $('content-body');
  const mode = $('content-mode').value;
  clear(target);
  const pre = document.createElement('pre');
  pre.className = 'content-viewer';
  if (mode === 'html') pre.textContent = state.html.slice(0, 400000) + (state.html.length > 400000 ? '\n\n… [vista truncada a 400 KB; la descarga incluye el HTML completo]' : '');
  else if (mode === 'markdown') pre.textContent = contentMarkdown(result);
  else pre.textContent = contentPlainText(result);
  target.appendChild(pre);
}

function exportContent(kind) {
  const result = state.result;
  if (!result) return toast('Realiza primero un análisis.');
  const slug = slugify(result.page.host || 'web');
  const date = new Date().toISOString().slice(0, 10);
  if (kind === 'txt') download(`scraper404-${slug}-${date}-contenido.txt`, contentPlainText(result), 'text/plain;charset=utf-8');
  if (kind === 'md') download(`scraper404-${slug}-${date}-contenido.md`, contentMarkdown(result), 'text/markdown;charset=utf-8');
  if (kind === 'html') download(`scraper404-${slug}-${date}-pagina.html`, state.html, 'text/html;charset=utf-8');
  if (kind === 'css') download(`scraper404-${slug}-${date}-estilos.css`, state.css || '/* Sin CSS accesible */', 'text/css;charset=utf-8');
  toast('Contenido exportado.');
}

/* ---------- Wayback Machine ---------- */

function clearStatusActions() {
  const target = $('status-actions');
  if (target) { clear(target); target.hidden = true; }
}

function offerWayback(url) {
  const target = $('status-actions');
  if (!target || !/^https?:/i.test(url)) return;
  clear(target);
  target.hidden = false;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-btn';
  button.textContent = 'Buscar copia en Wayback Machine';
  button.addEventListener('click', () => analyzeWayback(url, button));
  const note = document.createElement('small');
  note.textContent = 'Si el sitio bloquea proxies, quizá exista una copia pública en archive.org.';
  target.append(button, note);
}

async function analyzeWayback(url, button) {
  button.disabled = true;
  button.textContent = 'Consultando archive.org…';
  try {
    const availability = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (!availability.ok) throw new Error(`HTTP ${availability.status}`);
    const data = await availability.json();
    const snapshot = data?.archived_snapshots?.closest;
    if (!snapshot?.available || !snapshot?.url) throw new Error('archive.org no tiene ninguna copia de esta URL.');
    const snapshotURL = snapshot.url.replace(/^http:/i, 'https:');
    const stamp = snapshot.timestamp ? `${snapshot.timestamp.slice(0, 4)}-${snapshot.timestamp.slice(4, 6)}-${snapshot.timestamp.slice(6, 8)}` : 'fecha desconocida';
    toast(`Copia encontrada (${stamp}). Analizando el snapshot…`);
    clearStatusActions();
    $('url-input').value = snapshotURL;
    await analyzeURL();
  } catch (error) {
    toast(`Wayback: ${error.message}`);
    button.disabled = false;
    button.textContent = 'Buscar copia en Wayback Machine';
  }
}

/* ---------- Extractor Regex ---------- */

function runRegex() {
  if (!state.result) return toast('Realiza primero un análisis.');
  const pattern = $('regex-input').value;
  if (!pattern) return toast('Introduce una expresión regular.');
  const rawFlags = $('regex-flags').value.trim();
  if (/[^gimsuy]/.test(rawFlags)) return toast('Flags admitidas: g, i, m, s, u, y.');
  const flags = rawFlags.includes('g') ? rawFlags : `g${rawFlags}`;
  let regex;
  try { regex = new RegExp(pattern, flags); }
  catch (error) { return toast(`Expresión no válida: ${error.message}`); }
  const source = $('regex-target').value === 'text'
    ? (state.document?.body?.textContent || '').slice(0, 3_000_000)
    : state.html.slice(0, 3_000_000);
  const groupsMode = $('regex-output').value === 'groups';
  const results = [];
  let match;
  let guard = 0;
  while ((match = regex.exec(source)) && results.length < 2000 && guard < 200000) {
    guard += 1;
    if (match[0] === '') regex.lastIndex += 1;
    if (groupsMode && match.length > 1) results.push(match.slice(1).map((group) => group ?? '').join(' | '));
    else results.push(match[0]);
  }
  state.regexResults = results.map((value) => cleanText(value, 4000)).filter(Boolean);
  const target = $('regex-results');
  clear(target);
  if (!state.regexResults.length) {
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = 'La expresión no produjo coincidencias.'; target.appendChild(p);
  } else {
    state.regexResults.slice(0, 300).forEach((value, index) => {
      const row = document.createElement('div'); row.className = 'selector-result'; row.textContent = `${index + 1}. ${value}`; target.appendChild(row);
    });
    if (state.regexResults.length > 300) {
      const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = `Vista limitada a 300 de ${state.regexResults.length}. La exportación incluye todas.`; target.appendChild(p);
    }
  }
  $('btn-copy-regex').disabled = !state.regexResults.length;
  $('btn-export-regex').disabled = !state.regexResults.length;
  toast(`${state.regexResults.length} coincidencias.`);
}

/* ---------- ZIP nativo (método STORE, sin dependencias) ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = typeof file.content === 'string' ? encoder.encode(file.content) : new Uint8Array(file.content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    localChunks.push(new Uint8Array(local.buffer), nameBytes, data);
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(12, dosTime, true);
    central.setUint16(14, dosDate, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    centralChunks.push(new Uint8Array(central.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  });
  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...localChunks, ...centralChunks, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function exportDossierZip(result) {
  const slug = slugify(result.page.host || result.metadata.title || 'web');
  const date = new Date().toISOString().slice(0, 10);
  const base = `scraper404-${slug}-${date}`;
  const files = [
    { name: 'informe.html', content: reportHTML(result) },
    { name: 'expediente-completo.json', content: JSON.stringify(result, null, 2) },
    { name: 'design/design-tokens.json', content: JSON.stringify({ source: result.page.url, generatedAt: result.generatedAt, style: result.design.style, tokens: result.design.tokens }, null, 2) },
    { name: 'design/tokens.css', content: tokenCSS(result) },
    { name: 'design/starter.css', content: starterCSS(result) },
    { name: 'design/design-system.md', content: designSystemMarkdown(result) },
    { name: 'design/style-guide.html', content: styleGuideHTML(result) },
    { name: 'design/prompt-recreacion.md', content: recreationPrompt(result) },
    { name: 'auditoria/issues.csv', content: toCSV(result.issues, [['Severidad','severity'],['Área','category'],['Hallazgo','title'],['Detalle','detail'],['Corrección','fix']]) },
    { name: 'contenido/contenido.md', content: contentMarkdown(result) },
    { name: 'contenido/contenido.txt', content: contentPlainText(result) },
    { name: 'snapshot/pagina.html', content: state.html || '<!-- HTML no disponible -->' },
    { name: 'snapshot/estilos-combinados.css', content: state.css || '/* CSS no disponible */' },
    { name: 'LEEME.txt', content: `Expediente Scraper 404 Omniscient v${APP_VERSION}\nURL: ${result.page.url}\nGenerado: ${result.generatedAt}\nPuntuación global: ${result.scores.overall}/100\n\nContenido:\n- informe.html: auditoría visual autocontenida\n- expediente-completo.json: todos los datos\n- design/: tokens, CSS, documentación y prompt de recreación\n- tablas/: cada tabla HTML extraída, en CSV\n- auditoria/issues.csv: backlog priorizado\n- snapshot/: HTML y CSS analizados tal y como se descargaron\n\nUso responsable: el snapshot es material de auditoría, no para republicar contenido ajeno.` }
  ];
  /* v3.2.0: cada tabla extraída va al ZIP como CSV independiente. */
  (result.tables || []).forEach((table) => {
    if (!table.rows.length) return;
    const slug = (table.caption || `tabla-${table.index}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || `tabla-${table.index}`;
    files.push({ name: `tablas/${String(table.index).padStart(2, '0')}-${slug}.csv`, content: '\ufeff' + tableToCSV(table) });
  });
  if (result.rendered?.found) files.push({ name: 'snapshot/contenido-renderizado.md', content: result.rendered.markdown });
  downloadBlob(`${base}-expediente.zip`, buildZip(files));
}

function exportPalettePNG(result) {
  const colors = result.design.colors.slice(0, 12).map((item) => item.value).filter((value) => parseColorToRGB(value));
  if (!colors.length) return toast('No hay colores interpretables para generar la paleta.');
  try {
    const swatch = 180;
    const columns = Math.min(colors.length, 4);
    const rows = Math.ceil(colors.length / columns);
    const canvas = document.createElement('canvas');
    canvas.width = columns * swatch;
    canvas.height = rows * (swatch + 44);
    const context = canvas.getContext('2d');
    context.fillStyle = '#0b0e15';
    context.fillRect(0, 0, canvas.width, canvas.height);
    colors.forEach((color, index) => {
      const x = (index % columns) * swatch;
      const y = Math.floor(index / columns) * (swatch + 44);
      context.fillStyle = color;
      context.fillRect(x, y, swatch, swatch);
      context.fillStyle = '#f4f1e9';
      context.font = '600 15px ui-monospace, monospace';
      context.fillText(color.slice(0, 22), x + 10, y + swatch + 27);
    });
    canvas.toBlob((blob) => {
      if (!blob) return toast('El navegador no pudo generar el PNG.');
      downloadBlob(`scraper404-${slugify(result.page.host)}-paleta.png`, blob);
      toast('Paleta PNG generada.');
    }, 'image/png');
  } catch (error) {
    toast(`No se pudo generar la paleta: ${error.message}`);
  }
}

/* ---------- Análisis por lote ---------- */

function parseBatchInput() {
  const seen = new Set();
  const urls = [];
  $('batch-input').value.split(/[\s,]+/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    try {
      const url = normalizeURL(line);
      const host = new URL(url).hostname;
      if (!host.includes('.') && host !== 'localhost') return;
      if (!seen.has(url)) { seen.add(url); urls.push(url); }
    } catch { /* línea no válida, se ignora */ }
  });
  return urls.slice(0, 12);
}

async function analyzeBatch() {
  if (state.batchRunning) return;
  const urls = parseBatchInput();
  if (!urls.length) return toast('Introduce al menos una URL válida (una por línea, máximo 12).');
  state.batchRunning = true;
  state.batchRows = [];
  state.abortController = new AbortController();
  setBusy(true);
  renderBatchRows();
  $('batch-results').hidden = false;
  try {
    let done = 0;
    await mapWithConcurrency(urls, 2, async (url) => {
      if (state.abortController?.signal.aborted) throw new DOMException('Análisis cancelado', 'AbortError');
      setStatus('Análisis por lote', `${done}/${urls.length} páginas · procesando ${url}`, Math.round((done / urls.length) * 90) + 4);
      let row;
      try {
        const response = await fetchResource(url, state.settings.maxHtml, `lote ${done + 1}/${urls.length}`, Math.round((done / urls.length) * 90));
        if (!looksLikeHTML(response.text, response.contentType)) throw new Error('La respuesta no es HTML');
        const analysis = analyzeDocument({
          html: response.text,
          baseURL: url,
          source: { type: 'batch', label: url, proxy: response.proxy },
          htmlBytes: response.bytes
        }, false);
        row = {
          url,
          title: analysis.metadata.title || analysis.page.host,
          overall: analysis.scores.overall,
          seo: analysis.scores.seo,
          accessibility: analysis.scores.accessibility,
          performance: analysis.scores.performance,
          security: analysis.scores.security,
          issues: analysis.issues.length,
          bytes: response.bytes,
          proxy: response.proxy,
          error: ''
        };
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        row = { url, title: '—', overall: null, seo: null, accessibility: null, performance: null, security: null, issues: null, bytes: 0, proxy: '', error: error.message };
      }
      done += 1;
      state.batchRows.push(row);
      renderBatchRows();
      return row;
    });
    if (state.abortController?.signal.aborted) throw new DOMException('Análisis cancelado', 'AbortError');
    finishStatus('Lote completado', `${state.batchRows.filter((row) => !row.error).length}/${urls.length} páginas analizadas. Solo HTML inicial y estilos inline: para el expediente completo de una página, usa el modo URL.`);
  } catch (error) {
    handleAnalysisError(error);
  } finally {
    state.batchRunning = false;
    state.abortController = null;
    setBusy(false);
  }
}

function renderBatchRows() {
  const tbody = $('batch-table')?.querySelector('tbody');
  if (!tbody) return;
  clear(tbody);
  if (!state.batchRows.length) {
    appendEmptyTableRow(tbody, 8, 'Los resultados del lote aparecerán aquí.');
  }
  [...state.batchRows].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1)).forEach((row) => {
    const tr = document.createElement('tr');
    appendLinkCell(tr, row.url);
    const titleCell = document.createElement('td');
    titleCell.textContent = row.error ? `⚠ ${row.error}` : cleanText(row.title, 90);
    const cells = [row.overall, row.seo, row.accessibility, row.performance, row.security].map((value) => {
      const td = document.createElement('td');
      td.textContent = value === null ? '—' : value;
      return td;
    });
    const issuesCell = document.createElement('td');
    issuesCell.textContent = row.issues === null ? '—' : row.issues;
    const actionCell = document.createElement('td');
    const open = document.createElement('button');
    open.type = 'button'; open.className = 'text-btn'; open.textContent = 'Expediente';
    open.addEventListener('click', () => { setMode('url'); $('url-input').value = row.url; analyzeURL(); });
    actionCell.appendChild(open);
    tr.append(titleCell, ...cells, issuesCell, actionCell);
    tbody.appendChild(tr);
  });
  $('btn-batch-csv').disabled = !state.batchRows.length;
}

function exportBatchCSV() {
  if (!state.batchRows.length) return;
  download(`scraper404-lote-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(state.batchRows, [
    ['URL','url'],['Título','title'],['Global','overall'],['SEO','seo'],['Accesibilidad','accessibility'],['Rendimiento','performance'],['Seguridad','security'],['Hallazgos','issues'],['Bytes HTML','bytes'],['Vía','proxy'],['Error','error']
  ]), 'text/csv;charset=utf-8');
  toast('CSV del lote generado.');
}

function fillBatchFromSitemap() {
  const entries = state.result?.page?.siteFiles?.sitemap?.entries;
  if (!entries?.length) return toast('Analiza primero una URL con sitemap detectado.');
  $('batch-input').value = entries.slice(0, 12).join('\n');
  toast(`${Math.min(entries.length, 12)} URL cargadas desde el sitemap de ${state.result.page.host}.`);
}

/* ---------- Comparador A/B ---------- */

const BASELINE_KEY = 'scraper404_definitive_baseline';

function baselineSnapshot(result) {
  return {
    url: result.page.url,
    title: result.metadata.title || result.page.host,
    date: result.generatedAt,
    scores: { ...result.scores },
    style: result.design.style.name,
    technologies: result.technologies.map((tech) => tech.name),
    stats: {
      issues: result.issues.length,
      links: result.stats.links,
      images: result.stats.images,
      cssVariables: result.stats.cssVariables,
      htmlBytes: result.page.htmlBytes,
      cssBytes: result.page.cssBytes
    },
    tokens: {
      background: result.design.tokens?.background || '',
      primary: result.design.tokens?.primary || '',
      fontBody: result.design.tokens?.fontBody || result.design.fonts[0]?.value || ''
    }
  };
}

function loadBaseline() {
  try { return JSON.parse(localStorage.getItem(BASELINE_KEY) || 'null'); }
  catch { return null; }
}

function setBaselineFromResult() {
  if (!state.result) return toast('Realiza primero un análisis.');
  state.baseline = baselineSnapshot(state.result);
  try { localStorage.setItem(BASELINE_KEY, JSON.stringify(state.baseline)); } catch { /* almacenamiento no disponible */ }
  renderCompare();
  toast(`"${state.baseline.title}" fijada como base A. Analiza otra página y abre la pestaña Comparar.`);
}

function renderCompare() {
  const target = $('compare-body');
  if (!target) return;
  clear(target);
  const baseline = state.baseline;
  const current = state.result ? baselineSnapshot(state.result) : null;
  if (!baseline) {
    const p = document.createElement('p'); p.className = 'empty-state';
    p.textContent = 'Fija una página como base A con el botón «Fijar como base A» del expediente y después analiza la página B.';
    target.appendChild(p);
    return;
  }
  const intro = document.createElement('p');
  intro.className = 'field-help';
  intro.textContent = current && current.url !== baseline.url
    ? `A: ${baseline.title} · B: ${current.title}`
    : `Base A fijada: ${baseline.title} (${baseline.url}). Analiza otra página para completar la comparación.`;
  target.appendChild(intro);
  if (!current || current.url === baseline.url) return;

  const table = document.createElement('table');
  table.className = 'data-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Métrica', 'A (base)', 'B (actual)', 'Δ'].forEach((label) => { const th = document.createElement('th'); th.textContent = label; headRow.appendChild(th); });
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  const metricRows = [
    ['Puntuación global', baseline.scores.overall, current.scores.overall],
    ['SEO', baseline.scores.seo, current.scores.seo],
    ['Accesibilidad', baseline.scores.accessibility, current.scores.accessibility],
    ['Rendimiento', baseline.scores.performance, current.scores.performance],
    ['Seguridad', baseline.scores.security, current.scores.security],
    ['Hallazgos', baseline.stats.issues, current.stats.issues, true],
    ['Peso HTML (KB)', Math.round(baseline.stats.htmlBytes / 1024), Math.round(current.stats.htmlBytes / 1024), true],
    ['Peso CSS (KB)', Math.round(baseline.stats.cssBytes / 1024), Math.round(current.stats.cssBytes / 1024), true],
    ['Variables CSS', baseline.stats.cssVariables, current.stats.cssVariables],
    ['Enlaces', baseline.stats.links, current.stats.links],
    ['Imágenes', baseline.stats.images, current.stats.images]
  ];
  metricRows.forEach(([label, a, b, lowerIsBetter]) => {
    const tr = document.createElement('tr');
    const delta = (b ?? 0) - (a ?? 0);
    const cells = [label, a, b].map((value) => { const td = document.createElement('td'); td.textContent = String(value ?? '—'); return td; });
    const deltaCell = document.createElement('td');
    const good = lowerIsBetter ? delta < 0 : delta > 0;
    deltaCell.textContent = delta === 0 ? '=' : `${delta > 0 ? '+' : ''}${delta}`;
    deltaCell.className = delta === 0 ? '' : good ? 'delta-good' : 'delta-bad';
    tr.append(...cells, deltaCell);
    tbody.appendChild(tr);
  });
  table.append(thead, tbody);
  target.appendChild(table);

  const extras = document.createElement('dl');
  extras.className = 'detail-list';
  const onlyA = baseline.technologies.filter((tech) => !current.technologies.includes(tech));
  const onlyB = current.technologies.filter((tech) => !baseline.technologies.includes(tech));
  [['Estilo A', baseline.style], ['Estilo B', current.style],
   ['Tecnologías solo en A', onlyA.join(', ') || '—'], ['Tecnologías solo en B', onlyB.join(', ') || '—'],
   ['Color primario A / B', `${baseline.tokens.primary || '—'} / ${current.tokens.primary || '—'}`],
   ['Tipografía A / B', `${baseline.tokens.fontBody || '—'} / ${current.tokens.fontBody || '—'}`]
  ].forEach(([label, value]) => {
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    extras.append(dt, dd);
  });
  target.appendChild(extras);
}

function exportArtifact(kind) {
  const result = state.result;
  if (!result) return toast('Realiza primero un análisis.');
  const slug = slugify(result.page.host || result.metadata.title || 'web');
  const date = new Date().toISOString().slice(0, 10);
  const base = `scraper404-${slug}-${date}`;
  switch (kind) {
    case 'report-html': download(`${base}-informe.html`, reportHTML(result), 'text/html;charset=utf-8'); break;
    case 'full-json': download(`${base}-completo.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8'); break;
    case 'tokens-json': download(`${base}-design-tokens.json`, JSON.stringify({ source: result.page.url, generatedAt: result.generatedAt, style: result.design.style, tokens: result.design.tokens, inventory: { colors: result.design.colors, fonts: result.design.fonts, radii: result.design.radii, shadows: result.design.shadows, spacing: result.design.spacing, breakpoints: result.design.breakpoints } }, null, 2), 'application/json;charset=utf-8'); break;
    case 'tokens-css': download(`${base}-tokens.css`, tokenCSS(result), 'text/css;charset=utf-8'); break;
    case 'design-md': download(`${base}-design-system.md`, designSystemMarkdown(result), 'text/markdown;charset=utf-8'); break;
    case 'style-guide': download(`${base}-style-guide.html`, styleGuideHTML(result), 'text/html;charset=utf-8'); break;
    case 'recreate-prompt': download(`${base}-prompt-recreacion.md`, recreationPrompt(result), 'text/markdown;charset=utf-8'); break;
    case 'starter-css': download(`${base}-starter.css`, starterCSS(result), 'text/css;charset=utf-8'); break;
    case 'issues-csv': download(`${base}-issues.csv`, toCSV(result.issues, [['Severidad','severity'],['Área','category'],['Hallazgo','title'],['Detalle','detail'],['Corrección','fix']]), 'text/csv;charset=utf-8'); break;
    case 'dossier-zip': exportDossierZip(result); break;
    case 'palette-png': exportPalettePNG(result); return;
    default: toast('Formato de exportación no reconocido.'); return;
  }
  toast('Exportación generada.');
}

function exportCSV(kind) {
  const result = state.result;
  if (!result) return;
  const slug = slugify(result.page.host || 'web');
  if (kind === 'assets') download(`${slug}-recursos.csv`, toCSV(result.assets, [['Tipo','type'],['URL','url'],['Atributos','attrs'],['Origen','origin']]), 'text/csv;charset=utf-8');
  if (kind === 'links') download(`${slug}-enlaces.csv`, toCSV(result.links, [['Texto','text'],['URL','url'],['Tipo','type'],['Rel','rel'],['Target','target']]), 'text/csv;charset=utf-8');
  if (kind === 'images') download(`${slug}-imagenes.csv`, toCSV(result.images, [['URL','url'],['Alt', (row) => row.alt === null ? '[atributo ausente]' : row.alt],['Loading','loading'],['Width','width'],['Height','height'],['Srcset', (row) => row.sources.join(' | ')]]), 'text/csv;charset=utf-8');
  toast('CSV generado de forma segura para Excel.');
}

function runSelector() {
  if (!state.document || !state.result) return toast('Realiza primero un análisis.');
  const selector = $('selector-input').value.trim();
  if (!selector) return toast('Introduce un selector CSS.');
  let nodes;
  try { nodes = Array.from(state.document.querySelectorAll(selector)); }
  catch (error) { return toast(`Selector no válido: ${error.message}`); }
  const output = $('selector-output').value;
  state.selectorResults = nodes.slice(0, 2000).map((node, index) => {
    if (output === 'html') return node.outerHTML.slice(0, 10000);
    if (output === 'href') return resolveURL(node.getAttribute?.('href') || '', state.result.page.url) || '';
    if (output === 'src') return resolveURL(node.getAttribute?.('src') || node.getAttribute?.('data-src') || '', state.result.page.url) || '';
    if (output === 'json') {
      const attributes = {};
      Array.from(node.attributes || []).forEach((attribute) => { attributes[attribute.name] = attribute.value; });
      return JSON.stringify({ index: index + 1, tag: node.tagName?.toLowerCase(), text: cleanText(node.textContent || '', 1000), attributes }, null, 2);
    }
    return cleanText(node.textContent || '', 10000);
  }).filter((value) => value !== '');
  const target = $('selector-results'); clear(target);
  if (!state.selectorResults.length) {
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = `El selector coincide con ${nodes.length} nodos, pero no produjo valores exportables.`; target.appendChild(p);
  } else {
    state.selectorResults.slice(0, 500).forEach((value, index) => {
      const row = document.createElement('div'); row.className = 'selector-result'; row.textContent = `${index + 1}. ${value}`; target.appendChild(row);
    });
    if (state.selectorResults.length > 500) {
      const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = `Vista limitada a 500 de ${state.selectorResults.length} resultados. La exportación incluye todos.`; target.appendChild(p);
    }
  }
  $('btn-copy-selector').disabled = !state.selectorResults.length;
  $('btn-export-selector').disabled = !state.selectorResults.length;
  toast(`${state.selectorResults.length} valores extraídos de ${nodes.length} nodos.`);
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistoryEntry(result) {
  const entry = {
    url: result.page.url,
    title: result.metadata.title || result.page.host || result.source.label,
    date: result.generatedAt,
    score: result.scores.overall,
    sourceType: result.source.type,
    style: result.design.style.name
  };
  const history = [entry, ...getHistory().filter((item) => item.url !== entry.url)].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* almacenamiento no disponible */ }
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  $('history-section').hidden = !history.length;
  const target = $('history-list'); clear(target);
  history.forEach((entry) => {
    const row = document.createElement('article'); row.className = 'history-item';
    const body = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = entry.title;
    const meta = document.createElement('small'); meta.textContent = `${entry.url} · ${new Date(entry.date).toLocaleString('es-ES')} · ${entry.style || 'Estilo no guardado'}`;
    body.append(title, meta);
    const score = document.createElement('span'); score.textContent = `${entry.score}/100`;
    const button = document.createElement('button'); button.className = 'secondary-btn'; button.type = 'button'; button.textContent = 'Reanalizar';
    button.addEventListener('click', () => {
      setMode('url');
      $('url-input').value = entry.url;
      window.scrollTo({ top: $('main').offsetTop, behavior: 'smooth' });
      if (/^https?:/i.test(entry.url)) analyzeURL();
    });
    row.append(body, score, button); target.appendChild(row);
  });
}

function loadDemo() {
  setMode('paste');
  $('paste-base').value = 'https://demo.scraper404.local/';
  $('paste-html').value = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Observatorio 404 — Inteligencia web local</title><meta name="description" content="Una plataforma premium de análisis visual, contenido y arquitectura para equipos digitales exigentes."><link rel="canonical" href="https://demo.scraper404.local/"><meta property="og:title" content="Observatorio 404"><meta property="og:description" content="Analiza, comprende y documenta sistemas digitales."><script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Observatorio 404"}</script></head><body><header class="topbar"><nav aria-label="Principal"><a href="/">Observatorio</a><a href="/servicios">Servicios</a><a href="/contacto">Contacto</a></nav></header><main><section class="hero"><p class="eyebrow">INTELIGENCIA DIGITAL</p><h1>Comprende el sistema detrás de cada interfaz.</h1><p>Auditoría técnica, extracción visual y documentación reutilizable.</p><button>Iniciar análisis</button></section><section class="feature-grid"><article class="card"><h2>Diseño</h2><p>Tokens, componentes, tipografía y motion.</p></article><article class="card"><h2>Calidad</h2><p>SEO, accesibilidad, seguridad y rendimiento.</p></article><article class="card"><h2>Exportación</h2><p>Informes y bases listas para reutilizar.</p></article></section><form><label for="email">Email</label><input id="email" type="email"><button type="submit">Solicitar acceso</button></form></main><footer><a href="mailto:hola@example.com">hola@example.com</a></footer></body></html>`;
  $('paste-css').value = `:root{--bg:#090c12;--surface:#121825;--primary:#e6b75f;--accent:#69d8d0;--text:#f4f1e9;--muted:#98a2b3;--border:#293247;--radius:16px;--shadow:0 24px 70px rgba(0,0,0,.38);--space:24px}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#182032,var(--bg) 55%);color:var(--text);font:16px/1.6 system-ui,sans-serif}.topbar{padding:20px 6vw;border-bottom:1px solid var(--border);backdrop-filter:blur(18px)}nav{display:flex;gap:24px}a{color:var(--text)}main{width:min(1120px,88vw);margin:auto}.hero{padding:100px 0 70px}.hero h1{font-size:clamp(42px,7vw,88px);line-height:.98;max-width:900px}.eyebrow{font:700 12px ui-monospace,monospace;color:var(--primary);letter-spacing:.16em}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space)}.card,form{background:rgba(18,24,37,.78);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:28px}button{border:0;border-radius:12px;background:linear-gradient(135deg,var(--primary),#ffd990);padding:13px 18px;font-weight:800}form{margin:40px 0;display:grid;gap:12px;max-width:520px}input{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text)}footer{padding:40px 6vw;border-top:1px solid var(--border)}@media(max-width:720px){.feature-grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
  analyzePasted();
}

function handleLocalFiles(files) {
  state.localFiles = Array.from(files || []);
  const total = state.localFiles.reduce((sum, file) => sum + file.size, 0);
  const summary = $('file-summary');
  summary.hidden = !state.localFiles.length;
  summary.textContent = state.localFiles.length ? `${state.localFiles.length} archivos · ${formatBytes(total)} · ${state.localFiles.filter((file) => /\.html?$/i.test(file.name)).length} HTML · ${state.localFiles.filter((file) => /\.css$/i.test(file.name)).length} CSS · ${state.localFiles.filter((file) => /\.js$/i.test(file.name)).length} JS` : '';
  $('btn-analyze-local').disabled = !state.localFiles.length;
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  const pill = $('network-pill');
  pill.classList.toggle('offline', !online);
  pill.lastChild.textContent = online ? 'En línea' : 'Sin conexión';
}

function initEvents() {
  $$('.mode-switch__item').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $$('.workspace-nav__item').forEach((button) => button.addEventListener('click', () => selectView(button.dataset.view)));
  $('btn-analyze').addEventListener('click', analyzeURL);
  $('btn-analyze-paste').addEventListener('click', analyzePasted);
  $('btn-analyze-local').addEventListener('click', analyzeLocal);
  $('url-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') analyzeURL(); });
  $('btn-cancel').addEventListener('click', () => state.abortController?.abort());
  $('btn-demo').addEventListener('click', loadDemo);

  $('btn-settings').addEventListener('click', () => openSettings('local'));
  $('engine-pill').addEventListener('click', () => openSettings('local'));
  bindAppearanceControls();
  $('btn-privacy').addEventListener('click', () => $('privacy-dialog').showModal());
  $('btn-save-settings').addEventListener('click', (event) => {
    const proxyMode = $('proxy-mode').value;
    const customProxy = $('custom-proxy').value.trim();
    let checkedProxy = customProxy;
    if (proxyMode === 'custom') {
      try { checkedProxy = validateProxyTemplate(customProxy); }
      catch (error) { event.preventDefault(); toast(error.message); return; }
    }
    let endpoint;
    try { endpoint = normalizeEngineEndpoint($('engine-endpoint').value); }
    catch (error) { event.preventDefault(); toast(error.message); return; }
    state.settings = normalizeSettings({
      proxyMode,
      customProxy: checkedProxy,
      timeout: Number($('timeout-input').value),
      maxHtml: Number($('max-html-input').value),
      engineMode: $('engine-mode').value,
      engineEndpoint: endpoint,
      engineKey: $('engine-key').value.trim(),
      engineBrowser: $('engine-browser').value,
      engineWaitUntil: $('engine-wait').value,
      engineAllowPrivate: $('engine-allow-private').checked,
      engineBlockAds: $('engine-block-ads').checked
    });
    saveSettings();
    void probeLocalEngine(false);
    toast('Configuración guardada.');
  });
  $('btn-test-engine').addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      state.settings = normalizeSettings({
        ...state.settings,
        engineMode: $('engine-mode').value,
        engineEndpoint: normalizeEngineEndpoint($('engine-endpoint').value),
        engineKey: $('engine-key').value.trim(),
        engineBrowser: $('engine-browser').value,
        engineWaitUntil: $('engine-wait').value,
        engineAllowPrivate: $('engine-allow-private').checked,
        engineBlockAds: $('engine-block-ads').checked
      });
      await probeLocalEngine(true);
    } catch (error) { toast(error.message); }
  });

  $('local-files').addEventListener('change', (event) => handleLocalFiles(event.target.files));
  $('btn-pick-files').addEventListener('click', (event) => { event.stopPropagation(); $('local-files').click(); });
  const dropzone = $('dropzone');
  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); }));
  dropzone.addEventListener('drop', (event) => handleLocalFiles(event.dataTransfer.files));

  $('asset-filter').addEventListener('input', (event) => state.result && renderAssets(state.result, event.target.value));
  const rerenderLinks = () => state.result && renderLinks(state.result, $('link-filter').value, $('link-kind').value);
  $('link-filter').addEventListener('input', rerenderLinks);
  $('link-kind').addEventListener('change', rerenderLinks);
  $('image-filter').addEventListener('input', (event) => state.result && renderImages(state.result, event.target.value));

  $('btn-analyze-batch').addEventListener('click', analyzeBatch);
  $('btn-batch-sitemap').addEventListener('click', fillBatchFromSitemap);
  $('btn-batch-csv').addEventListener('click', exportBatchCSV);
  $('btn-set-baseline').addEventListener('click', setBaselineFromResult);
  $('btn-clear-baseline').addEventListener('click', () => {
    state.baseline = null;
    try { localStorage.removeItem(BASELINE_KEY); } catch { /* almacenamiento no disponible */ }
    renderCompare();
    toast('Base A eliminada.');
  });
  $('content-mode').addEventListener('change', () => state.result && renderContentBody(state.result));
  $('btn-copy-content').addEventListener('click', async () => { if (!state.result) return; await copyText($('content-mode').value === 'html' ? state.html : $('content-mode').value === 'markdown' ? contentMarkdown(state.result) : contentPlainText(state.result)); toast('Contenido copiado.'); });
  $$('[data-content-export]').forEach((button) => button.addEventListener('click', () => exportContent(button.dataset.contentExport)));
  $('btn-run-regex').addEventListener('click', runRegex);
  $('regex-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') runRegex(); });
  $('btn-copy-regex').addEventListener('click', async () => { await copyText(state.regexResults.join('\n')); toast('Coincidencias copiadas.'); });
  $('btn-export-regex').addEventListener('click', () => download('regex-scraper404.txt', state.regexResults.join('\n'), 'text/plain;charset=utf-8'));
  $('btn-run-selector').addEventListener('click', runSelector);
  $('selector-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') runSelector(); });
  $('btn-copy-selector').addEventListener('click', async () => { await copyText(state.selectorResults.join('\n')); toast('Resultados copiados.'); });
  $('btn-export-selector').addEventListener('click', () => download('selector-scraper404.txt', state.selectorResults.join('\n'), 'text/plain;charset=utf-8'));
  $('btn-copy-design').addEventListener('click', async () => { if (!state.result) return; await copyText(designSystemMarkdown(state.result)); toast('Resumen visual copiado.'); });

  $$('[data-export]').forEach((button) => button.addEventListener('click', () => exportArtifact(button.dataset.export)));
  $$('[data-csv]').forEach((button) => button.addEventListener('click', () => exportCSV(button.dataset.csv)));
  $('btn-export-report').addEventListener('click', () => exportArtifact('report-html'));
  $('btn-save-snapshot').addEventListener('click', () => exportArtifact('full-json'));
  $('btn-clear-history').addEventListener('click', () => { try { localStorage.removeItem(HISTORY_KEY); } catch { /* almacenamiento no disponible */ } renderHistory(); toast('Historial eliminado.'); });



  $('btn-refresh-engine').addEventListener('click', () => probeLocalEngine(true));
  $('btn-open-session').addEventListener('click', async () => {
    if (!state.result && !$('url-input').value.trim()) return toast('Introduce o analiza primero una URL.');
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    const url = state.result?.page?.url || normalizeURL($('url-input').value);
    const name = $('session-name').value.trim() || 'perfil-principal';
    $('session-output').textContent = 'Abriendo navegador visible…';
    try {
      const data = await engineRequest('/api/v1/session/open', {
        url,
        profileName: name,
        browser: state.settings.engineBrowser,
        allowPrivate: state.settings.engineAllowPrivate,
        timeoutMs: 60000
      }, { timeout: 90000 });
      $('session-output').textContent = `${data.message}\nPerfil: ${data.name}\nNavegador: ${data.browser}`;
    } catch (error) { $('session-output').textContent = error.message; toast(error.message); }
  });
  $('btn-close-session').addEventListener('click', async () => {
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    try {
      const data = await engineRequest('/api/v1/session/close', { name: $('session-name').value.trim() || 'perfil-principal' });
      $('session-output').textContent = data.closed ? 'Sesión cerrada y perfil guardado.' : 'No había una sesión interactiva abierta con ese nombre.';
    } catch (error) { $('session-output').textContent = error.message; }
  });
  $('btn-engine-history').addEventListener('click', async () => {
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    try {
      const data = await engineRequest('/api/v1/history?limit=30', null, { method: 'GET', timeout: 10000 });
      $('session-output').textContent = JSON.stringify(data.jobs, null, 2);
    } catch (error) { $('session-output').textContent = error.message; }
  });
  $('btn-run-ocr').addEventListener('click', async () => {
    const file = $('ocr-file').files?.[0];
    if (!file) return toast('Selecciona primero una imagen.');
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    $('ocr-output').value = 'Procesando OCR local. La primera ejecución puede descargar el idioma…';
    try {
      const imageBase64 = await readFileAsDataURL(file);
      const data = await engineRequest('/api/v1/ocr', { imageBase64, language: $('ocr-language').value }, { timeout: 600000 });
      $('ocr-output').value = `${data.text}\n\nConfianza: ${Number(data.confidence || 0).toFixed(1)} %`;
    } catch (error) { $('ocr-output').value = error.message; }
  });
  $('btn-run-ai').addEventListener('click', async () => {
    if (!state.result) return toast('Analiza primero una página.');
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    const model = $('ollama-model').value.trim();
    if (!model) return toast('Escribe el nombre de un modelo instalado en Ollama.');
    $('ai-output').value = 'Consultando el modelo local…';
    const context = contentPlainText(state.result).slice(0, 70000);
    try {
      const data = await engineRequest('/api/v1/ai/ollama', {
        model,
        prompt: `${$('ai-prompt').value.trim()}\n\nURL: ${state.result.page.url}\n\nCONTENIDO:\n${context}`,
        timeoutMs: 300000,
        temperature: 0.2
      }, { timeout: 330000 });
      $('ai-output').value = data.response;
    } catch (error) { $('ai-output').value = error.message; }
  });
  $('btn-probe-media').addEventListener('click', async () => {
    const file = $('media-file').files?.[0];
    if (!file) return toast('Selecciona primero un archivo multimedia.');
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    const form = new FormData(); form.append('file', file, file.name);
    $('media-output').textContent = 'Inspeccionando con FFprobe…';
    try {
      const data = await engineRequest('/api/v1/media/probe', form, { timeout: 180000 });
      $('media-output').textContent = JSON.stringify(data.metadata, null, 2);
    } catch (error) { $('media-output').textContent = error.message; }
  });
  $('btn-git-status').addEventListener('click', async () => {
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    try {
      const data = await engineRequest('/api/v1/git/status', { relativePath: $('git-path').value.trim() || '.' });
      $('git-output').textContent = `${data.path}\n\n${data.status || 'Repositorio limpio.'}`;
    } catch (error) { $('git-output').textContent = error.message; }
  });
  $('btn-git-init').addEventListener('click', async () => {
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    try {
      const data = await engineRequest('/api/v1/git/init', { relativePath: $('git-path').value.trim() || '.' });
      $('git-output').textContent = `${data.output}\n${data.path}`;
    } catch (error) { $('git-output').textContent = error.message; }
  });
  $('btn-run-crawl').addEventListener('click', async () => {
    if (!state.result) return toast('Analiza primero la URL inicial.');
    if (!state.engine.connected && !(await probeLocalEngine(true))) return;
    $('crawl-output').textContent = 'Rastreando páginas autorizadas del mismo origen…';
    try {
      const data = await engineRequest('/api/v1/crawl', {
        url: state.result.page.url,
        maxPages: Number($('crawl-pages').value),
        maxDepth: Number($('crawl-depth').value),
        allowPrivate: state.settings.engineAllowPrivate,
        timeoutMs: 30000,
        maxBytes: 4 * 1024 * 1024
      }, { timeout: 600000 });
      $('crawl-output').textContent = JSON.stringify(data, null, 2);
      download(`scraper404-${slugify(state.result.page.host)}-crawl.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
    } catch (error) { $('crawl-output').textContent = error.message; }
  });

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
}

function finishInit(desktopConfigured = false) {
  configureDialogs();
  initEvents();
  state.baseline = loadBaseline();
  renderCompare();
  renderHistory();
  renderEngineCapabilities();
  updateNetworkStatus();
  updateEngineStatus();
  setBusy(false);
  if (desktopConfigured || state.settings.engineKey) void probeLocalEngine(false);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker no registrado:', error));
  }
  let privacySeen = true;
  try { privacySeen = Boolean(localStorage.getItem('scraper404_privacy_seen')); } catch { privacySeen = true; }
  if (!privacySeen) {
    setTimeout(() => {
      if (typeof $('privacy-dialog').showModal === 'function') $('privacy-dialog').showModal();
      try { localStorage.setItem('scraper404_privacy_seen', '1'); } catch { /* almacenamiento no disponible */ }
    }, 550);
  }
}

function init() {
  const versionLabel = $('app-version');
  if (versionLabel) versionLabel.textContent = `v${APP_VERSION}`;
  applyAppearance();
  if (window.scraper404Desktop?.getEngineConfig) {
    void applyDesktopEngineConfig().then((configured) => finishInit(configured));
  } else finishInit(false);
}

document.addEventListener('DOMContentLoaded', init);
