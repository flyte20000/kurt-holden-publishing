// Kurt Holden Publishing Command Center — Cloudflare Worker API

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function err(msg, status = 400) { return json({ error: msg }, status); }

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw + 'kh_pub2026'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function randId(n = 16) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function getUser(db, req) {
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const row = await db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').bind(token, Date.now()).first();
  if (!row) return null;
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(row.user_id).first();
}
function now() { return new Date().toISOString(); }

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const method = request.method;
    const db = env.DB;
    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try { body = await request.json(); } catch {}
    }

    // ── AUTH ──────────────────────────────────────────────────────────────────
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) return err('Username and password required');
      const user = await db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').bind(username).first();
      if (!user) return err('User not found', 401);
      const h = await hashPassword(password);
      if (h !== user.password_hash) return err('Incorrect password', 401);
      const token = randId();
      const expires = Date.now() + 1000 * 60 * 60 * 24 * 30;
      await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, user.id, expires).run();
      return json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
      if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      return json({ ok: true });
    }

    const user = await getUser(db, request);
    if (!user) return err('Unauthorized', 401);

    // ── POSTS ─────────────────────────────────────────────────────────────────
    if (path === '/api/posts' && method === 'GET') {
      const status = url.searchParams.get('status');
      const series = url.searchParams.get('series');
      let q = 'SELECT * FROM posts WHERE 1=1';
      const args = [];
      if (status) { q += ' AND status = ?'; args.push(status); }
      if (series) { q += ' AND series = ?'; args.push(series); }
      q += ' ORDER BY CASE status WHEN "Ready to Post" THEN 1 WHEN "Editing" THEN 2 WHEN "Drafting" THEN 3 WHEN "Image Needed" THEN 4 WHEN "Outline" THEN 5 WHEN "Idea" THEN 6 WHEN "Posted" THEN 7 WHEN "Repurpose Later" THEN 8 ELSE 9 END, target_date ASC';
      const { results } = await db.prepare(q).bind(...args).all();
      return json(results || []);
    }
    if (path === '/api/posts' && method === 'POST') {
      const { title, series, pillar, status, target_date, platform, hook, content, image_concept, cta, hashtags, performance_notes, repurpose_opps, posted_link, posted_date, volume_id } = body;
      if (!title) return err('Title required');
      const id = randId(8);
      const n = now();
      await db.prepare(`INSERT INTO posts (id,title,series,pillar,status,target_date,platform,hook,content,image_concept,cta,hashtags,performance_notes,repurpose_opps,posted_link,posted_date,volume_id,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id,title,series||'Flight Path',pillar||'',status||'Idea',target_date||'',platform||'LinkedIn',hook||'',content||'',image_concept||'',cta||'',hashtags||'',performance_notes||'',repurpose_opps||'',posted_link||'',posted_date||'',volume_id||'',n,n).run();
      return json({ ok: true, id });
    }
    if (path.match(/^\/api\/posts\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[3];
      const { title, series, pillar, status, target_date, platform, hook, content, image_concept, cta, hashtags, performance_notes, repurpose_opps, posted_link, posted_date, volume_id } = body;
      await db.prepare(`UPDATE posts SET title=?,series=?,pillar=?,status=?,target_date=?,platform=?,hook=?,content=?,image_concept=?,cta=?,hashtags=?,performance_notes=?,repurpose_opps=?,posted_link=?,posted_date=?,volume_id=?,updated_at=? WHERE id=?`)
        .bind(title,series,pillar||'',status,target_date||'',platform||'LinkedIn',hook||'',content||'',image_concept||'',cta||'',hashtags||'',performance_notes||'',repurpose_opps||'',posted_link||'',posted_date||'',volume_id||'',now(),id).run();
      return json({ ok: true });
    }
    if (path.match(/^\/api\/posts\/[^/]+$/) && method === 'DELETE') {
      await db.prepare('DELETE FROM posts WHERE id = ?').bind(path.split('/')[3]).run();
      return json({ ok: true });
    }

    // ── ARTICLES ──────────────────────────────────────────────────────────────
    if (path === '/api/articles' && method === 'GET') {
      const series = url.searchParams.get('series');
      let q = 'SELECT * FROM articles WHERE 1=1';
      const args = [];
      if (series) { q += ' AND series = ?'; args.push(series); }
      q += ' ORDER BY updated_at DESC';
      const { results } = await db.prepare(q).bind(...args).all();
      return json(results || []);
    }
    if (path === '/api/articles' && method === 'POST') {
      const { title, series, main_argument, supporting_stories, draft, final_version, teaser, publish_date, notes, status } = body;
      if (!title) return err('Title required');
      const id = randId(8);
      const n = now();
      await db.prepare(`INSERT INTO articles (id,title,series,main_argument,supporting_stories,draft,final_version,teaser,publish_date,notes,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id,title,series||'Flight Path',main_argument||'',supporting_stories||'',draft||'',final_version||'',teaser||'',publish_date||'',notes||'',status||'Draft',n,n).run();
      return json({ ok: true, id });
    }
    if (path.match(/^\/api\/articles\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[3];
      const { title, series, main_argument, supporting_stories, draft, final_version, teaser, publish_date, notes, status } = body;
      await db.prepare(`UPDATE articles SET title=?,series=?,main_argument=?,supporting_stories=?,draft=?,final_version=?,teaser=?,publish_date=?,notes=?,status=?,updated_at=? WHERE id=?`)
        .bind(title,series,main_argument||'',supporting_stories||'',draft||'',final_version||'',teaser||'',publish_date||'',notes||'',status||'Draft',now(),id).run();
      return json({ ok: true });
    }
    if (path.match(/^\/api\/articles\/[^/]+$/) && method === 'DELETE') {
      await db.prepare('DELETE FROM articles WHERE id = ?').bind(path.split('/')[3]).run();
      return json({ ok: true });
    }

    // ── STRATEGY ──────────────────────────────────────────────────────────────
    if (path === '/api/strategy' && method === 'GET') {
      const type = url.searchParams.get('type');
      let q = 'SELECT * FROM strategy WHERE 1=1';
      const args = [];
      if (type) { q += ' AND type = ?'; args.push(type); }
      q += ' ORDER BY created_at ASC';
      const { results } = await db.prepare(q).bind(...args).all();
      return json(results || []);
    }
    if (path === '/api/strategy' && method === 'POST') {
      const { type, title, body: sbody } = body;
      if (!title) return err('Title required');
      const id = randId(8);
      await db.prepare('INSERT INTO strategy (id,type,title,body,created_at) VALUES (?,?,?,?,?)').bind(id,type||'voice_rule',title,sbody||'',now()).run();
      return json({ ok: true, id });
    }
    if (path.match(/^\/api\/strategy\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/')[3];
      await db.prepare('UPDATE strategy SET type=?,title=?,body=? WHERE id=?').bind(body.type,body.title,body.body||'',id).run();
      return json({ ok: true });
    }
    if (path.match(/^\/api\/strategy\/[^/]+$/) && method === 'DELETE') {
      await db.prepare('DELETE FROM strategy WHERE id = ?').bind(path.split('/')[3]).run();
      return json({ ok: true });
    }

    // ── WEEKLY PLANS ──────────────────────────────────────────────────────────
    if (path === '/api/weekly' && method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM weekly_plans ORDER BY week_of DESC LIMIT 12').all();
      return json(results || []);
    }
    if (path === '/api/weekly' && method === 'POST') {
      const { week_of, tuesday_id, thursday_id, sunday_id, notes, status } = body;
      if (!week_of) return err('week_of required');
      const id = randId(8);
      await db.prepare(`INSERT INTO weekly_plans (id,week_of,tuesday_id,thursday_id,sunday_id,notes,status,created_at)
        VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(week_of) DO UPDATE SET tuesday_id=excluded.tuesday_id,thursday_id=excluded.thursday_id,sunday_id=excluded.sunday_id,notes=excluded.notes,status=excluded.status`)
        .bind(id,week_of,tuesday_id||'',thursday_id||'',sunday_id||'',notes||'',status||'planning',now()).run();
      return json({ ok: true });
    }

    // ── SEARCH ────────────────────────────────────────────────────────────────
    if (path === '/api/search' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return json({ posts: [], articles: [], strategy: [] });
      const like = `%${q}%`;
      const [posts, articles, strat] = await Promise.all([
        db.prepare('SELECT id,title,series,status,target_date,volume_id,hook FROM posts WHERE title LIKE ? OR hook LIKE ? OR content LIKE ? OR hashtags LIKE ? OR target_date LIKE ? OR posted_date LIKE ? OR volume_id LIKE ? ORDER BY target_date DESC LIMIT 20').bind(like,like,like,like,like,like,like).all(),
        db.prepare('SELECT id,title,series,status,publish_date FROM articles WHERE title LIKE ? OR draft LIKE ? OR main_argument LIKE ? ORDER BY updated_at DESC LIMIT 10').bind(like,like,like).all(),
        db.prepare('SELECT id,type,title,body FROM strategy WHERE title LIKE ? OR body LIKE ? ORDER BY created_at DESC LIMIT 10').bind(like,like).all(),
      ]);
      return json({ posts: posts.results||[], articles: articles.results||[], strategy: strat.results||[] });
    }

    // ── EXPORT ────────────────────────────────────────────────────────────────
    if (path === '/api/export/posts' && method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM posts ORDER BY target_date ASC').all();
      return new Response(JSON.stringify(results||[], null, 2), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="posts-export.json"', ...CORS }
      });
    }
    if (path === '/api/export/articles' && method === 'GET') {
      const { results } = await db.prepare('SELECT * FROM articles ORDER BY publish_date ASC').all();
      return new Response(JSON.stringify(results||[], null, 2), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="articles-export.json"', ...CORS }
      });
    }

    return err('Not found', 404);
  },
};
