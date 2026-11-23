// Servidor simples: entrega a página HTML e protege a chave da API de Claude.
// Sem dependências: basta ter Node instalado.
const http = require('http');
const fs = require('fs');
const path = require('path');

// Lê o arquivo .env (a chave nunca vai para o navegador)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const PORT = process.env.PORT || 3000;
const { C1_INVENTORY, TASKS, FEEDS, getFeed, parseJson, buildChatSystem } = require('./prompts');
const MODEL = process.env.TUTOR_MODEL || 'claude-haiku-5-5';
const PUBLIC = path.join(__dirname, 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };


function readBody(req) {
  if (req.body !== undefined) return Promise.resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)); // Vercel já lê o corpo
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

// ---------- Avaliações com IA (modelo mais forte), RSS e consumo ----------
const EVAL_MODEL = process.env.EVAL_MODEL || 'claude-sonnet-5-5';
const USAGE_FILE = process.env.VERCEL ? '/tmp/usage.json' : path.join(__dirname, 'usage.json'); // na Vercel o consumo é só temporário
function addUsage(model, u) {
  try {
    let d = {}; try { d = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8')); } catch {}
    const month = new Date().toISOString().slice(0, 7);
    d[month] = d[month] || {}; d[month][model] = d[month][model] || { input: 0, output: 0, calls: 0 };
    d[month][model].input += u?.input_tokens || 0; d[month][model].output += u?.output_tokens || 0; d[month][model].calls++;
    fs.writeFileSync(USAGE_FILE, JSON.stringify(d, null, 2));
  } catch {}
}
async function claude({ model, system, messages, max_tokens }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens, system, messages, thinking: { type: /haiku/.test(model) ? 'disabled' : 'between_tools' } }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'API error');
  addUsage(model, data.usage);
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
}

async function api(req, res, url) {
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (url.pathname === '/api/health') return send(200, { needsPassword: !!process.env.APP_PASSWORD, hasKey: !!process.env.ANTHROPIC_API_KEY, tutorModel: MODEL, evalModel: EVAL_MODEL });
  if (url.pathname === '/api/usage') { try { return send(200, JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'))); } catch { return send(200, {}); } }
  if (url.pathname === '/api/c1') return send(200, C1_INVENTORY);
  if (url.pathname === '/api/feeds') return send(200, Object.keys(FEEDS));
  if (url.pathname === '/api/feed') {
    const name = url.searchParams.get('name');
    if (!FEEDS[name]) return send(404, { error: 'Unknown programme' });
    try { return send(200, await getFeed(name)); } catch (e) { return send(502, { error: String(e.message || e) }); }
  }
  if (url.pathname === '/api/eval' && req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) return send(500, { error: 'The ANTHROPIC_API_KEY is missing from the .env file' });
    try {
      const { task, payload } = JSON.parse(await readBody(req));
      if (!TASKS[task]) return send(400, { error: 'Unknown task' });
      const t = TASKS[task](payload || {});
      const text = await claude({ model: EVAL_MODEL, system: t.system, messages: [{ role: 'user', content: t.user }], max_tokens: t.max });
      return send(200, parseJson(text));
    } catch (e) { return send(500, { error: String(e.message || e) }); }
  }
  return send(404, { error: 'Not found' });
}

// Todas as rotas /api/*: local (node server.js) e na Vercel (api/index.js)
async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  // Na Vercel, a regra de reescrita entrega o caminho original em ?p=
  if (url.searchParams.get('p')) { url.pathname = '/api/' + url.searchParams.get('p'); url.searchParams.delete('p'); }
  // Senha de acesso (opcional): protege o gasto da sua chave se o app estiver na internet
  if (process.env.APP_PASSWORD && url.pathname !== '/api/health' && req.headers['x-app-password'] !== process.env.APP_PASSWORD) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Wrong or missing app password.', auth: true }));
  }
  if (url.pathname !== '/api/chat') return api(req, res, url);
  if (req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'The ANTHROPIC_API_KEY is missing from the .env file' }));
    }
    try {
      const { messages, phase, tutorShare, interests, memory, sessionType, extra } = JSON.parse(await readBody(req));
      const system = buildChatSystem({ phase, interests, memory, sessionType, tutorShare, extra });
      const text = await claude({ model: MODEL, system, messages, max_tokens: phase === 'input' ? 600 : 200 });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ text }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: String(e.message || e) }));
    }
  }
  res.writeHead(405); res.end('Method not allowed');
}
module.exports = handleApi;

if (require.main === module) {
  http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) return handleApi(req, res);
    // Arquivos estáticos
    let p = req.url.split('?')[0];
    if (p === '/') p = '/index.html';
    const file = path.join(PUBLIC, path.normalize(p));
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(PORT, () => console.log(`Ask Enma em http://localhost:${PORT}`));
}
