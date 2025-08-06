// src/api.js

/**
 * Sabitler
 */
const DEFAULT_TIMEOUT_MS = 10_000;
const JSON_ACCEPT_HEADER = 'application/json';
const DEFAULT_CACHE = 'no-store';

/**
 * Zengin tanılama için özel hata tipleri
 */
class HttpError extends Error {
  constructor(message, { status, url }) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

class ContentTypeError extends Error {
  constructor(message, { url }) {
    super(message);
    this.name = 'ContentTypeError';
    this.url = url;
  }
}

class TimeoutError extends Error {
  constructor(message, { url }) {
    super(message);
    this.name = 'TimeoutError';
    this.url = url;
  }
}

/**
 * Vite base path (import.meta.env.BASE_URL) ile statik JSON dosyaları için güvenli URL oluşturur.
 * Farklı ortamlar (localhost, önizleme, GitHub Pages) arasında tutarlı çalışır.
 */
function buildAssetUrl(pathSegment) {
  const base = import.meta?.env?.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = String(pathSegment || '').startsWith('/')
    ? String(pathSegment).slice(1)
    : String(pathSegment || '');
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Birleştirilmiş AbortSignal üretir (zincir iptal/timeout desteği için).
 * 0/1/n sinyal durumlarını verimli ele alır.
 */
function mergeAbortSignals(signals) {
  const valid = (signals || []).filter(Boolean);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];

  const controller = new AbortController();

  // Herhangi bir sinyal daha önce abort olduysa, derhal aynı sebeple abort et
  for (const s of valid) {
    if (s.aborted) {
      controller.abort(s.reason || new Error('aborted'));
      return controller.signal;
    }
  }

  const onAbort = (ev) => controller.abort(ev?.target?.reason || ev?.reason || new Error('aborted'));
  for (const s of valid) {
    s.addEventListener('abort', onAbort, { once: true });
  }

  return controller.signal;
}

/**
 * Cache parametresini güvenli normalize eder. Geçersiz değerlerde DEFAULT_CACHE'a düşer.
 */
function normalizeCache(cache) {
  const allowed = new Set([
    'default',
    'no-store',
    'reload',
    'no-cache',
    'force-cache',
    'only-if-cached',
  ]);
  return allowed.has(cache) ? cache : DEFAULT_CACHE;
}

/**
 * İçerik tipi doğrulama, timeout ve zengin hata bağlamı ile JSON fetch eder.
 * headers ve cache gibi ileri seviye seçenekleri destekler.
 */
async function fetchJson(
  url,
  { timeoutMs = DEFAULT_TIMEOUT_MS, signal, headers, cache = DEFAULT_CACHE } = {}
) {
  const timeoutController = new AbortController();
  let timeoutId = null;

  // timeoutMs = 0 => timeout yok
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => timeoutController.abort(new Error('timeout')), timeoutMs);
  }

  const composedSignal = mergeAbortSignals([timeoutController.signal, signal]);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: JSON_ACCEPT_HEADER,
        ...headers,
      },
      cache: normalizeCache(cache), // İhtiyaca göre 'force-cache' olarak değiştirilebilir
      signal: composedSignal,
    });

    if (!response.ok) {
      throw new HttpError(`HTTP ${response.status} while fetching ${url}`, {
        status: response.status,
        url,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    // charset vb. parametreleri tolere et
    if (!/\bapplication\/json\b/i.test(contentType)) {
      throw new ContentTypeError(`Unexpected content-type "${contentType}" from ${url}`, { url });
    }

    // JSON parse hatalarını anlamlı yüzeye çıkar
    try {
      return await response.json();
    } catch (parseErr) {
      parseErr.url = url;
      parseErr.name = 'JsonParseError';
      throw parseErr;
    }
  } catch (e) {
    const isAbort = e?.name === 'AbortError';
    const isTimeout = e?.message === 'timeout' || e?.name === 'TimeoutError';
    if (isAbort || isTimeout) {
      throw new TimeoutError(`Request timed out or aborted for ${url}`, { url });
    }
    e.url = e.url || url;
    throw e;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Dönüş şekillerini güvenceye alan yardımcılar.
 */
function ensureSeasonShape(data) {
  return {
    teams: Array.isArray(data?.teams) ? data.teams : [],
    fixtures: Array.isArray(data?.fixtures) ? data.fixtures : [],
    playerStats: Array.isArray(data?.playerStats) ? data.playerStats : [],
  };
}

function ensureEurocupShape(data) {
  return {
    teams: Array.isArray(data?.teams) ? data.teams : [],
    fixtures: Array.isArray(data?.fixtures) ? data.fixtures : [],
  };
}

/**
 * Ortak yükleyici: URL kur, JSON çek, şekli güvenceye al, hata durumunda güvenli boş veri dön.
 * İsteğe bağlı logger (console default) ile log yazabilir.
 */
async function loadJsonWithFallback(pathSegment, ensureShape, options = {}) {
  const {
    logger = console,
    ...fetchOptions
  } = options;

  const url = buildAssetUrl(pathSegment);

  try {
    const json = await fetchJson(url, fetchOptions);
    return ensureShape(json);
  } catch (error) {
    logger?.error?.(`[api] Yükleme hatası: "${pathSegment}"`, {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      url: error?.url,
    });
    return ensureShape({});
  }
}

/**
 * Sayısal id normalizasyonu (geçerliyse trim'lenmiş string döner, değilse null).
 */
function normalizeNumericId(value) {
  const id = String(value ?? '').trim();
  return /^\d+$/.test(id) ? id : null;
}

/**
 * Belirtilen lig sezonuna ait verileri JSON dosyasından çeker.
 * @param {string|number} seasonId - Sezon ID'si ('1', '2', '3').
 * @param {{timeoutMs?: number, signal?: AbortSignal, headers?: Record<string,string>, cache?: RequestCache, logger?: Console}} [options]
 * @returns {Promise<{teams: any[], fixtures: any[], playerStats: any[]}>}
 */
export async function getSeasonData(seasonId, options = {}) {
  const id = normalizeNumericId(seasonId);
  if (!id) {
    options?.logger?.warn?.(`[api] Geçersiz seasonId "${seasonId}", boş veri dönülüyor.`);
    return ensureSeasonShape({});
  }
  return loadJsonWithFallback(`data/season${id}.json`, ensureSeasonShape, options);
}

/**
 * Belirtilen Eurocup sezonuna ait verileri JSON dosyasından çeker.
 * @param {string|number} cupId - Kupa ID'si ('24' veya '25').
 * @param {{timeoutMs?: number, signal?: AbortSignal, headers?: Record<string,string>, cache?: RequestCache, logger?: Console}} [options]
 * @returns {Promise<{teams: any[], fixtures: any[]}>}
 */
export async function getEurocupData(cupId, options = {}) {
  const id = normalizeNumericId(cupId);
  if (!id) {
    options?.logger?.warn?.(`[api] Geçersiz cupId "${cupId}", boş veri dönülüyor.`);
    return ensureEurocupShape({});
  }
  return loadJsonWithFallback(`data/eurocup${id}.json`, ensureEurocupShape, options);
}

/**
 * Opsiyonel: Aynı statik asset'ler için küçük bir bellek içi cache.
 * Varsayılan kapalı; getCachedSeasonData/getCachedEurocupData ile etkin kullanın.
 */
const _memoryCache = new Map();
function _cacheKey(url, opts) {
  const { timeoutMs, headers, cache } = opts || {};
  return JSON.stringify({ url, timeoutMs, headers, cache });
}

async function _getCached(pathSegment, ensureShape, options = {}) {
  const url = buildAssetUrl(pathSegment);
  const key = _cacheKey(url, options);
  if (_memoryCache.has(key)) return _memoryCache.get(key);

  const p = loadJsonWithFallback(pathSegment, ensureShape, options);
  _memoryCache.set(key, p);
  try {
    const data = await p;
    return data;
  } finally {
    // İsterseniz çözümden sonra temizleyebilirsiniz; burada son değeri tutuyoruz
  }
}

export function getCachedSeasonData(seasonId, options = {}) {
  const id = normalizeNumericId(seasonId);
  if (!id) {
    options?.logger?.warn?.(`[api] Geçersiz seasonId "${seasonId}", boş veri dönülüyor.`);
    return Promise.resolve(ensureSeasonShape({}));
  }
  return _getCached(`data/season${id}.json`, ensureSeasonShape, options);
}

export function getCachedEurocupData(cupId, options = {}) {
  const id = normalizeNumericId(cupId);
  if (!id) {
    options?.logger?.warn?.(`[api] Geçersiz cupId "${cupId}", boş veri dönülüyor.`);
    return Promise.resolve(ensureEurocupShape({}));
  }
  return _getCached(`data/eurocup${id}.json`, ensureEurocupShape, options);
}