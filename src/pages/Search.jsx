import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Search as SearchIcon, X } from 'lucide-react';
import { api, unwrapItems } from '../api.js';
import { useDocumentTitle, useRequest } from '../hooks.js';
import { Chip, ChipRow, EmptyState, ErrorState, GridSkeleton, PageHeading, PosterGrid, toneFor } from '../components/ui.jsx';

const SUGGESTIONS = ['Naruto', 'One Piece', 'Jujutsu Kaisen', 'Frieren', 'Demon Slayer', 'Blue Lock'];

// Genre names come from the home endpoint (already cached by the API layer).
function useGenres() {
  const home = useRequest(api.home, []);
  return Array.isArray(home.data?.genres) ? home.data.genres.filter((g) => typeof g === 'string') : [];
}

export default function Search({ query, navigate, savedState }) {
  const q = query.q || '';
  const page = Math.max(1, Number(query.page || 1) || 1);
  const [value, setValue] = useState(q);
  const [type, setType] = useState('all');
  const genres = useGenres();
  useDocumentTitle(q ? `Search: ${q}` : 'Discover');

  useEffect(() => setValue(q), [q]);
  useEffect(() => setType('all'), [q, page]);

  const search = useRequest(() => (q ? api.search(q, page) : Promise.resolve({ data: [] })), [q, page]);
  const results = unwrapItems(search.data);

  const types = useMemo(() => [...new Set(results.map((item) => item.type).filter(Boolean))], [results]);
  const shown = type === 'all' ? results : results.filter((item) => item.type === type);

  const go = (nextQ, nextPage = 1) => {
    const params = new URLSearchParams();
    if (nextQ) params.set('q', nextQ);
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    navigate(qs ? `/search?${qs}` : '/search');
  };
  const submit = (event) => { event.preventDefault(); go(value.trim()); };

  const totalPages = Number(search.data?.totalPages ?? search.data?.total_pages ?? 0) || 0;
  const hasNext = totalPages ? page < totalPages : results.length > 0;

  return (
    <div className="wrap page">
      <PageHeading
        title={q ? <>Results for <em>“{q}”</em></> : 'Find something to watch'}
        copy={q ? undefined : 'Search by title, or jump in through a genre.'}
      />

      <form className="searchbar" role="search" onSubmit={submit}>
        <SearchIcon size={20} aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Try Naruto, One Piece, Frieren…"
          aria-label="Search anime"
          autoFocus={!q}
          enterKeyHint="search"
        />
        {value && <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => { setValue(''); go(''); }}><X size={18} /></button>}
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {genres.length > 0 && (
        <ChipRow label="Genres">
          {genres.slice(0, 20).map((genre) => (
            <Chip key={genre} active={genre.toLowerCase() === q.toLowerCase()} href={`#/search?q=${encodeURIComponent(genre)}`}>{genre}</Chip>
          ))}
        </ChipRow>
      )}

      {!q && (
        <section className="starter" aria-label="Suggestions">
          <h2>Popular searches</h2>
          <div className="genre-cloud">
            {SUGGESTIONS.map((name) => <a key={name} style={{ '--tone': toneFor(name) }} href={`#/search?q=${encodeURIComponent(name)}`}>{name}</a>)}
          </div>
        </section>
      )}

      {q && search.loading && <GridSkeleton />}
      {q && !search.loading && search.error && <ErrorState message={search.error} retry={search.reload} compact />}

      {q && !search.loading && !search.error && (
        results.length ? (
          <>
            <div className="results-bar">
              <p>{shown.length} {shown.length === 1 ? 'title' : 'titles'} · page {page}{totalPages ? ` of ${totalPages}` : ''}</p>
              {types.length > 1 && (
                <ChipRow label="Filter by type">
                  <Chip active={type === 'all'} onClick={() => setType('all')}>All</Chip>
                  {types.map((entry) => <Chip key={entry} active={type === entry} onClick={() => setType(entry)}>{entry}</Chip>)}
                </ChipRow>
              )}
            </div>
            <PosterGrid items={shown} savedState={savedState} />
            {(page > 1 || hasNext) && (
              <nav className="pager" aria-label="Pagination">
                <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => go(q, page - 1)}><ArrowLeft size={16} /> Previous</button>
                <span>Page {page}</span>
                <button type="button" className="btn btn-outline" disabled={!hasNext} onClick={() => go(q, page + 1)}>Next <ArrowRight size={16} /></button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            title={page > 1 ? 'No more results' : 'No titles found'}
            copy={page > 1 ? 'That was the last page for this search.' : 'Try a shorter title, a different spelling, or the original name.'}
            action={page > 1 ? <button type="button" className="btn btn-outline" onClick={() => go(q, page - 1)}>Previous page</button> : undefined}
          />
        )
      )}
    </div>
  );
}
