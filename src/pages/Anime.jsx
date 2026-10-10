import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Play, Plus, Star } from 'lucide-react';
import { api, cleanSlug, unwrapItems, watchHref } from '../api.js';
import { useDocumentTitle, useRequest } from '../hooks.js';
import { DetailSkeleton, EmptyState, EpisodeSkeleton, ErrorState, Img, toneFor } from '../components/ui.jsx';
import { EpisodeGrid } from '../components/Episodes.jsx';
import { SaveBurst, useTilt } from '../components/Effects.jsx';

export default function Anime({ slug, savedState }) {
  const info = useRequest(() => api.info(slug), [slug]);
  const anime = info.data;
  useDocumentTitle(anime?.title);

  const [episodes, setEpisodes] = useState(null);
  const [episodeError, setEpisodeError] = useState('');
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const tilt = useTilt(8);
  const idForEpisodes = anime?.animeId || anime?.slug;

  useEffect(() => {
    if (!idForEpisodes) return undefined;
    let active = true;
    setEpisodes(null);
    setEpisodeError('');
    api.episodes(idForEpisodes)
      .then((data) => active && setEpisodes(data))
      .catch((error) => active && setEpisodeError(error.message));
    return () => { active = false; };
  }, [idForEpisodes]);

  useEffect(() => setOpen(false), [slug]);

  const retryEpisodes = () => {
    setEpisodeError('');
    api.episodes(idForEpisodes).then(setEpisodes).catch((e) => setEpisodeError(e.message));
  };

  if (info.loading) return <DetailSkeleton />;
  if (info.error) return <div className="wrap page"><ErrorState message={info.error} retry={info.reload} /></div>;
  if (!anime) return <div className="wrap page"><EmptyState title="Title not found" copy="This title is not in the catalogue." action={<a className="btn btn-outline" href="#/search">Back to search</a>} /></div>;

  const itemSlug = cleanSlug(anime.slug || slug);
  const saved = savedState.isSaved(itemSlug);
  const episodeItems = unwrapItems(episodes?.episodes || episodes);
  const first = episodeItems[0];
  const backdrop = anime.backgroundImage && anime.backgroundImage !== "'" ? anime.backgroundImage : anime.poster;
  const score = anime.malScore || anime.rating;
  const isLive = /airing|ongoing/i.test(anime.status || '') && !/finished|not yet/i.test(anime.status || '');
  const synopsis = anime.synopsis || '';
  const long = synopsis.length > 360;

  return (
    <div className="detail">
      <div className="detail-bg" aria-hidden="true"><Img src={backdrop} /></div>
      <div className="wrap page">
        <a className="back-link" href="#/search"><ArrowLeft size={16} aria-hidden="true" /> Catalogue</a>

        <section className="detail-top">
          <div className="detail-poster" {...tilt}><Img src={anime.poster} alt={anime.title} /></div>
          <div className="detail-info">
            {(anime.type || anime.status || anime.duration) && (
              <div className="pill-row">
                {anime.type && <span className="pill">{anime.type}</span>}
                {anime.status && <span className={`pill${isLive ? ' pill-aqua' : ''}`}>{isLive && <span className="dot" aria-hidden="true" />}{anime.status}</span>}
                {anime.duration && <span className="pill">{anime.duration}</span>}
              </div>
            )}
            <h1>{anime.title}</h1>
            {(anime.japaneseTitle || anime.altNames) && <p className="alt-title">{anime.japaneseTitle || anime.altNames}</p>}
            {score && <p className="pill pill-amber"><Star size={14} fill="currentColor" aria-hidden="true" /> {score}</p>}
            {synopsis ? (
              <div>
                <p className={`synopsis${long && !open ? ' is-clamped' : ''}`}>{synopsis}</p>
                {long && <button type="button" className="text-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? 'Show less' : 'Read more'}</button>}
              </div>
            ) : <p className="synopsis muted">No synopsis available for this title.</p>}
            {(anime.genres || []).length > 0 && (
              <ul className="tags" aria-label="Genres">
                {anime.genres.slice(0, 8).map((genre) => <li key={genre}><a style={{ '--tone': toneFor(genre) }} href={`#/search?q=${encodeURIComponent(genre)}`}>{genre}</a></li>)}
              </ul>
            )}
            <div className="hero-actions">
              {first
                ? <a className="btn btn-primary" href={`#${watchHref(anime.slug || slug, anime.animeId, first)}`}><Play size={17} fill="currentColor" aria-hidden="true" /> Watch episode {first.episode_no}</a>
                : <button type="button" className="btn btn-primary" disabled><Play size={17} fill="currentColor" aria-hidden="true" /> {episodeError ? 'No episodes' : 'Loading…'}</button>}
              <button type="button" className={`btn btn-outline${saved ? ' is-on' : ''}`} aria-pressed={saved} onClick={() => { if (!saved) setBurst((n) => n + 1); savedState.toggle({ ...anime, slug: itemSlug }); }}>
                {saved ? <Check size={16} /> : <Plus size={16} />} {saved ? 'Saved' : 'Save'}
                <SaveBurst k={burst} />
              </button>
            </div>
          </div>
        </section>

        <section className="episodes" aria-labelledby="episodes-title">
          <div className="section-head">
            <div className="section-title"><span className="section-icon tone-pink" aria-hidden="true"><Play size={19} fill="currentColor" /></span><h2 id="episodes-title">Episodes</h2></div>
            {(episodes || episodeItems.length > 0) && <span className="count">{episodes?.totalEpisodes || episodeItems.length} total</span>}
          </div>
          {episodeError && <ErrorState compact message={episodeError} retry={retryEpisodes} />}
          {!episodes && !episodeError && <EpisodeSkeleton />}
          {episodeItems.length > 0 && <EpisodeGrid key={anime.slug || slug} episodes={episodeItems} slug={anime.slug || slug} animeId={anime.animeId} />}
          {episodes && episodeItems.length === 0 && <EmptyState title="No episodes listed" copy="This title is indexed, but the API has no episode list for it yet." />}
        </section>
      </div>
    </div>
  );
}
