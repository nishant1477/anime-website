# Animezxo — Implementation Plan

## Product scope
Responsive anime catalogue and player powered by AniKotoAPI: home (featured carousel, rails, genres), search with genre/type filters and pagination, title pages with episode lists, a watch page with server selection, and a local saved list.

## Design direction
- Midnight-indigo surfaces, lavender-white text. Sunset pink→coral is the action colour; violet structures the UI, aqua marks live/saved state, amber marks scores.
- Bricolage Grotesque for display, Figtree for UI (Google Fonts, with system fallbacks).
- Manga screentone dot motif in the hero and empty states; poster-led layouts, subtle motion, reduced-motion fallbacks, skeleton loading states.
- Desktop: top navigation. Mobile: bottom tab bar.

## Architecture
- Vite + React SPA with a hash router (pathname fallback for direct links via `vercel.json` rewrites).
- `src/api.js`: fetch helpers, timeout/error normalisation, 5-minute cache for catalogue GETs. Base URL from `VITE_ANIMEX_API_URL`, default `https://ani-koto-api-rho.vercel.app/api`.
- `src/hooks.js`: router, saved list (localStorage), request hook.
- `src/components/`: shared UI (cards, rails, chips, skeletons, states), episode grid, player.
- `src/pages/`: Home, Search, Anime, Watch, Saved (all but Home are lazy-loaded; `hls.js` loads only on playback).
- `src/styles.css`: tokens and responsive styles.

## API endpoints used
`/`, `/search`, `/info`, `/episodes/:id`, `/servers`, `/stream`, `/stream/resolve`, `/top-ten`.

## Delivery
`npm run build` produces a static `dist/`.
