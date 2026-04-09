export const BASE_STYLES = `
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300&family=Outfit:wght@200;300;400&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --glass-bg: rgba(10, 17, 28, 0.55);
      --glass-border: rgba(59, 95, 130, 0.2);
      --glass-hover: rgba(26, 52, 84, 0.35);
      --glass-glow: rgba(50, 110, 170, 0.12);
      --accent: #3d7fba;
      --accent-dim: #2a5a85;
      --text-primary: #9ab5cc;
      --text-secondary: #4a6a82;
      --text-bright: #c8dce8;
    }

    html { scroll-behavior: smooth; }

    body {
      min-height: 100vh;
      font-family: 'Outfit', sans-serif;
      color: var(--text-primary);
      background:
        radial-gradient(ellipse 70% 50% at 15% 15%, rgba(40,80,130,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 60% at 85% 85%, rgba(30,60,100,0.15) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 50% 0%, rgba(60,100,150,0.08) 0%, transparent 50%),
        linear-gradient(175deg, #0a0f18 0%, #0d1520 35%, #090d14 65%, #07090f 100%);
    }

    body::before, body::after {
      content: '';
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    body::before {
      width: 400px; height: 400px;
      top: -100px; left: -100px;
      background: radial-gradient(circle, rgba(30,80,140,0.15) 0%, transparent 70%);
      animation: drift 18s ease-in-out infinite alternate;
    }
    body::after {
      width: 350px; height: 350px;
      bottom: -80px; right: -80px;
      background: radial-gradient(circle, rgba(20,60,110,0.12) 0%, transparent 70%);
      animation: drift 22s ease-in-out infinite alternate-reverse;
    }
    @keyframes drift {
      from { transform: translate(0,0) scale(1); }
      to   { transform: translate(30px, 20px) scale(1.08); }
    }

    .glass {
      background: var(--glass-bg);
      border: 0.5px solid var(--glass-border);
      backdrop-filter: blur(14px) saturate(1.4);
      -webkit-backdrop-filter: blur(14px) saturate(1.4);
    }
  </style>
`;
