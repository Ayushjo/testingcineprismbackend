// Table-based, inline-styled email templates for SES.
// All client-specific quirks are handled here so the rest of the codebase
// never has to think about email rendering.

export interface ReleaseItem {
  title: string;
  genre: string;
  rating: string;
  ourTake: string;
  posterUrl?: string;
}

export interface CampaignContent {
  spotlight?: { title: string; image?: string; body: string };
  releases?: ReleaseItem[];
  editorial?: { title: string; body: string };
  hiddenGem?: {
    title: string;
    year: string;
    director: string;
    synopsis: string;
    streamingAt: string;
    posterUrl?: string;
  };
  frameOfWeek?: { imageUrl: string; caption: string };
  sceneBreakdown?: { title: string; film: string; imageUrl?: string; body: string };
  trivia?: { question: string; answer: string; homework?: string };
  comingNextWeek?: string[];
}

interface SubscriberMeta {
  name: string | null;
  unsubscribeToken: string;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const BASE_STYLE = `
  margin: 0; padding: 0; background-color: #f8fafc;
  font-family: Inter, Helvetica, Arial, sans-serif;
  color: #1e293b; -webkit-font-smoothing: antialiased;
`.replace(/\s+/g, " ").trim();

const LOGO_URL =
  "https://thecineprismimages.s3.ap-south-1.amazonaws.com/articles/main-images/thecineprismlogo.jpg";

const masthead = (preheader: string) => `
<div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0; background-color:#f8fafc;">
  <tr><td align="center">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
      style="max-width:640px;width:100%;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;">

      <!-- Masthead -->
      <tr>
        <td style="padding:40px 40px 20px;text-align:center;border-bottom:3px solid #0f172a;">
          <img src="${LOGO_URL}" alt="The Cinéprism" style="max-width:180px;height:auto;display:block;margin:0 auto 12px;">
          <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:32px;letter-spacing:-0.5px;color:#0f172a;text-transform:uppercase;">
            The Cineprism Weekly
          </h1>
          <p style="margin:8px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#64748b;font-weight:600;">
            Your Curated Film Digest
          </p>
        </td>
      </tr>
`;

const footer = () => `
      <!-- Footer -->
      <tr>
        <td style="background-color:#f1f5f9;padding:40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 16px;font-size:11px;color:#64748b;">
            &copy; 2026 The Cin&eacute;prism. All rights reserved.
          </p>
          <p style="margin:0 0 16px;font-size:11px;color:#64748b;line-height:1.5;">
            <strong>THE CINEPRISM WEEKLY</strong> is curated with obsessive attention to detail by film lovers, for film lovers.<br>
            See you next week behind the camera lens.
          </p>
          <p style="margin:0 0 16px;font-size:11px;color:#64748b;">
            <a href="https://www.instagram.com/thecineprism" style="color:#475569;text-decoration:none;">Instagram</a> &nbsp;&bull;&nbsp;
            <a href="https://twitter.com/thecineprism" style="color:#475569;text-decoration:none;">Twitter</a>
          </p>
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            <a href="{{UNSUBSCRIBE_URL}}" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
`;

const sep = () =>
  `<tr><td style="padding:0 40px;"><div style="border-bottom:1px solid #e2e8f0;"></div></td></tr>`;

// ── Campaign email ────────────────────────────────────────────────────────────

export function buildCampaignEmail(
  content: CampaignContent,
  previewText: string | undefined,
  subject: string,
): string {
  const preview =
    previewText || subject || "Your curated film digest is here.";

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Merriweather:ital,wght@0,400;1,300&family=Playfair+Display:wght@700&display=swap');</style>
</head>
<body style="${BASE_STYLE}">
${masthead(preview)}
`;

  // ── Spotlight ──────────────────────────────────────────────────────────────
  if (content.spotlight) {
    const { title, image, body } = content.spotlight;
    html += `
      <tr>
        <td style="padding:40px 40px 20px;">
          <h3 style="margin:0 0 20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ef4444;">
            Industry Spotlight
          </h3>
          <h2 style="margin:0 0 24px;font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:#0f172a;line-height:1.2;">
            ${title}
          </h2>
          ${image ? `<img src="${image}" alt="${title}" style="width:100%;height:auto;display:block;margin-bottom:24px;border-radius:4px;">` : ""}
          <div style="font-size:16px;line-height:1.8;color:#334155;">${body}</div>
        </td>
      </tr>
      ${sep()}
    `;
  }

  // ── Releases ───────────────────────────────────────────────────────────────
  if (content.releases?.length) {
    const rows = content.releases
      .map(
        (r, i) => `
          <tr>
            <td style="padding:${i === 0 ? "12" : "20"}px 0;border-bottom:1px solid #f1f5f9;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  ${
                    r.posterUrl
                      ? `<td width="100" style="vertical-align:top;padding-right:20px;">
                           <img src="${r.posterUrl}" alt="${r.title} Poster" style="width:100px;height:auto;display:block;border-radius:4px;">
                         </td>`
                      : ""
                  }
                  <td style="vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1e293b;">
                      ${r.title} <span style="font-weight:400;font-size:14px;color:#64748b;">(${r.genre})</span>
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#ca8a04;">${r.rating}</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#475569;">${r.ourTake}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `,
      )
      .join("");

    html += `
      <tr>
        <td style="padding:40px 40px;">
          <h3 style="margin:0 0 20px;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#0f172a;">
            This Week's New Releases
          </h3>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            ${rows}
          </table>
        </td>
      </tr>
      ${sep()}
    `;
  }

  // ── Editorial ──────────────────────────────────────────────────────────────
  if (content.editorial) {
    html += `
      <tr>
        <td style="padding:40px 40px;">
          <h3 style="margin:0 0 24px;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#0f172a;">
            The Editorial
          </h3>
          <h4 style="margin:0 0 16px;font-family:'Playfair Display',serif;font-size:24px;color:#1e293b;line-height:1.3;">
            ${content.editorial.title}
          </h4>
          <div style="font-size:16px;line-height:1.8;color:#334155;">${content.editorial.body}</div>
        </td>
      </tr>
      ${sep()}
    `;
  }

  // ── Hidden Gem ─────────────────────────────────────────────────────────────
  if (content.hiddenGem) {
    const g = content.hiddenGem;
    html += `
      <tr>
        <td style="padding:40px 40px;">
          <h3 style="margin:0 0 20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">
            Hidden Gem of the Week
          </h3>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:4px;">
            <tr>
              ${
                g.posterUrl
                  ? `<td width="100" style="vertical-align:top;">
                       <img src="${g.posterUrl}" alt="${g.title}" style="width:100px;height:auto;display:block;border-top-left-radius:4px;border-bottom-left-radius:4px;">
                     </td>`
                  : ""
              }
              <td style="vertical-align:top;padding:20px;">
                <h4 style="margin:0 0 4px;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#0f172a;">
                  ${g.title} <span style="font-weight:400;font-size:14px;color:#64748b;font-family:Inter,sans-serif;">(${g.year})</span>
                </h4>
                <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Dir: ${g.director}</p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#475569;">${g.synopsis}</p>
                <p style="margin:0;font-size:12px;font-weight:600;color:#0f172a;">Stream it on: ${g.streamingAt}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${sep()}
    `;
  }

  // ── Frame of the Week ──────────────────────────────────────────────────────
  if (content.frameOfWeek) {
    html += `
      <tr>
        <td style="padding:40px 0;">
          <div style="padding:0 40px 10px;">
            <h3 style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">
              Frame of the Week
            </h3>
          </div>
          <img src="${content.frameOfWeek.imageUrl}" alt="Frame of the Week" style="width:100%;height:auto;display:block;">
          <div style="padding:12px 40px 0;">
            <p style="margin:0;font-family:'Merriweather',serif;font-size:13px;font-style:italic;color:#64748b;line-height:1.5;">
              ${content.frameOfWeek.caption}
            </p>
          </div>
        </td>
      </tr>
      ${sep()}
    `;
  }

  // ── Scene Breakdown ────────────────────────────────────────────────────────
  if (content.sceneBreakdown) {
    const s = content.sceneBreakdown;
    html += `
      <tr>
        <td style="padding:40px 40px;">
          <h3 style="margin:0 0 20px;font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#0f172a;">
            Scene Breakdown: ${s.title}
          </h3>
          <p style="margin:0 0 16px;font-size:14px;color:#ef4444;font-weight:700;text-transform:uppercase;">From: ${s.film}</p>
          ${s.imageUrl ? `<img src="${s.imageUrl}" alt="${s.title}" style="width:100%;height:auto;display:block;margin-bottom:20px;border-radius:4px;">` : ""}
          <div style="font-size:15px;line-height:1.6;color:#334155;">${s.body}</div>
        </td>
      </tr>
      ${sep()}
    `;
  }

  // ── Trivia ─────────────────────────────────────────────────────────────────
  if (content.trivia) {
    const t = content.trivia;
    html += `
      <tr>
        <td style="padding:40px 40px;">
          <h3 style="margin:0 0 20px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">
            Cinephile Trivia
          </h3>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
            style="background-color:#f1f5f9;border-left:4px solid #334155;">
            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 8px;font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#0f172a;">
                  ${t.question}
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">${t.answer}</p>
                ${t.homework ? `<p style="margin:0;font-style:italic;font-size:13px;color:#64748b;"><strong>Homework:</strong> ${t.homework}</p>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${sep()}
    `;
  }

  // ── Coming Next Week ───────────────────────────────────────────────────────
  if (content.comingNextWeek?.length) {
    const items = content.comingNextWeek
      .map(
        (item) =>
          `<li style="margin-bottom:12px;padding-left:8px;font-size:14px;line-height:1.5;">${item}</li>`,
      )
      .join("");

    html += `
      <tr>
        <td style="padding:40px 40px;">
          <h3 style="margin:0 0 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">
            Coming Next Week
          </h3>
          <ul style="margin:0;padding:0 0 0 16px;list-style-type:square;color:#334155;">
            ${items}
          </ul>
        </td>
      </tr>
    `;
  }

  html += footer();
  html += `</body></html>`;

  return html;
}

// ── Welcome email ─────────────────────────────────────────────────────────────

export function buildWelcomeEmail(subscriber: SubscriberMeta & { planName: string }): string {
  const { name, planName, unsubscribeToken } = subscriber;
  const greeting = name ? `Hi ${name},` : "Welcome aboard!";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to The Cineprism Newsletter</title>
  <style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');</style>
</head>
<body style="${BASE_STYLE}">

<div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  Your subscription to ${planName} is confirmed. First issue arrives this week!
</div>

<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;background-color:#f8fafc;">
  <tr><td align="center">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
      style="max-width:600px;width:100%;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;">

      <!-- Masthead -->
      <tr>
        <td style="padding:40px 40px 20px;text-align:center;border-bottom:3px solid #0f172a;">
          <img src="${LOGO_URL}" alt="The Cin&eacute;prism" style="max-width:160px;height:auto;display:block;margin:0 auto 12px;">
          <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#0f172a;text-transform:uppercase;">
            Welcome to The Cineprism
          </h1>
          <p style="margin:8px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#64748b;font-weight:600;">
            Your Film Journey Begins
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:40px 40px;">
          <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#0f172a;">${greeting}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#334155;">
            You're now subscribed to the <strong>${planName}</strong> newsletter. We're thrilled to have you as part of our community of passionate film lovers.
          </p>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
            style="background-color:#f1f5f9;border-left:4px solid #0f172a;margin-bottom:24px;">
            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
                  What happens next
                </p>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                  Your first issue of <strong>${planName}</strong> arrives every <strong>Friday</strong> in your inbox.
                  If you subscribed mid-week, look out for the next edition on the upcoming Friday — no spam, just one curated digest per week.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#334155;">
            Each issue is packed with:
          </p>
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
            style="background-color:#f8fafc;border-left:4px solid #0f172a;margin-bottom:24px;">
            <tr>
              <td style="padding:20px;">
                <ul style="margin:0;padding:0 0 0 16px;color:#334155;font-size:15px;line-height:2;">
                  <li>🎬 Industry spotlight &amp; breaking news</li>
                  <li>🎥 New releases with our honest takes</li>
                  <li>✍️ A weekly editorial on cinema</li>
                  <li>💎 A hidden gem you might have missed</li>
                  <li>🖼️ Frame of the week &amp; scene breakdowns</li>
                  <li>🎭 Cinephile trivia to impress your friends</li>
                </ul>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#334155;">
            If you ever have thoughts, film recommendations, or questions, reach us at
            <a href="mailto:editorial@thecineprism.com" style="color:#0f172a;font-weight:600;">editorial@thecineprism.com</a>.
          </p>
          <p style="margin:0;font-size:16px;line-height:1.8;color:#334155;font-style:italic;">
            — The Cineprism Team
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color:#f1f5f9;padding:30px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 12px;font-size:11px;color:#64748b;">
            &copy; 2026 The Cin&eacute;prism. All rights reserved.
          </p>
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            Didn't mean to subscribe?
            <a href="{{UNSUBSCRIBE_URL}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe here</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
