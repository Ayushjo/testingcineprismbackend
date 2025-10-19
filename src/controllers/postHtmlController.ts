import { Response, Request } from "express";
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
        streamingAt: true,
        genres: true,
        createdAt: true,
        reviewPosterImageUrl: true,
      },
    });

    if (!post) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Post Not Found - CinePrism</title></head>
          <body><h1>Post not found</h1></body>
        </html>
      `);
    }

    // Sanitize data for HTML with null safety
    const sanitizedTitle = (post.title || "Untitled")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const sanitizedDescription =
      post.content && post.content.length > 160
        ? post.content
            .substring(0, 157)
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;") + "..."
        : (post.content || `A movie review of ${post.title}`)
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    const frontendUrl = "https://thecineprism.com";
    const postUrl = `${frontendUrl}/post/${post.id}`;
    const currentUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    // IMPORTANT: Convert HTTP to HTTPS and validate image URL
    let reviewPosterImageUrl = "";
    if (post.reviewPosterImageUrl) {
      reviewPosterImageUrl = post.reviewPosterImageUrl.replace("http://", "https://");
      // Ensure it's a valid URL
      try {
        new URL(reviewPosterImageUrl);
      } catch (error) {
        console.error("Invalid image URL:", reviewPosterImageUrl);
        reviewPosterImageUrl = "";
      }
    }

    // Set proper content type header
    res.setHeader("Content-Type", "text/html; charset=utf-8");

    // Prevent caching for dynamic content
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Basic Meta Tags -->
    <title>${sanitizedTitle} - CinePrism</title>
    <meta name="description" content="${sanitizedDescription}">

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${currentUrl}">
    <meta property="og:title" content="${sanitizedTitle}">
    <meta property="og:description" content="${sanitizedDescription}">
    ${
      reviewPosterImageUrl
        ? `<meta property="og:image" content="${reviewPosterImageUrl}">`
        : ""
    }
    ${
      reviewPosterImageUrl
        ? `<meta property="og:image:secure_url" content="${reviewPosterImageUrl}">`
        : ""
    }
    <meta property="og:image:width" content="400">
    <meta property="og:image:height" content="600">
    <meta property="og:image:alt" content="${sanitizedTitle} Movie Poster">
    <meta property="og:site_name" content="CinePrism">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${sanitizedTitle}">
    <meta name="twitter:description" content="${sanitizedDescription}">
    ${
      reviewPosterImageUrl
        ? `<meta name="twitter:image" content="${reviewPosterImageUrl}">`
        : ""
    }
    <meta name="twitter:image:alt" content="${sanitizedTitle} Movie Poster">

    <!-- Additional Meta -->
    <meta property="article:author" content="CinePrism">
    <meta property="article:published_time" content="${post.createdAt || ""}">
    <meta property="article:section" content="Movie Reviews">
    <meta property="article:tag" content="${
      post.genres?.join(", ") || "Movie"
    }">

    <!-- Canonical URL -->
    <link rel="canonical" href="${postUrl}">

    <!-- Redirect Script -->
    <script>
        (function() {
            const userAgent = navigator.userAgent.toLowerCase();
            const isCrawler = /bot|crawler|spider|facebook|twitter|whatsapp|telegram|slack|linkedin|pinterest|reddit|googlebot|bingbot/i.test(userAgent);
            
            if (!isCrawler) {
                setTimeout(function() {
                    window.location.replace("${postUrl}");
                }, 100);
            }
        })();
    </script>

    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #0f172a;
            color: white;
            line-height: 1.6;
        }
        
        .container {
            text-align: center;
        }
        
        .poster {
            max-width: 300px; 
            height: auto; 
            border-radius: 15px;
            margin: 20px auto;
            display: block;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }
        
        h1 { 
            color: #10b981; 
            font-size: 2.5rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }
        
        .movie-info {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
            text-align: left;
        }
        
        .info-item {
            margin: 10px 0;
            font-size: 1.1rem;
        }
        
        .info-label {
            color: #64748b;
            font-weight: 600;
        }
        
        .info-value {
            color: #e2e8f0;
        }
        
        .description {
            font-size: 1.1rem;
            line-height: 1.8;
            margin: 25px 0;
            color: #cbd5e1;
        }
        
        .cta-link { 
            display: inline-block;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white; 
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-weight: 600;
            margin-top: 25px;
            transition: all 0.3s ease;
        }
        
        .cta-link:hover { 
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        }

        @media (max-width: 600px) {
            body { padding: 15px; }
            h1 { font-size: 2rem; }
            .poster { max-width: 250px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${sanitizedTitle}</h1>
        
        ${
          reviewPosterImageUrl
            ? `<img src="${reviewPosterImageUrl}" alt="${sanitizedTitle} Poster" class="poster">`
            : ""
        }
        
        <div class="movie-info">
            ${
              post.year
                ? `<div class="info-item"><span class="info-label">Year:</span> <span class="info-value">${post.year}</span></div>`
                : ""
            }
            ${
              post.directedBy
                ? `<div class="info-item"><span class="info-label">Director:</span> <span class="info-value">${post.directedBy}</span></div>`
                : ""
            }
            ${
              post.streamingAt
                ? `<div class="info-item"><span class="info-label">Streaming:</span> <span class="info-value">${post.streamingAt}</span></div>`
                : ""
            }
            ${
              post.genres && post.genres.length > 0
                ? `<div class="info-item"><span class="info-label">Genres:</span> <span class="info-value">${post.genres.join(
                    ", "
                  )}</span></div>`
                : ""
            }
        </div>
        
        <div class="description">
            ${sanitizedDescription}
        </div>
        
        <a href="${postUrl}" class="cta-link">Read Full Review on CinePrism</a>
    </div>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error("Error serving post HTML:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error - CinePrism</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #0f172a; color: white;">
          <h1 style="color: #ef4444;">Something went wrong</h1>
          <p>Please try again later.</p>
          <a href="https://thecineprism.com" style="color: #10b981; text-decoration: none;">← Back to CinePrism</a>
        </body>
      </html>
    `);
  }
};
