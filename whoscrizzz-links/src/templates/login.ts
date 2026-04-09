import { BASE_STYLES } from "../styles";

export function renderLogin(error = ""): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admin — whoscrizzz</title>
  ${BASE_STYLES}
  <style>
    body { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:2rem; }
    .login-wrap { position:relative; z-index:1; width:100%; max-width:340px; animation: fadeUp .5s ease both; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
    h2 {
      font-family:'Cormorant Garamond',serif;
      font-weight:300; font-style:italic;
      font-size:28px; text-align:center;
      background: linear-gradient(125deg, #9ab5c8 0%, #dce8f0 50%, #6a9ab8 100%);
      -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
      margin-bottom:1.8rem;
    }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--text-secondary); margin-bottom:.5rem; }
    input {
      width:100%; padding:11px 14px;
      background:rgba(8,14,24,.7); border:0.5px solid var(--glass-border);
      border-radius:10px; color:var(--text-bright); font-family:'Outfit',sans-serif;
      font-size:13px; outline:none;
      transition:border-color .2s, box-shadow .2s;
    }
    input:focus { border-color:var(--accent-dim); box-shadow:0 0 0 3px rgba(50,100,180,.08); }
    .btn {
      width:100%; padding:12px; margin-top:.5rem;
      background:linear-gradient(135deg,rgba(30,70,130,.6),rgba(20,50,100,.5));
      border:0.5px solid rgba(60,120,180,.3); border-radius:10px;
      color:var(--text-primary); font-family:'Outfit',sans-serif;
      font-size:12px; letter-spacing:.12em; text-transform:uppercase;
      cursor:pointer; transition:all .2s; backdrop-filter:blur(8px);
    }
    .btn:hover { background:linear-gradient(135deg,rgba(40,90,160,.7),rgba(30,65,120,.6)); color:var(--text-bright); }
    .error { color:#e05555; font-size:11px; text-align:center; margin-top:.8rem; letter-spacing:.05em; }
    .back { display:block; text-align:center; margin-top:1.2rem; font-size:10.5px; color:var(--text-secondary); text-decoration:none; letter-spacing:.1em; transition:color .2s; }
    .back:hover { color:var(--text-primary); }
  </style>
</head>
<body>
  <div class="login-wrap glass" style="padding:2.2rem 2rem;border-radius:18px;">
    <h2>whoscrizzz</h2>
    <form method="POST" action="/admin/login">
      <div class="field">
        <label>Contraseña</label>
        <input type="password" name="password" autofocus placeholder="••••••••"/>
      </div>
      <button class="btn" type="submit">Entrar</button>
      ${error ? `<p class="error">${error}</p>` : ""}
    </form>
    <a class="back" href="/">← Regresar al inicio</a>
  </div>
</body>
</html>`;
}
