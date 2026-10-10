import React, { useEffect, useState } from 'react';
import { ArrowRight, Flame, Play, Radio, Sparkles, Star, Trophy } from 'lucide-react';
import { api, cleanSlug, unwrapItems } from '../api.js';
import { useDocumentTitle, useRequest } from '../hooks.js';
import { ErrorState, HeroSkeleton, Img, RailSkeleton, Rail, toneFor } from '../components/ui.jsx';
import { Petals, useReveal, useTilt } from '../components/Effects.jsx';

function Hero({ slides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const tilt = useTilt(10);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (count < 2 || paused || reduced) return undefined;
    const timer = setInterval(() => setIndex((value) => (value + 1) % count), 8000);
    return () => clearInterval(timer);
  }, [count, paused, reduced, index]);

  const hero = slides[index] || slides[0];
  if (!hero) return null;
  const slug = cleanSlug(hero.slug || hero.id || '');
  const synopsis = hero.synopsis || hero.description;
  const meta = [hero.type, hero.quality, hero.duration].filter(Boolean);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-bg" aria-hidden="true" key={`bg-${index}`}>
        <Img src={hero.poster || hero.image} />
      </div>
      <Petals />
      <div className="wrap hero-inner" key={index}>
        <div className="hero-text" aria-live={paused ? 'polite' : 'off'}>
          <span className="pill pill-pink"><Sparkles size={14} aria-hidden="true" /> Featured</span>
          <h1 className="hero-title">
            {(hero.title || hero.name || '').split(' ').map((word, i, all) => (
              <React.Fragment key={i}><span className="w" style={{ '--i': i }}>{word}</span>{i < all.length - 1 ? ' ' : ''}</React.Fragment>
            ))}
          </h1>
          <p className="hero-meta">
            {hero.rating && <span className="pill pill-amber"><Star size={13} fill="currentColor" aria-hidden="true" /> {hero.rating}</span>}
            {meta.map((entry) => <span className="pill" key={entry}>{entry}</span>)}
          </p>
          {synopsis && <p className="hero-synopsis">{synopsis}</p>}
          <div className="hero-actions">
            {slug && <a className="btn btn-primary" href={`#/anime/${encodeURIComponent(slug)}`}><Play size={17} fill="currentColor" aria-hidden="true" /> View title</a>}
            <a className="btn btn-outline" href="#/search">Browse catalogue <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
        <div className="hero-poster-wrap" {...tilt}>
          <a className="hero-poster" href={slug ? `#/anime/${encodeURIComponent(slug)}` : '#/'} tabIndex={-1} aria-hidden="true">
            <Img src={hero.poster || hero.image} />
          </a>
        </div>
      </div>
      {count > 1 && (
        <div className="wrap">
          <div className="hero-picker" role="tablist" aria-label="Choose featured title">
            {slides.map((slide, i) => (
              <button
                key={`${slide.slug || slide.id || i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show ${slide.title || slide.name || `title ${i + 1}`}`}
                className={i === index ? 'is-active' : ''}
                onClick={() => setIndex(i)}
              >
                <Img src={slide.poster || slide.image} />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Genres({ genres }) {
  const [ref, shown] = useReveal(genres.length > 0);
  if (!genres.length) return null;
  return (
    <section ref={ref} className={`genres reveal${shown ? ' is-in' : ''}`} aria-label="Browse by genre">
      <div className="section-head"><div className="section-title"><span className="section-icon tone-violet" aria-hidden="true"><Sparkles size={21} /></span><h2>Browse by genre</h2></div></div>
      <div className="genre-cloud">
        {genres.map((genre, i) => <a key={genre} style={{ '--tone': toneFor(genre), '--i': i }} href={`#/search?q=${encodeURIComponent(genre)}`}>{genre}</a>)}
      </div>
    </section>
  );
}

export default function Home({ savedState }) {
  useDocumentTitle('');
  const home = useRequest(api.home, []);
  const topTen = useRequest(api.topTen, []);

  if (home.loading) {
    return <><HeroSkeleton /><div className="wrap stack"><RailSkeleton /><RailSkeleton /></div></>;
  }
  if (home.error) return <div className="wrap page"><ErrorState message={home.error} retry={home.reload} /></div>;

  const data = home.data || {};
  const spotlights = unwrapItems(data.spotlights || data.spotlight);
  const trending = unwrapItems(data.trending);
  const airing = unwrapItems(data.topAiring || data.top_airing);
  const popular = unwrapItems(topTen.data?.today || data.popular || data.mostPopular);
  const slides = (spotlights.length ? spotlights : trending).slice(0, 6);
  const genres = Array.isArray(data.genres) ? data.genres.filter((g) => typeof g === 'string').slice(0, 24) : [];
  const nothing = !slides.length && !airing.length && !trending.length;

  return (
    <>
      {slides.length > 0 && <Hero slides={slides} />}
      <div className="wrap stack">
        {nothing && <ErrorState message="The API returned no titles for the home page." retry={home.reload} />}
        <Rail icon={Radio} tone="aqua" title="Currently airing" items={airing.length ? airing : trending} savedState={savedState} />
        {airing.length > 0 && <Rail icon={Flame} tone="coral" title="Trending" items={trending} savedState={savedState} />}
        {topTen.loading && !popular.length && <RailSkeleton />}
        <Rail icon={Trophy} tone="amber" title="Top ten today" items={popular} savedState={savedState} ranked />
        <Genres genres={genres} />
      </div>
    </>
  );
}
