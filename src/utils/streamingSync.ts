/*
 * Keeps each review's "where to watch" (Post.streamingAt) current for India,
 * using TMDB (watch-provider data comes from JustWatch — attribution is shown
 * on the frontend wherever a synced value is displayed).
 *
 * Matching: a review is linked to a TMDB film once (Post.tmdbId), confirmed by
 * the review's director so same-titled films (e.g. two "Drishyam 3"s) aren't
 * confused. If no confident match exists, the review is left untouched.
 *
 * Resolution (first rule that applies wins):
 *   1. Subscription streaming in IN        → "Netflix", "Prime Video", …
 *   2. Released in IN cinemas ≤ 8 weeks ago → "In Theatres"
 *   3. IN cinema release in next 8 weeks   → "Coming Soon"
 *   4. Free / ad-supported in IN           → "YouTube", …
 *   5. Rent / buy only in IN               → "Rent · Apple TV"
 *   6. Nothing known                       → keep the existing (manual) value
 */
import client from "..";
import { deleteCache } from "../config/redis";
import logger from "../logger.js";
import { getMovie, matchTmdbFilm, normalizeManualStreaming, resolveAvailability } from "./tmdbAvailability";

type SyncResult = {
  postId: string;
  title: string;
  tmdbId: number | null;
  before: string;
  after: string;
  source: "tmdb" | "manual"; // manual = TMDB had nothing; spelling tidied only
};

/** Match (if needed) and refresh one review. `dryRun` reports without writing. */
export async function syncPostStreaming(postId: string, { dryRun = false } = {}): Promise<SyncResult | null> {
  const post = await client.post.findUnique({
    where: { id: postId },
    select: { id: true, title: true, year: true, directedBy: true, streamingAt: true, tmdbId: true },
  });
  if (!post) return null;

  const movie = post.tmdbId
    ? await getMovie(post.tmdbId)
    : await matchTmdbFilm(post.title, post.year, post.directedBy);
  const fromTmdb = movie ? resolveAvailability(movie) : null;
  const after = fromTmdb ?? normalizeManualStreaming(post.streamingAt);
  const result: SyncResult = {
    postId: post.id,
    title: post.title.trim(),
    tmdbId: movie?.id ?? null,
    before: post.streamingAt,
    after,
    source: fromTmdb ? "tmdb" : "manual",
  };
  if (dryRun) return result;

  const changed = after !== post.streamingAt;
  if (!changed && (post.tmdbId ?? null) === (movie?.id ?? null) && !fromTmdb) return result;

  await client.post.update({
    where: { id: post.id },
    data: {
      ...(movie ? { tmdbId: movie.id } : {}),
      ...(changed ? { streamingAt: after } : {}),
      // Only TMDB-sourced values carry the JustWatch credit on the site.
      ...(fromTmdb ? { streamingSyncedAt: new Date() } : {}),
    },
  });
  if (changed) await deleteCache(`post:${post.id}`);
  return result;
}

/** Refresh every review. Sequential to stay well inside TMDB's rate limits. */
export async function syncAllStreaming({ dryRun = false } = {}) {
  const posts = await client.post.findMany({ select: { id: true }, orderBy: { createdAt: "desc" } });
  const results: SyncResult[] = [];
  for (const { id } of posts) {
    try {
      const r = await syncPostStreaming(id, { dryRun });
      if (r) results.push(r);
    } catch (err: any) {
      logger.error(`[StreamingSync] ${id} failed: ${err.message}`);
    }
  }
  if (!dryRun) await Promise.all([deleteCache("all_posts"), deleteCache("latest_reviews")]);

  const updated = results.filter((r) => r.after !== r.before).length;
  const unmatched = results.filter((r) => r.tmdbId === null).length;
  logger.info(`[StreamingSync] ${results.length} reviews checked, ${updated} updated, ${unmatched} unmatched`);
  return results;
}

/** Fire-and-forget refresh after a review is created or edited. */
export function syncPostStreamingInBackground(postId: string) {
  syncPostStreaming(postId)
    .then(() => Promise.all([deleteCache("all_posts"), deleteCache("latest_reviews")]))
    .catch((err) => logger.error(`[StreamingSync] ${postId} failed: ${err.message}`));
}

/** Daily refresh, starting shortly after boot. */
export function scheduleStreamingSync() {
  const run = () => syncAllStreaming().catch((err) => logger.error(`[StreamingSync] run failed: ${err.message}`));
  setTimeout(run, 2 * 60 * 1000);
  setInterval(run, 24 * 60 * 60 * 1000);
}
