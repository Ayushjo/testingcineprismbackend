/*
 * TMDB lookups for "where to watch in India" — pure functions, no database or
 * server imports, so they can be used by the sync job and by scripts alike.
 * Rules are documented in ./streamingSync.ts.
 */
import axios from "axios";

const TMDB = "https://api.themoviedb.org/3";
const REGION = "IN";
const THEATRE_WINDOW_DAYS = 56;
const DAY_MS = 86_400_000;

type Provider = { provider_name: string; display_priority?: number };
type RegionProviders = {
  flatrate?: Provider[];
  free?: Provider[];
  ads?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
};
export type TmdbMovie = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  credits?: { crew: { job: string; name: string }[] };
  "watch/providers"?: { results: Record<string, RegionProviders> };
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { release_date: string; type: number }[] }[];
  };
};

// TMDB/JustWatch provider names → the short labels shown on the site.
const PROVIDER_LABELS: Record<string, string> = {
  "Amazon Prime Video": "Prime Video",
  "Amazon Prime Video with Ads": "Prime Video",
  "Amazon Video": "Prime Video",
  "Apple TV Store": "Apple TV",
  "Apple TV Plus": "Apple TV+",
  "Apple TV+": "Apple TV+",
  "Netflix basic with Ads": "Netflix",
  "Netflix Standard with Ads": "Netflix",
  "Google Play Movies": "Google Play",
  "YouTube Premium": "YouTube",
  "Hotstar": "JioHotstar",
  "Disney Plus Hotstar": "JioHotstar",
  "Jio Cinema": "JioHotstar",
  "JioCinema": "JioHotstar",
  "Zee5": "ZEE5",
  "Sony Liv": "SonyLIV",
};

// Add-on channels, telecom bundles and aggregator "channels" — not where a
// reader would actually go to watch, so they never become the label.
const IGNORED_PROVIDER = /channel|justwatch|^vi movies|airtel|tata play|jiotv|dish ?tv|plex|tubi/i;

const label = (name: string) => PROVIDER_LABELS[name] ?? name.replace(/\s+with Ads$/i, "");

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function tmdbGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not configured");
  const { data } = await axios.get<T>(`${TMDB}${path}`, {
    params: { api_key: key, ...params },
    timeout: 10_000,
  });
  return data;
}

export const getMovie = (id: number) =>
  tmdbGet<TmdbMovie>(`/movie/${id}`, { append_to_response: "credits,watch/providers,release_dates" });

const directorsOf = (m: TmdbMovie) =>
  (m.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => norm(c.name));

/** Find the TMDB film for a review; null unless the match is confident. */
export async function matchTmdbFilm(title: string, year: number, directedBy: string): Promise<TmdbMovie | null> {
  const queries = [...new Set([title.trim(), title.split(":")[0].trim()])].filter(Boolean);
  const ids = new Set<number>();
  for (const query of queries) {
    const paramSets: Record<string, string | number>[] = [{ query, year }, { query }];
    for (const params of paramSets) {
      const { results } = await tmdbGet<{ results: { id: number }[] }>("/search/movie", params);
      results.slice(0, 5).forEach((r) => ids.add(r.id));
    }
    if (ids.size >= 8) break;
  }

  // Review directors may be "A & B" / "A, B"; any one matching TMDB counts.
  const wantDirectors = directedBy
    .split(/,|&|\band\b/i)
    .map(norm)
    .filter(Boolean);
  const wantTitle = norm(title);

  let best: { movie: TmdbMovie; score: number } | null = null;
  for (const id of [...ids].slice(0, 8)) {
    const movie = await getMovie(id);
    const dirs = directorsOf(movie);
    const directorMatch = wantDirectors.some((w) => dirs.some((d) => d === w || d.includes(w) || w.includes(d)));
    const titleMatch = [movie.title, movie.original_title ?? ""].some((t) => norm(t) === wantTitle);
    const releaseYear = Number(movie.release_date?.slice(0, 4));
    const yearDiff = Number.isFinite(releaseYear) ? Math.abs(releaseYear - year) : 99;

    // A director match is required unless the title and year are both exact.
    if (!directorMatch && !(titleMatch && yearDiff === 0)) continue;
    const score = (directorMatch ? 4 : 0) + (titleMatch ? 2 : 0) + (yearDiff === 0 ? 2 : yearDiff === 1 ? 1 : 0);
    if (!best || score > best.score) best = { movie, score };
  }
  return best?.movie ?? (await matchByDirector(title, year, wantDirectors));
}

/** Similarity of two titles (0–1), tolerant of typos like Baramula/Baramulla. */
function titleSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = ` ${norm(s)} `;
    const out = new Map<string, number>();
    for (let i = 0; i < t.length - 1; i++) out.set(t.slice(i, i + 2), (out.get(t.slice(i, i + 2)) ?? 0) + 1);
    return out;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  let total = 0;
  ga.forEach((n, g) => (overlap += Math.min(n, gb.get(g) ?? 0)));
  ga.forEach((n) => (total += n));
  gb.forEach((n) => (total += n));
  return total ? (2 * overlap) / total : 0;
}

/**
 * Fallback when the title search finds nothing confident: look through the
 * director's own filmography for that year (±1) and accept a near-identical
 * title. Catches misspelled review titles ("Blue Ruins" → "Blue Ruin").
 */
async function matchByDirector(title: string, year: number, directors: string[]): Promise<TmdbMovie | null> {
  for (const name of directors.slice(0, 2)) {
    const { results } = await tmdbGet<{ results: { id: number; known_for_department?: string }[] }>(
      "/search/person",
      { query: name }
    );
    const people = results.filter((r) => r.known_for_department === "Directing").slice(0, 2);
    for (const person of people) {
      const { crew } = await tmdbGet<{ crew: { id: number; job: string; title: string; release_date?: string }[] }>(
        `/person/${person.id}/movie_credits`
      );
      const best = crew
        .filter((c) => c.job === "Director" && Math.abs(Number(c.release_date?.slice(0, 4)) - year) <= 1)
        .map((c) => ({ id: c.id, sim: titleSimilarity(c.title, title) }))
        .sort((a, b) => b.sim - a.sim)[0];
      if (best && best.sim >= 0.6) return getMovie(best.id);
    }
  }
  return null;
}

// Canonical spellings for hand-typed values that TMDB can't confirm.
const MANUAL_LABELS: [RegExp, string][] = [
  [/theat|cinema|hall/i, "In Theatres"],
  [/^you ?tube$/i, "YouTube"],
  [/prime ?video|amazon prime/i, "Prime Video"],
  [/^netflix$/i, "Netflix"],
  [/hotstar/i, "JioHotstar"],
  [/^apple ?tv\+?$/i, "Apple TV"],
];

/** Tidy a hand-typed "where to watch" value without changing what it claims. */
export function normalizeManualStreaming(value: string): string {
  const v = value.trim().replace(/\s+/g, " ");
  return MANUAL_LABELS.find(([re]) => re.test(v))?.[1] ?? v;
}

/** Where to watch this film in India today, or null if TMDB doesn't know. */
export function resolveAvailability(movie: TmdbMovie, now = Date.now()): string | null {
  const providers = movie["watch/providers"]?.results?.[REGION] ?? {};
  const first = (list?: Provider[]) => {
    const p = (list ?? []).find((x) => !IGNORED_PROVIDER.test(x.provider_name));
    return p ? label(p.provider_name) : null;
  };

  const subscription = first(providers.flatrate);
  if (subscription) return subscription;

  // Cinema release in India (limited or wide). If TMDB has no Indian dates at
  // all, fall back to the film's primary release date.
  const inDates = (movie.release_dates?.results ?? [])
    .filter((r) => r.iso_3166_1 === REGION)
    .flatMap((r) => r.release_dates);
  const theatrical = inDates
    .filter((d) => d.type === 2 || d.type === 3)
    .map((d) => Date.parse(d.release_date))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const cinemaDate = theatrical ?? (inDates.length === 0 && movie.release_date ? Date.parse(movie.release_date) : NaN);
  if (Number.isFinite(cinemaDate)) {
    const days = (now - cinemaDate) / DAY_MS;
    if (days >= 0 && days <= THEATRE_WINDOW_DAYS) return "In Theatres";
    if (days < 0 && days >= -THEATRE_WINDOW_DAYS) return "Coming Soon";
  }

  const free = first([...(providers.free ?? []), ...(providers.ads ?? [])]);
  if (free) return free;

  const rent = first(providers.rent) ?? first(providers.buy);
  if (rent) return `Rent · ${rent}`;

  return null;
}
