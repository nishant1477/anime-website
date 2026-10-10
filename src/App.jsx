import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Bookmark, Compass, Home as HomeIcon, Search, X } from 'lucide-react';
import { parseRoute, useDocumentTitle, useHashRoute, useSaved } from './hooks.js';
import { DetailSkeleton, EmptyState, ErrorBoundary, GridSkeleton } from './components/ui.jsx';
import Home from './pages/Home.jsx';

// Everything except the home page is split out; Watch also owns the video code.
const SearchPage = lazy(() => import('./pages/Search.jsx'));
const AnimePage = lazy(() => import('./pages/Anime.jsx'));
const WatchPage = lazy(() => import('./pages/Watch.jsx'));
const SavedPage = lazy(() => import('./pages/Saved.jsx'));

const NAV = [
  { key: 'home', label: 'Home', icon: HomeIcon, href: '#/' },
  { key: 'search', label: 'Discover', icon: Compass, href: '#/search' },
  { key: 'saved', label: 'Saved', icon: Bookmark, href: '#/saved' },
];

function Brand() {
  return (
    <a className="brand" href="#/" aria-label="Animezxo home">
      <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17"><path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l11-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5Z" fill="currentColor" /></svg></span>
      <span>Animezxo</span>
    </a>
  );
}

function HeaderSearch({ value, setValue, onSubmit, inputRef }) {
  return (
    <form className="header-search" role="search" onSubmit={onSubmit}>
      <Search size={16} aria-hidden="true" />
      <input ref={inputRef} type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search anime" aria-label="Search anime" enterKeyHint="search" />
      {value
        ? <button type="button" className="icon-btn" aria-label="Clear" onClick={() => setValue('')}><X size={15} /></button>
        : <kbd aria-hidden="true">/</kbd>}
    </form>
  );
}

function PageFallback({ type }) {
  if (type === 'anime') return <DetailSkeleton />;
  return <div className="wrap page"><GridSkeleton count={8} /></div>;
}

export default function App() {
  const { route, navigate } = useHashRoute();
  const savedState = useSaved();
  const info = parseRoute(route);
  const [search, setSearch] = useState(info.type === 'search' ? info.query.q || '' : '');
  const inputRef = useRef(null);
  const progressRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Scroll to top on page change (not on query-only changes such as pagination of the same page).
  useEffect(() => { window.scrollTo({ top: 0 }); }, [info.type, info.slug, info.query.page, info.query.q]);
  useEffect(() => { setSearch(info.type === 'search' ? info.query.q || '' : ''); }, [info.type, info.query.q]);

  // Reading-progress bar + header shadow once the page has scrolled.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressRef.current?.style.setProperty('--p', p.toFixed(4));
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [route]);

  // "/" or Ctrl/⌘+K focuses search.
  useEffect(() => {
    const onKey = (event) => {
      const typing = /^(input|textarea|select)$/i.test(event.target.tagName) || event.target.isContentEditable;
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const value = search.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
    inputRef.current?.blur();
  };

  const page = (() => {
    switch (info.type) {
      case 'home': return <Home savedState={savedState} />;
      case 'search': return <SearchPage query={info.query} navigate={navigate} savedState={savedState} />;
      case 'anime': return <AnimePage slug={info.slug} savedState={savedState} />;
      case 'watch': return <WatchPage slug={info.slug} query={info.query} savedState={savedState} />;
      case 'saved': return <SavedPage savedState={savedState} />;
      default: return <NotFound />;
    }
  })();

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="scroll-progress" ref={progressRef} aria-hidden="true" />
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="wrap header-inner">
          <Brand />
          <nav className="top-nav" aria-label="Primary">
            {NAV.map(({ key, label, href }) => <a key={key} href={href} aria-current={info.type === key ? 'page' : undefined}>{label}</a>)}
          </nav>
          <HeaderSearch value={search} setValue={setSearch} onSubmit={submit} inputRef={inputRef} />
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <ErrorBoundary resetKey={route}>
          <Suspense fallback={<PageFallback type={info.type} />}>{page}</Suspense>
        </ErrorBoundary>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <div><Brand /><p>Pick a world. Press play.</p></div>
          <nav aria-label="Legal">
            <a href="https://terms.animex.de5.net">Terms of Service</a>
            <a href="https://privacy.animex.de5.net">Privacy Policy</a>
          </nav>
          <p className="fine">Catalogue data from the Animezxo API.</p>
        </div>
      </footer>

      <nav className="tab-bar" aria-label="Primary mobile">
        {NAV.map(({ key, label, icon: Icon, href }) => (
          <a key={key} href={href} aria-current={info.type === key ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{label}</span></a>
        ))}
      </nav>
    </div>
  );
}

function NotFound() {
  useDocumentTitle('Not found');
  return (
    <div className="wrap page">
      <EmptyState icon={X} title="Page not found" copy="That address doesn’t lead anywhere." action={<a className="btn btn-primary" href="#/">Back home</a>} />
    </div>
  );
}
