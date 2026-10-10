import { useCallback, useEffect, useState } from 'react';
import { cleanSlug } from './api.js';

export function parseRoute(route) {
  const [path, rawQuery = ''] = route.split('?');
  let parts = [];
  try {
    parts = path.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  } catch {
    return { type: '404', query: {} };
  }
  const query = Object.fromEntries(new URLSearchParams(rawQuery));
  if (!parts.length) return { type: 'home', path: '/', query };
  if (parts[0] === 'search') return { type: 'search', path: '/search', query };
  if (parts[0] === 'saved') return { type: 'saved', path: '/saved', query };
  if (parts[0] === 'anime' && parts[1]) return { type: 'anime', path, slug: parts.slice(1).join('/'), query };
  if (parts[0] === 'watch' && parts[1]) return { type: 'watch', path, slug: parts.slice(1).join('/'), query };
  return { type: '404', path, query };
}

// Hash router with a pathname fallback so direct links such as /anime/slug
// (rewritten to index.html by vercel.json) keep working.
export function useHashRoute() {
  const getRoute = () => {
    const hashRoute = window.location.hash.replace(/^#/, '');
    if (hashRoute) return hashRoute;
    const pathname = window.location.pathname || '/';
    return pathname === '/' ? '/' : `${pathname}${window.location.search}`;
  };
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const update = () => setRoute(getRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);
  return { route, navigate };
}

export function useSaved() {
  const [saved, setSaved] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('animex-saved') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const toggle = useCallback((item) => {
    setSaved((current) => {
      const slug = cleanSlug(item.slug);
      const exists = current.some((entry) => cleanSlug(entry.slug) === slug);
      const next = exists
        ? current.filter((entry) => cleanSlug(entry.slug) !== slug)
        : [{
            slug,
            title: item.title || item.name,
            poster: item.poster || item.image,
            type: item.type,
            quality: item.quality,
            sub: item.sub,
          }, ...current];
      try { localStorage.setItem('animex-saved', JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  const isSaved = useCallback((slug) => saved.some((entry) => cleanSlug(entry.slug) === cleanSlug(slug)), [saved]);
  return { saved, toggle, isSaved };
}

export function useRequest(loader, deps = []) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: '' });
    loader()
      .then((data) => active && setState({ data, loading: false, error: '' }))
      .catch((error) => active && setState({ data: null, loading: false, error: error.message || 'Something went wrong.' }));
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, reload };
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Animezxo` : 'Animezxo — Pick a world. Press play.';
  }, [title]);
}
