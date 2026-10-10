import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Play, Plus, Check, Search as SearchIcon } from 'lucide-react';
import { cleanSlug } from '../api.js';
import { SaveBurst, useReveal, useTilt } from './Effects.jsx';

/* ---------- images ---------- */

export function Img({ src, alt = '', className = '', ...rest }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return <div className={`img-fallback ${className}`} role={alt ? 'img' : undefined} aria-label={alt || undefined}>{(alt || '·').slice(0, 1)}</div>;
  }
  return <img src={src} alt={alt} className={className} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} {...rest} />;
}

/* ---------- colour helpers ---------- */

const TONES = ['#ff5c9d', '#8b6cff', '#38e3d2', '#ffc857', '#ff8a5c', '#6cb4ff'];
// Stable colour per label so a genre always looks the same.
export function toneFor(label = '') {
  let hash = 0;
  for (const ch of String(label)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

/* ---------- cards ---------- */

export function PosterCard({ item, savedState, rank }) {
  const slug = cleanSlug(item.slug || item.id || '');
  const title = item.title || item.name || 'Untitled';
  const saved = savedState?.isSaved(slug);
  const tilt = useTilt(9);
  const [burst, setBurst] = useState(0);
  return (
    <article className={`card${rank ? ' card-ranked' : ''}`}>
      <a className="card-link" href={slug ? `#/anime/${encodeURIComponent(slug)}` : undefined}>
        <div className="card-media" {...tilt}>
          {rank && <span className="card-rank" aria-hidden="true">{rank}</span>}
        <div className="card-art">
          <Img src={item.poster || item.image} alt={title} loading="lazy" width="300" height="450" />
          <span className="card-play" aria-hidden="true"><Play size={18} fill="currentColor" /></span>
        </div>
        </div>
        <div className="card-body">
          <h3 title={title}>{title}</h3>
          {(item.type || item.sub || item.quality) && (
            <p className="card-meta">
              {item.type && <span className="tag">{item.type}</span>}
              {item.sub ? <span className="sub">{item.sub} sub</span> : item.quality ? <span className="q">{item.quality}</span> : null}
            </p>
          )}
        </div>
      </a>
      {slug && savedState && (
        <button
          type="button"
          className={`card-save${saved ? ' is-on' : ''}`}
          aria-pressed={!!saved}
          aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
          onClick={() => { if (!saved) setBurst((n) => n + 1); savedState.toggle({ ...item, slug, title }); }}
        >
          {saved ? <Check size={15} /> : <Plus size={15} />}
          <SaveBurst k={burst} />
        </button>
      )}
    </article>
  );
}

export function PosterGrid({ items, savedState }) {
  return (
    <div className="grid">
      {items.map((item, index) => <PosterCard key={`${item.slug || item.id || item.name}-${index}`} item={item} savedState={savedState} />)}
    </div>
  );
}

/* ---------- horizontal rail ---------- */

export function Rail({ title, icon: Icon, tone = 'pink', items, savedState, ranked = false }) {
  const scroller = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, items]);
  const [revealRef, shown] = useReveal(!!items?.length);
  if (!items?.length) return null;
  const scrollBy = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };
  return (
    <section ref={revealRef} className={`rail reveal${shown ? ' is-in' : ''}`} aria-label={title}>
      <div className="section-head">
        <div className="section-title">
          {Icon && <span className={`section-icon tone-${tone}`} aria-hidden="true"><Icon size={21} /></span>}
          <h2>{title}</h2>
        </div>
        <div className="rail-buttons">
          <button type="button" className="round-btn" onClick={() => scrollBy(-1)} disabled={edge.start} aria-label={`Scroll ${title} back`}><ChevronLeft size={18} /></button>
          <button type="button" className="round-btn" onClick={() => scrollBy(1)} disabled={edge.end} aria-label={`Scroll ${title} forward`}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="rail-track" ref={scroller} onScroll={measure}>
        {items.slice(0, 12).map((item, index) => (
          <div className={`rail-item${ranked ? ' is-ranked' : ''}`} style={{ '--i': index }} key={`${item.slug || item.id || item.name}-${index}`}>
            <PosterCard item={item} savedState={savedState} rank={ranked ? index + 1 : undefined} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- chips ---------- */

export function ChipRow({ label, children }) {
  return <div className="chip-row" role="group" aria-label={label}>{children}</div>;
}

export function Chip({ active, href, onClick, children }) {
  const className = `chip${active ? ' is-active' : ''}`;
  if (href) return <a className={className} href={href} aria-current={active ? 'true' : undefined}>{children}</a>;
  return <button type="button" className={className} aria-pressed={!!active} onClick={onClick}>{children}</button>;
}

/* ---------- skeletons ---------- */

export function CardSkeleton() {
  return <div className="card skeleton-card" aria-hidden="true"><div className="card-art skeleton" /><div className="card-body"><span className="skeleton line" /><span className="skeleton line short" /></div></div>;
}

export function GridSkeleton({ count = 12 }) {
  return <div className="grid" role="status" aria-label="Loading titles">{Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}</div>;
}

export function RailSkeleton() {
  return (
    <div className="rail" role="status" aria-label="Loading">
      <div className="section-head"><div><span className="skeleton line title-sk" /></div></div>
      <div className="rail-track">{Array.from({ length: 7 }, (_, i) => <div className="rail-item" key={i}><CardSkeleton /></div>)}</div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <section className="hero hero-skeleton" role="status" aria-label="Loading featured title">
      <div className="wrap hero-inner">
        <div className="hero-text">
          <span className="skeleton line kicker-sk" />
          <span className="skeleton line hero-title-sk" />
          <span className="skeleton line" />
          <span className="skeleton line short" />
        </div>
        <div className="hero-poster skeleton" />
      </div>
    </section>
  );
}

export function DetailSkeleton() {
  return (
    <div className="wrap page" role="status" aria-label="Loading title">
      <div className="detail-top">
        <div className="detail-poster skeleton" />
        <div className="detail-info">
          <span className="skeleton line kicker-sk" />
          <span className="skeleton line hero-title-sk" />
          <span className="skeleton line" />
          <span className="skeleton line" />
          <span className="skeleton line short" />
        </div>
      </div>
    </div>
  );
}

export function EpisodeSkeleton({ count = 12 }) {
  return <div className="episode-grid" role="status" aria-label="Loading episodes">{Array.from({ length: count }, (_, i) => <span key={i} className="skeleton episode-sk" />)}</div>;
}

/* ---------- states ---------- */

export function ErrorState({ message, retry, compact = false }) {
  return (
    <div className={`state state-error${compact ? ' compact' : ''}`} role="alert">
      <Info size={22} aria-hidden="true" />
      <div>
        <h2>Couldn’t load this</h2>
        <p>{message}</p>
      </div>
      {retry && <button type="button" className="btn btn-outline" onClick={retry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, copy, action, icon: Icon = SearchIcon }) {
  return (
    <div className="state">
      <Icon size={26} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeading({ title, copy }) {
  return (
    <header className="page-heading">
      <h1>{title}</h1>
      {copy && <p className="lede">{copy}</p>}
    </header>
  );
}

export class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="wrap page">
        <ErrorState message="Something broke while drawing this page." retry={() => this.setState({ failed: false })} />
      </div>
    );
  }
}
