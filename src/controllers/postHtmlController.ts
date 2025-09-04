import { Request, Response } from "express";
import client from "..";

export const postHtml = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;

    // Fetch post data
    const post = await client.post.findFirst({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        content: true,
        posterImageUrl: true,
        year: true,
        directedBy: true,
        genres: true,
        createdAt: true,
      },
    });

    if (!post) {
      return res.status(404).send(`
        <html>
          <head><title>Post Not Found - CinePrism</title></head>
          <body><h1>Post not found</h1></body>
        </html>
      `);
    }

    // Sanitize data for HTML with null safety
    const sanitizedTitle = (post.title || "Untitled")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const sanitizedDescription =
      post.content && post.content.length > 160
        ? post.content
            .substring(0, 157)
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;") + "..."
        : (post.content || `A movie review of ${post.title}`)
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const frontendUrl = "https://testingcineprism.vercel.app";
    const postUrl = `${frontendUrl}/post/${post.id}`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        <!-- Basic Meta Tags -->
        <title>${sanitizedTitle} - CinePrism</title>
        <meta name="description" content="${sanitizedDescription}" />

        <!-- Open Graph / Facebook / WhatsApp -->
        <meta property="og:type" content="article" />
        <meta property="og:url" content="${postUrl}" />
        <meta property="og:title" content="${sanitizedTitle}" />
        <meta property="og:description" content="${sanitizedDescription}" />
        <meta property="og:image" content="${post.posterImageUrl || ""}" />
        <meta property="og:image:width" content="400" />
        <meta property="og:image:height" content="600" />
        <meta property="og:site_name" content="CinePrism" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${sanitizedTitle}" />
        <meta name="twitter:description" content="${sanitizedDescription}" />
        <meta name="twitter:image" content="${post.posterImageUrl || ""}" />

        <!-- Additional Meta -->
        <meta property="article:author" content="CinePrism" />
        <meta property="article:published_time" content="${
          post.createdAt || ""
        }" />
        <meta property="article:section" content="Movie Reviews" />
        <meta property="article:tag" content="${
          post.genres?.join(", ") || "Movie"
        }" />

        <!-- Redirect to React App -->
        <script>
          // Redirect users to React app while keeping meta tags for crawlers
          if (navigator.userAgent.indexOf('bot') === -1 && 
              navigator.userAgent.indexOf('crawler') === -1 && 
              navigator.userAgent.indexOf('spider') === -1) {
            window.location.href = "${postUrl}";
          }
        </script>

        <!-- Fallback content for crawlers -->
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #0f172a;
            color: white;
          }
          img { 
            max-width: 300px; 
            height: auto; 
            border-radius: 10px;
            margin: 20px 0;
          }
          h1 { color: #10b981; }
          a { color: #10b981; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>${sanitizedTitle}</h1>
        <img src="${
          post.posterImageUrl || ""
        }" alt="${sanitizedTitle} Poster" />
        <p><strong>Year:</strong> ${post.year || "N/A"}</p>
        <p><strong>Director:</strong> ${post.directedBy || "N/A"}</p>
        <p>${sanitizedDescription}</p>
        <p><a href="${postUrl}">Read full review on CinePrism</a></p>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("Error serving post HTML:", error);
    res.status(500).send(`
      <html>
        <head><title>Error - CinePrism</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>Something went wrong</h1>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
  }
};
