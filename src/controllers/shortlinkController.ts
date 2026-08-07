import { Request, Response } from "express";
import client from "..";

/**
 * Resolve a short code to the canonical content it points at.
 * Public, read-only. The frontend's /s/[code] route calls this and issues a
 * 301 redirect to the real page (so crawlers & social scrapers reach the
 * canonical URL and read its OG tags).
 *
 * GET /api/v1/s/:code
 *   → 200 { type: "review",  id, title }
 *   → 200 { type: "article", slug }
 *   → 404 { message }
 */
export const resolveShortlink = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code) return res.status(400).json({ message: "Missing code" });

    const post = await client.post.findUnique({
      where: { shortId: code },
      select: { id: true, title: true },
    });
    if (post) {
      return res.status(200).json({ type: "review", id: post.id, title: post.title });
    }

    const article = await client.article.findUnique({
      where: { shortId: code },
      select: { slug: true },
    });
    if (article) {
      return res.status(200).json({ type: "article", slug: article.slug });
    }

    return res.status(404).json({ message: "Short link not found" });
  } catch (error: any) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};
