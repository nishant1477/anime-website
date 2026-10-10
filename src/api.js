// Base URL is configurable at build time through VITE_ANIMEX_API_URL.
export const DEFAULT_API_URL = 'https://animezxo.vercel.app/api';
const API_BASE = (import.meta.env.VITE_ANIMEX_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Small in-memory cache for read-only catalogue calls. Stream/server calls are
// never cached because their links can expire.
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

async function fetchJson(path, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      throw new ApiError(data?.message || `Request failed (${response.status})`, response.status);
    }
    return data?.results ?? data;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('The request took too long. Try again.');
    if (error instanceof ApiError) throw error;
    throw new ApiError('The AnimeX API is unavailable right now. Try again in a moment.');
  } finally {
    clearTimeout(timeout);
  }
}

function request(path, { cached = false, timeout } = {}) {
  if (!cached) return fetchJson(path, timeout);
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.promise;
  const promise = fetchJson(path, timeout);
  cache.set(path, { at: Date.now(), promise });
  // Never keep failures around.
  promise.catch(() => { if (cache.get(path)?.promise === promise) cache.delete(path); });
  return promise;
}

const query = (params) => new URLSearchParams(params).toString();

export const api = {
  base: API_BASE,
  home: () => request('/', { cached: true }),
  search: (keyword, page = 1) => request(`/search?${query({ keyword, page })}`, { cached: true }),
  info: (id) => request(`/info?${query({ id })}`, { cached: true }),
  episodes: (id) => request(`/episodes/${encodeURIComponent(id)}`, { cached: true }),
  servers: (ids) => request(`/servers?${query({ ids })}`),
  stream: (id) => request(`/stream?${query({ id })}`),
  resolve: (id, slug) => request(`/stream/resolve?${query({ id, slug })}`),
  topTen: () => request('/top-ten', { cached: true }),
};

export function decodeServerIds(value) {
  if (!value) return '';
  try {
    const decoded = window.atob(value);
    return decoded && /[:|,]/.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}

export function unwrapItems(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export function cleanSlug(value = '') {
  return String(value).replace(/\/ep-\d+$/, '').replace(/^\//, '');
}

// Readable fallback title derived from a slug while real info is loading.
export function titleFromSlug(slug = '') {
  return cleanSlug(slug).replace(/-\d+$/, '').replaceAll('-', ' ').trim();
}

export function watchHref(slug, animeId, episode) {
  const params = query({ animeId, episode: episode.id, number: episode.episode_no });
  return `/watch/${encodeURIComponent(cleanSlug(slug))}?${params}`;
}
