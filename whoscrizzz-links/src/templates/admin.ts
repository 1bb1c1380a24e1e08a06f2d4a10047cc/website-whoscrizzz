import { BASE_STYLES } from "../styles";
import type { Link } from "../env";

export function renderAdmin(links: Link[]): string {
  const rows = links
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (l) => `
    <tr class="link-row${l.active ? "" : " inactive"}" data-id="${l.id}">
      <td class="td-drag">⠇</td>
      <td><code class="slug">/${l.slug}</code></td>
      <td class="td-title">${l.title}</td>
      <td class="td-url"><span class="url-text">${l.url}</span></td>
      <td class="td-clicks">${l.clicks.toLocaleString()}</td>
      <td class="td-status">
        <span class="badge ${l.active ? "badge-on" : "badge-off"}">${l.active ? "Activo" : "Inactivo"}</span>
      </td>
      <td class="td-actions">
        <button class="btn-sm btn-edit" onclick="openEdit(${l.id},'${l.slug}','${encodeURIComponent(l.url)}','${l.title}','${l.icon}','${l.category}',${l.sort_order},${l.active})">Editar</button>
        <button class="btn-sm btn-del" onclick="delLink(${l.id})">Borrar</button>
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admin — whoscrizzz</title>
  ${BASE_STYLES}
  <style>
    body { padding: 2rem 1.5rem; min-height:100vh; }
    .page { position:relative; z-index:1; max-width:900px; margin:0 auto; animation: fadeUp .5s ease both; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }

    .admin-header {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:2rem; flex-wrap:wrap; gap:1rem;
    }
    .admin-title {
      font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic;
      font-size:28px;
      background:linear-gradient(125deg,#9ab5c8 0%,#dce8f0 50%,#6a9ab8 100%);
      -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    }
    .header-actions { display:flex; gap:.7rem; align-items:center; }
    .btn-primary {
      padding:8px 16px; border-radius:9px; font-size:11px; letter-spacing:.1em; text-transform:uppercase;
      background:linear-gradient(135deg,rgba(30,80,150,.6),rgba(20,55,110,.5));
      border:0.5px solid rgba(60,130,200,.3); color:var(--text-primary); cursor:pointer;
      font-family:'Outfit',sans-serif; transition:all .2s; backdrop-filter:blur(8px);
    }
    .btn-primary:hover { color:var(--text-bright); border-color:rgba(70,150,220,.5); }
    .btn-logout {
      padding:8px 14px; border-radius:9px; font-size:11px; letter-spacing:.1em; text-transform:uppercase;
      background:rgba(80,20,20,.35); border:0.5px solid rgba(140,40,40,.3);
      color:#a05555; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .2s; backdrop-filter:blur(8px);
      text-decoration:none;
    }
    .btn-logout:hover { color:#c06666; border-color:rgba(160,50,50,.5); }

    .stats { display:flex; gap:.8rem; margin-bottom:1.6rem; flex-wrap:wrap; }
    .stat { flex:1; min-width:110px; padding:1rem 1.2rem; border-radius:12px; text-align:center; }
    .stat-val { font-size:22px; font-weight:300; color:var(--text-bright); letter-spacing:-.02em; }
    .stat-lbl { font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:var(--text-secondary); margin-top:3px; }

    .table-wrap { border-radius:14px; overflow:hidden; overflow-x:auto; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead tr { border-bottom:.5px solid rgba(40,70,100,.4); }
    th { padding:10px 14px; text-align:left; font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:var(--text-secondary); font-weight:300; }
    td { padding:10px 14px; border-bottom:.5px solid rgba(20,40,65,.5); vertical-align:middle; }
    .link-row:last-child td { border-bottom:none; }
    .link-row { transition:background .15s; }
    .link-row:hover { background:rgba(20,45,80,.25) !important; }
    .link-row.inactive { opacity:.5; }
    .td-drag { color:var(--text-secondary); cursor:grab; width:24px; font-size:16px; }

    code.slug { background:rgba(20,50,90,.4); padding:2px 8px; border-radius:5px; font-family:monospace; font-size:11px; color:#7ab0d0; letter-spacing:.03em; border:.5px solid rgba(40,80,130,.3); }
    .td-url .url-text { color:var(--text-secondary); font-size:11px; word-break:break-all; }
    .td-clicks { color:var(--text-primary); font-variant-numeric:tabular-nums; }
    .badge { padding:2px 9px; border-radius:20px; font-size:9px; letter-spacing:.12em; text-transform:uppercase; }
    .badge-on { background:rgba(20,80,40,.5); border:.5px solid rgba(40,140,70,.3); color:#4ade80; }
    .badge-off { background:rgba(80,20,20,.4); border:.5px solid rgba(140,40,40,.25); color:#f87171; }
    .td-actions { display:flex; gap:.4rem; }
    .btn-sm { padding:4px 10px; border-radius:6px; font-size:10px; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; }
    .btn-edit { background:rgba(30,70,130,.35); border:.5px solid rgba(50,100,180,.3); color:#7aadce; }
    .btn-edit:hover { background:rgba(40,90,160,.45); color:var(--text-bright); }
    .btn-del { background:rgba(80,20,20,.3); border:.5px solid rgba(140,40,40,.25); color:#e57777; }
    .btn-del:hover { background:rgba(110,30,30,.4); color:#f87171; }

    .overlay { display:none; position:fixed; inset:0; background:rgba(2,5,12,.7); backdrop-filter:blur(6px); z-index:100; align-items:center; justify-content:center; padding:1.5rem; }
    .overlay.show { display:flex; }
    .modal { width:100%; max-width:440px; border-radius:18px; padding:2rem; animation:fadeUp .3s ease both; }
    .modal h3 { font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; font-size:22px; color:var(--text-bright); margin-bottom:1.5rem; }
    .field { margin-bottom:1rem; }
    label { display:block; font-size:9.5px; letter-spacing:.18em; text-transform:uppercase; color:var(--text-secondary); margin-bottom:.45rem; }
    input, select { width:100%; padding:10px 13px; background:rgba(6,12,22,.75); border:.5px solid var(--glass-border); border-radius:9px; color:var(--text-bright); font-family:'Outfit',sans-serif; font-size:12.5px; outline:none; transition:border-color .2s; }
    select option { background:#0d1520; }
    input:focus, select:focus { border-color:var(--accent-dim); }
    .modal-actions { display:flex; gap:.7rem; margin-top:1.4rem; }
    .btn-save { flex:1; padding:10px; border-radius:9px; background:linear-gradient(135deg,rgba(30,80,150,.6),rgba(20,55,110,.5)); border:.5px solid rgba(60,130,200,.3); color:var(--text-primary); font-family:'Outfit',sans-serif; font-size:11px; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; transition:all .2s; }
    .btn-save:hover { color:var(--text-bright); }
    .btn-cancel { padding:10px 16px; border-radius:9px; background:rgba(20,35,55,.5); border:.5px solid var(--glass-border); color:var(--text-secondary); font-family:'Outfit',sans-serif; font-size:11px; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; transition:all .2s; }
    .btn-cancel:hover { color:var(--text-primary); }
    .msg { padding:8px 12px; border-radius:8px; font-size:11px; margin-bottom:1rem; text-align:center; display:none; }
    .msg.ok { background:rgba(20,80,40,.4); border:.5px solid rgba(40,140,70,.3); color:#4ade80; }
    .msg.err { background:rgba(80,20,20,.4); border:.5px solid rgba(140,40,40,.3); color:#f87171; }
  </style>
</head>
<body>
  <div class="page">
    <div class="admin-header">
      <span class="admin-title">whoscrizzz — admin</span>
      <div class="header-actions">
        <a href="/" target="_blank" class="btn-primary">Ver sitio</a>
        <button class="btn-primary" onclick="document.getElementById('addModal').classList.add('show')">+ Agregar link</button>
        <a href="/admin/logout" class="btn-logout">Salir</a>
      </div>
    </div>

    <div class="stats">
      <div class="stat glass">
        <div class="stat-val">${links.length}</div>
        <div class="stat-lbl">Total links</div>
      </div>
      <div class="stat glass">
        <div class="stat-val">${links.filter((l) => l.active).length}</div>
        <div class="stat-lbl">Activos</div>
      </div>
      <div class="stat glass">
        <div class="stat-val">${links.reduce((s, l) => s + l.clicks, 0).toLocaleString()}</div>
        <div class="stat-lbl">Total clicks</div>
      </div>
    </div>

    <div id="flashMsg" class="msg"></div>

    <div class="table-wrap glass">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Slug</th>
            <th>Título</th>
            <th>URL destino</th>
            <th>Clicks</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="linksBody">
          ${rows}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Add Modal -->
  <div id="addModal" class="overlay">
    <div class="modal glass">
      <h3>Nuevo link</h3>
      <div class="field"><label>Slug (ej: ig)</label><input id="a-slug" placeholder="ig"/></div>
      <div class="field"><label>URL destino</label><input id="a-url" placeholder="https://instagram.com/..."/></div>
      <div class="field"><label>Título</label><input id="a-title" placeholder="Instagram"/></div>
      <div class="field"><label>Ícono</label>
        <select id="a-icon">
          <option value="instagram">Instagram</option>
          <option value="x">X / Twitter</option>
          <option value="spotify">Spotify</option>
          <option value="pinterest">Pinterest</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="discord">Discord</option>
          <option value="github">GitHub</option>
          <option value="email">Email</option>
          <option value="link" selected>Enlace genérico</option>
        </select>
      </div>
      <div class="field"><label>Categoría</label>
        <select id="a-category">
          <option value="social">Social</option>
          <option value="music">Music</option>
          <option value="project">Proyecto</option>
          <option value="contact">Contacto</option>
        </select>
      </div>
      <div class="field"><label>Orden</label><input id="a-order" type="number" value="10"/></div>
      <div class="modal-actions">
        <button class="btn-save" onclick="saveAdd()">Guardar</button>
        <button class="btn-cancel" onclick="document.getElementById('addModal').classList.remove('show')">Cancelar</button>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div id="editModal" class="overlay">
    <div class="modal glass">
      <h3>Editar link</h3>
      <input type="hidden" id="e-id"/>
      <div class="field"><label>Slug</label><input id="e-slug"/></div>
      <div class="field"><label>URL destino</label><input id="e-url"/></div>
      <div class="field"><label>Título</label><input id="e-title"/></div>
      <div class="field"><label>Ícono</label>
        <select id="e-icon">
          <option value="instagram">Instagram</option>
          <option value="x">X / Twitter</option>
          <option value="spotify">Spotify</option>
          <option value="pinterest">Pinterest</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="discord">Discord</option>
          <option value="github">GitHub</option>
          <option value="email">Email</option>
          <option value="link">Enlace genérico</option>
        </select>
      </div>
      <div class="field"><label>Orden</label><input id="e-order" type="number"/></div>
      <div class="field"><label>Estado</label>
        <select id="e-active">
          <option value="1">Activo</option>
          <option value="0">Inactivo</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-save" onclick="saveEdit()">Guardar</button>
        <button class="btn-cancel" onclick="document.getElementById('editModal').classList.remove('show')">Cancelar</button>
      </div>
    </div>
  </div>

  <script>
    function flash(msg, ok=true) {
      const el = document.getElementById('flashMsg');
      el.textContent = msg;
      el.className = 'msg ' + (ok ? 'ok' : 'err');
      el.style.display = 'block';
      setTimeout(() => { el.style.display='none'; }, 3500);
    }

    function openEdit(id,slug,url,title,icon,cat,order,active) {
      document.getElementById('e-id').value = id;
      document.getElementById('e-slug').value = slug;
      document.getElementById('e-url').value = decodeURIComponent(url);
      document.getElementById('e-title').value = title;
      document.getElementById('e-icon').value = icon;
      document.getElementById('e-order').value = order;
      document.getElementById('e-active').value = active;
      document.getElementById('editModal').classList.add('show');
    }

    async function saveAdd() {
      const body = {
        slug: document.getElementById('a-slug').value.trim().replace(/^\\//, ''),
        url: document.getElementById('a-url').value.trim(),
        title: document.getElementById('a-title').value.trim(),
        icon: document.getElementById('a-icon').value,
        category: document.getElementById('a-category').value,
        sort_order: parseInt(document.getElementById('a-order').value) || 10,
      };
      const r = await fetch('/api/links', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (r.ok) { flash('Link agregado ✓'); setTimeout(()=>location.reload(),800); }
      else { const e=await r.json(); flash(e.error||'Error','err'); }
    }

    async function saveEdit() {
      const id = document.getElementById('e-id').value;
      const body = {
        slug: document.getElementById('e-slug').value.trim().replace(/^\\//, ''),
        url: document.getElementById('e-url').value.trim(),
        title: document.getElementById('e-title').value.trim(),
        icon: document.getElementById('e-icon').value,
        sort_order: parseInt(document.getElementById('e-order').value) || 0,
        active: parseInt(document.getElementById('e-active').value),
      };
      const r = await fetch('/api/links/'+id, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (r.ok) { flash('Link actualizado ✓'); setTimeout(()=>location.reload(),800); }
      else { const e=await r.json(); flash(e.error||'Error',false); }
    }

    async function delLink(id) {
      if (!confirm('¿Borrar este link?')) return;
      const r = await fetch('/api/links/'+id, {method:'DELETE'});
      if (r.ok) { flash('Link eliminado'); setTimeout(()=>location.reload(),700); }
      else { flash('Error al eliminar',false); }
    }

    document.querySelectorAll('.overlay').forEach(o => {
      o.addEventListener('click', e => { if(e.target===o) o.classList.remove('show'); });
    });
  </script>
</body>
</html>`;
}
