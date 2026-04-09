import { getIcon } from "../icons";
import { BASE_STYLES } from "../styles";
import type { Link } from "../env";

export function renderLanding(links: Link[]): string {
  const linkItems = links
    .filter((l) => l.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (l) => `
      <a class="link" href="/${l.slug}" data-url="${l.url}">
        <div class="icon">${getIcon(l.icon)}</div>
        <span class="label">${l.title}</span>
        <span class="arrow">›</span>
      </a>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>whoscrizzz</title>
  <meta name="description" content="music · style · links"/>
  <meta property="og:title" content="whoscrizzz"/>
  <meta property="og:description" content="music · style · links"/>
  ${BASE_STYLES}
  <style>
    body { display: flex; align-items: center; justify-content: center; padding: 3rem 1.25rem; }

    .card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 380px;
      text-align: center;
      animation: fadeUp 0.6s ease both;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .logo { margin: 0 auto 1.2rem; display: inline-block; }

    .logo-text {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 300;
      font-style: italic;
      font-size: 44px;
      letter-spacing: 0.01em;
      line-height: 1;
      background: linear-gradient(125deg, #9ab5c8 0%, #dce8f0 40%, #6a9ab8 75%, #8aafc4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: block;
      padding-bottom: 4px;
    }

    .logo-sub {
      font-family: 'Outfit', sans-serif;
      font-weight: 200;
      font-size: 8px;
      letter-spacing: 0.38em;
      text-transform: uppercase;
      color: var(--text-secondary);
      display: block;
      margin-top: 10px;
      text-align: right;
      padding-right: 2px;
    }

    .divider {
      width: 28px;
      height: 0.5px;
      background: linear-gradient(90deg, transparent, var(--accent-dim), transparent);
      margin: 1.4rem auto 1.8rem;
    }

    .links { display: flex; flex-direction: column; gap: 9px; margin-bottom: 2rem; }

    .link {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 12px 16px;
      border-radius: 13px;
      text-decoration: none;
      color: var(--text-primary);
      font-size: 12.5px;
      font-weight: 300;
      letter-spacing: 0.06em;
      transition: border-color 0.25s, background 0.25s, color 0.25s, transform 0.2s, box-shadow 0.25s;
      position: relative;
      overflow: hidden;
    }

    .link::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(50,100,160,0.06) 0%, transparent 60%);
      opacity: 0;
      transition: opacity 0.25s;
    }

    .link:hover {
      border-color: rgba(60,120,180,0.4) !important;
      background: var(--glass-hover) !important;
      color: var(--text-bright);
      transform: translateY(-1px);
      box-shadow: 0 8px 32px rgba(30,80,140,0.15), 0 0 0 0.5px rgba(60,120,180,0.2);
    }

    .link:hover::before { opacity: 1; }
    .link:active { transform: translateY(0); }

    .icon {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: rgba(6, 11, 20, 0.7);
      border: 0.5px solid rgba(40,70,100,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      backdrop-filter: blur(6px);
      transition: border-color 0.25s;
    }
    .link:hover .icon { border-color: rgba(60,120,180,0.5); }
    .icon svg { width: 15px; height: 15px; }

    .label { flex: 1; text-align: left; }

    .arrow {
      color: rgba(40,70,100,0.7);
      font-size: 16px;
      transition: color 0.2s, transform 0.2s;
    }
    .link:hover .arrow { color: var(--accent); transform: translateX(2px); }

    footer {
      font-size: 8px;
      color: rgba(24,38,52,0.45);
      letter-spacing: 0.25em;
      text-transform: uppercase;
      font-weight: 200;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <span class="logo-text">whoscrizzz</span>
      <span class="logo-sub">music · style · links</span>
    </div>

    <div class="divider"></div>

    <div class="links glass" style="padding:10px;border-radius:16px;">
      ${linkItems}
    </div>

    <footer>whoscrizzz.com</footer>
  </div>
</body>
</html>`;
}
