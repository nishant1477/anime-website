import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Play, Plus, Search, Server } from 'lucide-react';
import { api, cleanSlug, decodeServerIds, titleFromSlug, unwrapItems, watchHref } from '../api.js';
import { useDocumentTitle, useRequest } from '../hooks.js';
import { EmptyState, ErrorState, EpisodeSkeleton } from '../components/ui.jsx';
import { PlayerMessage, StreamPlayer } from '../components/Player.jsx';

const pad = (n) => String(n ?? '').padStart(2, '0');

export default function Watch({ slug, query, savedState }) {
  const animeId = query.animeId || slug;
  const eps = useRequest(() => api.episodes(animeId), [animeId]);
  const info = useRequest(() => api.info(slug), [slug]);
  const episodes = useMemo(() => unwrapItems(eps.data?.episodes || eps.data), [eps.data]);

  const selected = useMemo(() => (
    episodes.find((e) => String(e.id) === String(query.episode))
    || episodes.find((e) => String(e.episode_no) === String(query.number))
    || episodes[0]
  ), [episodes, query.episode, query.number]);
  const index = selected ? episodes.indexOf(selected) : -1;
  const prev = index > 0 ? episodes[index - 1] : null;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null;

  const [servers, setServers] = useState([]);
  const [server, setServer] = useState(null);
  const [stream, setStream] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const token = useRef(0);

  const loadStream = async (choice, myToken) => {
    setServer(choice);
    setStream(null);
    setError('');
    setBusy(true);
    try {
      const linkId = choice.link_id || choice.id;
      const embed = await api.stream(linkId);
      let resolved = null;
      try { resolved = await api.resolve(linkId, slug); } catch { /* embed stays playable */ }
      if (token.current === myToken) setStream({ ...embed, resolved, server: choice });
    } catch (e) {
      if (token.current === myToken) setError(e.message);
    } finally {
      if (token.current === myToken) setBusy(false);
    }
  };

  // Load servers whenever the episode changes; the token drops stale responses.
  useEffect(() => {
    const myToken = ++token.current;
    setServers([]); setServer(null); setStream(null); setError('');
    if (!selected) return undefined;
    if (!selected.server_ids) { setError('This episode has no servers listed.'); return undefined; }
    setBusy(true);
    api.servers(decodeServerIds(selected.server_ids))
      .then((items) => {
        if (token.current !== myToken) return;
        const list = unwrapItems(items);
        setServers(list);
        if (list[0]) loadStream(list[0], myToken);
        else { setBusy(false); setError('No servers are available for this episode.'); }
      })
      .catch((e) => { if (token.current === myToken) { setError(e.message); setBusy(false); } });
    return () => { token.current += 1; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, attempt]);

  const title = info.data?.title || titleFromSlug(slug);
  useDocumentTitle(selected ? `${title} · Ep ${selected.episode_no}` : title);
  const saved = savedState.isSaved(slug);
  const href = (episode) => `#${watchHref(slug, animeId, episode)}`;

  if (eps.loading) {
    return (
      <div className="wrap page">
        <div className="watch-layout">
          <div className="player skeleton" role="status" aria-label="Loading player" />
          <div><EpisodeSkeleton count={8} /></div>
        </div>
      </div>
    );
  }
  if (eps.error) return <div className="wrap page"><ErrorState message={eps.error} retry={eps.reload} /></div>;
  if (!episodes.length) {
    return <div className="wrap page"><EmptyState title="No episodes to play" copy="The API has no episode list for this title." action={<a className="btn btn-outline" href={`#/anime/${encodeURIComponent(slug)}`}>Back to title</a>} /></div>;
  }

  return (
    <div className="wrap page watch">
      <a className="back-link" href={`#/anime/${encodeURIComponent(slug)}`}><ArrowLeft size={16} aria-hidden="true" /> {title}</a>
      <div className="watch-layout">
        <section className="watch-main" aria-label="Player">
          <div className="player">
            {stream ? <StreamPlayer stream={stream} /> : (
              <div className="player-state" aria-live="polite">
                {busy && !error && <><span className="spinner" aria-hidden="true" /><p>Finding a stream…</p></>}
                {error && <PlayerMessage title="Playback unavailable"><p>{error}</p><button type="button" className="btn btn-outline" onClick={() => setAttempt((n) => n + 1)}>Try again</button></PlayerMessage>}
                {!busy && !error && <PlayerMessage icon={Play} title="Pick a server to start" />}
              </div>
            )}
          </div>

          <div className="watch-head">
            <div>
              <span className="pill pill-pink">Episode {selected?.episode_no}</span>
              <h1>{title}</h1>
              {selected?.title && <p className="ep-name">{selected.title}</p>}
            </div>
            <div className="watch-actions">
              <a className={`btn btn-outline${prev ? '' : ' is-disabled'}`} href={prev ? href(prev) : undefined} aria-disabled={!prev}><ArrowLeft size={16} aria-hidden="true" /> Prev</a>
              <a className={`btn btn-primary${next ? '' : ' is-disabled'}`} href={next ? href(next) : undefined} aria-disabled={!next}>Next <ArrowRight size={16} aria-hidden="true" /></a>
              {info.data && (
                <button type="button" className={`icon-btn bordered${saved ? ' is-on' : ''}`} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save title'} onClick={() => savedState.toggle({ ...info.data, slug: cleanSlug(info.data.slug || slug) })}>
                  {saved ? <Check size={18} /> : <Plus size={18} />}
                </button>
              )}
            </div>
          </div>

          {servers.length > 0 && (
            <div className="servers" role="group" aria-label="Servers">
              <span className="servers-label"><Server size={16} aria-hidden="true" /> Server</span>
              {servers.map((item) => {
                const active = (server?.link_id || server?.id) === (item.link_id || item.id);
                return (
                  <button key={item.link_id || item.id} type="button" className={`chip${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => loadStream(item, ++token.current)}>
                    {item.name || item.cmid || 'Mirror'}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <EpisodeSidebar episodes={episodes} selected={selected} href={href} />
      </div>
    </div>
  );
}

function EpisodeSidebar({ episodes, selected, href }) {
  const [filter, setFilter] = useState('');
  const listRef = useRef(null);
  const term = filter.trim().toLowerCase();
  const visible = term ? episodes.filter((e) => String(e.episode_no) === term || (e.title || '').toLowerCase().includes(term)) : episodes;

  // Keep the current episode in view inside the list without moving the page.
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('[aria-current="true"]');
    if (list && active) list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
  }, [selected?.id]);

  return (
    <aside className="sidebar" aria-label="Episodes">
      <div className="sidebar-head">
        <h2>Episodes <span className="count">{episodes.length}</span></h2>
        {episodes.length > 12 && (
          <label className="mini-search">
            <Search size={15} aria-hidden="true" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find episode" aria-label="Find episode" inputMode="search" />
          </label>
        )}
      </div>
      <ol className="episode-list" ref={listRef}>
        {visible.map((episode) => {
          const active = selected?.id === episode.id;
          return (
            <li key={episode.id}>
              <a className={`episode-row${active ? ' is-active' : ''}`} href={href(episode)} aria-current={active ? 'true' : undefined}>
                <span className="ep-no">{pad(episode.episode_no)}</span>
                <span className="ep-title">{episode.title || `Episode ${episode.episode_no}`}</span>
                {episode.active === false ? <small>Unavailable</small> : active ? <small className="playing"><span className="eq" aria-hidden="true"><i /><i /><i /></span>Playing</small> : <Play size={13} aria-hidden="true" />}
              </a>
            </li>
          );
        })}
        {!visible.length && <li className="muted-note">No episode matches.</li>}
      </ol>
    </aside>
  );
}
