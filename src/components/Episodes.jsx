import React, { useMemo, useState } from 'react';
import { Play, Search } from 'lucide-react';
import { watchHref } from '../api.js';
import { Chip, ChipRow } from './ui.jsx';

const RANGE_SIZE = 100;
const pad = (n) => String(n ?? '').padStart(2, '0');

// Episode picker for the title page: optional number filter and 100-episode
// ranges so long-running series stay usable.
export function EpisodeGrid({ episodes, slug, animeId }) {
  const [range, setRange] = useState(0);
  const [filter, setFilter] = useState('');
  const ranges = Math.ceil(episodes.length / RANGE_SIZE);

  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (term) {
      return episodes.filter((ep) => String(ep.episode_no) === term || (ep.title || '').toLowerCase().includes(term));
    }
    return ranges > 1 ? episodes.slice(range * RANGE_SIZE, (range + 1) * RANGE_SIZE) : episodes;
  }, [episodes, filter, range, ranges]);

  return (
    <div>
      {(episodes.length > 24 || ranges > 1) && (
        <div className="episode-tools">
          {episodes.length > 24 && (
            <label className="mini-search">
              <Search size={16} aria-hidden="true" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Episode number or title" aria-label="Filter episodes" inputMode="search" />
            </label>
          )}
          {ranges > 1 && !filter && (
            <ChipRow label="Episode ranges">
              {Array.from({ length: ranges }, (_, i) => {
                const start = episodes[i * RANGE_SIZE]?.episode_no ?? i * RANGE_SIZE + 1;
                const end = episodes[Math.min((i + 1) * RANGE_SIZE, episodes.length) - 1]?.episode_no;
                return <Chip key={i} active={range === i} onClick={() => setRange(i)}>{start}–{end}</Chip>;
              })}
            </ChipRow>
          )}
        </div>
      )}
      {visible.length ? (
        <ol className="episode-grid">
          {visible.map((episode) => (
            <li key={episode.id}>
              <a className="episode-tile" href={`#${watchHref(slug, animeId, episode)}`}>
                <span className="ep-no">{pad(episode.episode_no)}</span>
                <span className="ep-title">{episode.title || `Episode ${episode.episode_no}`}</span>
                <Play size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted-note">No episode matches “{filter}”.</p>
      )}
    </div>
  );
}
