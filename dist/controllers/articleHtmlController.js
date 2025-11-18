"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleHtml = void 0;
const __1 = __importDefault(require(".."));
const articleHtml = async (req, res) => {
    try {
        const articleSlug = req.params.slug;
        // Fetch article data
        const article = await __1.default.article.findFirst({
            where: { slug: articleSlug },
            select: {
                id: true,
                slug: true,
                title: true,
                shortDescription: true,
                mainImageUrl: true,
                author: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
                viewCount: true,
                blocks: true,
            },
        });
        if (!article) {
            return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Article Not Found - TheCinePrism</title></head>
          <body><h1>Article not found</h1></body>
        </html>
      `);
        }
        // Sanitize data for HTML with null safety
        const sanitizedTitle = (article.title || "Untitled Article")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        // Get description from various sources
        const getDescription = () => {
            if (article.shortDescription && article.shortDescription.length > 0) {
                return article.shortDescription.length > 160
                    ? article.shortDescription.substring(0, 157) + "..."
                    : article.shortDescription;
            }
            // Try to extract text from blocks if available
            if (article.blocks && article.blocks.length > 0) {
                const textBlocks = article.blocks
                    .filter((block) => block.type === "PARAGRAPH" && block.content?.text)
                    .map((block) => block.content.text)
                    .join(" ");
                if (textBlocks.length > 0) {
                    return textBlocks.length > 160
                        ? textBlocks.substring(0, 157) + "..."
                        : textBlocks;
                }
            }
            return `Read this article: ${article.title}`;
        };
        const sanitizedDescription = getDescription()
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const frontendUrl = "https://thecineprism.com";
        const articleUrl = `${frontendUrl}/articles/${article.slug || article.id}`;
        const currentUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        // Get the best available image URL
        let articleImageUrl = "";
        const imageUrl = article.mainImageUrl;
        if (imageUrl) {
            articleImageUrl = imageUrl.replace("http://", "https://");
            // Ensure it's a valid URL
            try {
                new URL(articleImageUrl);
            }
            catch (error) {
                console.error("Invalid image URL:", articleImageUrl);
                articleImageUrl = "";
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
    <title>${sanitizedTitle} | TheCinePrism</title>
    <meta name="description" content="${sanitizedDescription}">

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${currentUrl}">
    <meta property="og:title" content="${sanitizedTitle}">
    <meta property="og:description" content="${sanitizedDescription}">
    <meta property="og:site_name" content="TheCinePrism">
    ${articleImageUrl
            ? `<meta property="og:image" content="${articleImageUrl}">`
            : `<meta property="og:image" content="${frontendUrl}/thecineprismlogo.jpg">`}
    ${articleImageUrl
            ? `<meta property="og:image:secure_url" content="${articleImageUrl}">`
            : `<meta property="og:image:secure_url" content="${frontendUrl}/thecineprismlogo.jpg">`}
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${sanitizedTitle}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@TheCinePrism">
    <meta name="twitter:title" content="${sanitizedTitle}">
    <meta name="twitter:description" content="${sanitizedDescription}">
    ${articleImageUrl
            ? `<meta name="twitter:image" content="${articleImageUrl}">`
            : `<meta name="twitter:image" content="${frontendUrl}/thecineprismlogo.jpg">`}
    <meta name="twitter:image:alt" content="${sanitizedTitle}">

    <!-- Article specific meta tags -->
    <meta property="article:author" content="${article.author || "TheCinePrism"}">
    <meta property="article:published_time" content="${article.publishedAt || article.createdAt || ""}">
    ${article.updatedAt !== article.createdAt
            ? `<meta property="article:modified_time" content="${article.updatedAt || ""}">`
            : ""}
    <meta property="article:section" content="Articles">

    <!-- Canonical URL -->
    <link rel="canonical" href="${articleUrl}">

    <!-- Favicon -->
    <link rel="icon" href="${frontendUrl}/favicon.ico" />

    <!-- Redirect Script -->
    <script>
        (function() {
            const userAgent = navigator.userAgent.toLowerCase();
            const isCrawler = /bot|crawler|spider|facebook|twitter|whatsapp|telegram|slack|linkedin|pinterest|reddit|googlebot|bingbot/i.test(userAgent);
            
            if (!isCrawler) {
                setTimeout(function() {
                    window.location.replace("${articleUrl}");
                }, 100);
            }
        })();
    </script>

    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: #0f172a;
            color: white;
            line-height: 1.6;
        }
        
        .container {
            text-align: center;
        }
        
        .article-image {
            max-width: 100%; 
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
            line-height: 1.2;
        }
        
        .article-meta {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
            text-align: left;
        }
        
        .meta-item {
            margin: 10px 0;
            font-size: 1rem;
        }
        
        .meta-label {
            color: #64748b;
            font-weight: 600;
        }
        
        .meta-value {
            color: #e2e8f0;
        }
        
        .description {
            font-size: 1.1rem;
            line-height: 1.8;
            margin: 25px 0;
            color: #cbd5e1;
            text-align: left;
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 15px 0;
            justify-content: center;
        }
        
        .tag {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.875rem;
            border: 1px solid rgba(16, 185, 129, 0.3);
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

        .brand {
            color: #64748b;
            font-size: 1.1rem;
            margin-bottom: 10px;
            font-weight: 500;
        }

        @media (max-width: 600px) {
            body { padding: 15px; }
            h1 { font-size: 2rem; }
            .tags { justify-content: flex-start; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="brand">TheCinePrism</div>
        <h1>${sanitizedTitle}</h1>
        
        ${articleImageUrl
            ? `<img src="${articleImageUrl}" alt="${sanitizedTitle}" class="article-image">`
            : ""}
        
        <div class="article-meta">
            <div class="meta-item">
                <span class="meta-label">Author:</span> 
                <span class="meta-value">${article.author || "TheCinePrism"}</span>
            </div>
            ${article.publishedAt || article.createdAt
            ? `<div class="meta-item">
                    <span class="meta-label">Published:</span> 
                    <span class="meta-value">${new Date(article.publishedAt || article.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })}</span>
                  </div>`
            : ""}
            ${article.viewCount
            ? `<div class="meta-item">
                    <span class="meta-label">Views:</span> 
                    <span class="meta-value">${article.viewCount.toLocaleString()}</span>
                  </div>`
            : ""}
        </div>
        
        <div class="description">
            ${sanitizedDescription}
        </div>
        
        <a href="${articleUrl}" class="cta-link">Read Full Article on TheCinePrism</a>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: #64748b; font-size: 0.9rem;">
            <p>This preview is optimized for social media sharing. Click the link above to read the full article with interactive features, comments, and more.</p>
        </div>
    </div>
</body>
</html>`;
        res.send(html);
    }
    catch (error) {
        console.error("Error serving article HTML:", error);
        res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error - TheCinePrism</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #0f172a; color: white;">
          <h1 style="color: #ef4444;">Something went wrong</h1>
          <p>Please try again later.</p>
          <a href="https://thecineprism.com" style="color: #10b981; text-decoration: none;">← Back to TheCinePrism</a>
        </body>
      </html>
    `);
    }
};
exports.articleHtml = articleHtml;
