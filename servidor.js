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
const MODEL = process.env.TUTOR_MODEL || 'claude-haiku-5-5';
const PUBLIC = path.join(__dirname, 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

const SYSTEM = `You are Emma, a warm, curious British English tutor having a spoken conversation with an advanced learner (B2-C1) whose first languages are Spanish and Portuguese.
Rules:
- Use British English (flat, queue, colour). Speak naturally, with phrasal verbs and idioms at about C1 level.
- Keep every turn SHORT: one or two sentences, 25 words maximum, ending with an open question. The learner should talk about 80% of the time.
- Never finish the learner's sentences. Do not correct mistakes explicitly; if a mistake occurs, naturally recast the sentence correctly inside your reply.
- Use follow-ups such as "Why do you think so?", "Can you give me an example?", "Tell me more about that".
- No lists, no markdown, no emojis: your words will be read aloud.
This is a 30-minute lesson in five phases. Follow the current phase instruction you are given.`;

const PHASES = {
  warmup: 'PHASE 1 - Warm-up (2-3 min): light, friendly small talk. If you remember something from earlier, pick it up.',
  input: 'PHASE 2 - Authentic input (5-6 min): no audio clip is available yet. Briefly (max 3 short sentences) describe a real-sounding snippet from an interview or documentary on a topic the learner likes, then ask open comprehension questions about it, one at a time.',
  guided: 'PHASE 3 - Guided conversation (15 min): run a debate, opinion exchange, narration or role-play based on the earlier topic. Ask open and follow-up questions; play devil\'s advocate sometimes.',
  grammar: 'PHASE 4 - Grammar focus (3-4 min): pick ONE structure from the learner\'s mistakes so far (or a C1 structure like inversion or cleft sentences). Explain it in one sentence, then ask the learner to say 3 practice sentences aloud, one at a time. For this phase only you may use up to 40 words.',
  closing: 'PHASE 5 - Closing (1-2 min): ask the learner to sum up aloud what they learned today. Then thank them warmly in one sentence.',
  placement: 'PLACEMENT INTERVIEW: you are assessing the learner\'s speaking level. Conduct a short interview, one question at a time: (1) ask them to introduce themselves, (2) ask them to narrate a past experience, (3) ask for an opinion, (4) push them to defend a position on an abstract topic (play devil\'s advocate). Do not teach or correct. After the 4th answer, say exactly: "Thank you. Finally, please read this aloud:" and then give a 40-word paragraph containing difficult sounds for Spanish/Portuguese speakers (th, short/long vowels, -ed endings, word stress).',
  longturn: 'The learner just finished an uninterrupted long monologue. Give ONE short sentence of positive feedback on content and coherence, then ask them to repeat the same monologue, trying to be smoother and use more linking words.',
};

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
    body: JSON.stringify({ model, max_tokens, system, messages }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'API error');
  addUsage(model, data.usage);
  return data.content?.[0]?.text ?? '';
}
function parseJson(t) { const m = t.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : t); }

// Inventário de estruturas B2 alto/C1 (lista própria, inspirada nos descritores do English Grammar Profile; confirmar condições de uso antes de integrar o recurso oficial)
const C1_INVENTORY = ['inversion after negative adverbials (Not only / Rarely / Never)','cleft sentences (It was... that / What I... is)','mixed conditionals','third conditional with inversion (Had I known)','passive with reporting verbs (It is said that)','causative have/get something done','modal perfects for deduction (must/can\'t have)','wish/if only with past perfect','subjunctive (I suggest that he be)','participle clauses (Having finished...)','nominalisation','hedging (tends to, seems to, arguably)','discourse markers (Admittedly, Mind you, That said)','concessive clauses (albeit, notwithstanding, much as)','emphatic do','fronting for emphasis','future perfect continuous','ellipsis and substitution','idiomatic collocations (a heated debate, widespread criticism)','phrasal verbs with multiple meanings'];
const ERR_SHAPE = '"errors":[{"original":"...","correction":"...","type":"grammar|vocabulary|register|punctuation|pronunciation","explanation":"one short sentence in English"}]';
const TASKS = {
  placement_writing: (p) => ({
    system: `You are a Cambridge-trained examiner. Assess the CEFR level (B1, B2, C1 or C2) of a short text written by a Spanish/Portuguese-speaking learner. Reply ONLY with JSON: {"cefr":"B2","strengths":["..."],"weaknesses":["..."],${ERR_SHAPE}}. Write strengths, weaknesses and explanations in English.`,
    user: `Prompt: ${p.prompt}\n\nText:\n${p.text}`, max: 1200,
  }),
  placement_speaking: (p) => ({
    system: `You are a Cambridge-trained examiner. From this transcript of a placement interview (learner = "user"), estimate CEFR levels (B1,B2,C1,C2) for fluency, grammar, vocabulary, coherence and interaction. Pronunciation can only be guessed from the text: say so. Reply ONLY with JSON: {"cefr":"B2","scores":{"fluency":"B2","grammar":"B2","vocabulary":"B2","coherence":"B2","interaction":"B2"},"strengths":["..."],"weaknesses":["..."],${ERR_SHAPE}}. Write comments in English.`,
    user: JSON.stringify(p.transcript), max: 1500,
  }),
  cambridge_writing: (p) => ({
    system: `You are a Cambridge C1 Advanced writing examiner. Mark the text on the four scales (content, communicative achievement, organisation, language), each 0-5 with a one-sentence comment in English. Then give a corrected version of the text and the list of errors. Reply ONLY with JSON: {"scores":{"content":{"score":3,"comment":"..."},"communicative":{"score":3,"comment":"..."},"organisation":{"score":3,"comment":"..."},"language":{"score":3,"comment":"..."}},"corrected":"...",${ERR_SHAPE}}. Types of text: ${p.kind}.`,
    user: `Task: ${p.task}\n\nStudent text:\n${p.text}`, max: 2500,
  }),
  rewrite_check: (p) => ({
    system: `The student rewrote sentences that were marked as wrong. For each pair decide if the new version is now correct. Reply ONLY with JSON: {"results":[{"ok":true,"comment":"short comment in English"}]} in the same order.`,
    user: JSON.stringify(p.items), max: 800,
  }),
  report: (p) => ({
    system: `You are an English speaking coach writing a post-session report for a Spanish/Portuguese-speaking learner aiming at C1 (British English). Judge from the transcript (learner = "user"). Pronunciation can only be inferred from the text and low-confidence words: focus on intelligibility, not accent. Reply ONLY with JSON: {"summary":"2 sentences in English",${ERR_SHAPE},"top3":[0,1,2],"good":["advanced expressions or structures used correctly"],"vocab":[{"term":"...","definition":"short English definition","example":"sentence from the session"}],"grammar_cards":[{"title":"...","wrong":"learner sentence","right":"corrected sentence","rule":"one line in English","examples":["...","..."]}],"pronunciation":["short tip in English"],"next":"one concrete recommendation in English","fluency_notes":"short comment in English on coherence/connectors","c1_used":["items copied EXACTLY from this inventory that the learner used correctly: ${C1_INVENTORY.join(' | ')}"],"mediation":"if the learner did a mediation task, a comment in English, else empty"}. "top3" are indexes of the 3 priority errors in "errors".`,
    user: JSON.stringify({ transcript: p.transcript, metrics: p.metrics, lowConfidenceWords: p.lowConfidence || [] }), max: 3000,
  }),
};

const FEEDS = {
  'In Our Time (BBC Radio 4)': 'https://podcasts.files.bbci.co.uk/b006qykl.rss',
  'Desert Island Discs (BBC Radio 4)': 'https://podcasts.files.bbci.co.uk/b006qnmr.rss',
  'Global News Podcast (BBC)': 'https://podcasts.files.bbci.co.uk/p02nq0gn.rss',
  'The Guardian (podcast)': 'https://www.theguardian.com/news/series/todayinfocus/podcast.xml',
};
const rssCache = {};
function tag(x, t) { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : ''; }
async function getFeed(name) {
  const c = rssCache[name]; if (c && Date.now() - c.t < 3600e3) return c.items;
  const r = await fetch(FEEDS[name], { headers: { 'user-agent': 'EnglishCourse/1.0' } });
  if (!r.ok) throw new Error('Feed unavailable: ' + r.status);
  const xml = await r.text();
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].slice(0, 12).map(m => {
    const x = m[0], enc = x.match(/<enclosure[^>]*url="([^"]+)"/);
    return { title: tag(x, 'title'), date: tag(x, 'pubDate'), duration: tag(x, 'itunes:duration'), description: tag(x, 'description').slice(0, 300), audio: enc ? enc[1].replace(/&amp;/g, '&') : '' };
  }).filter(i => i.audio);
  rssCache[name] = { t: Date.now(), items };
  return items;
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
      const { messages, phase, tutorShare, interests, memory, sessionType } = JSON.parse(await readBody(req));
      let system = SYSTEM + '\n\n' + (PHASES[phase] || PHASES.warmup);
      if (interests) system += '\n\nLearner interests (choose topics from these, rotate them, never dwell on one topic for more than two sessions): ' + String(interests).slice(0, 1500);
      if (sessionType) system += '\n\nToday\'s session type: ' + String(sessionType).slice(0, 80) + '. Shape phases 2-3 accordingly (debate / intensive listening and comprehension / role-play and review of recurring errors; in role-play, once a week include a mediation task: the learner explains a short Spanish or Portuguese text to you in English as if you did not speak those languages).';
      if (memory) system += '\n\nMemory about this learner (use it naturally; never read it out as a list):\n' + String(memory).slice(0, 2500) + '\nFor persistent errors, do NOT correct directly: use prompts that make the learner self-correct (repeat with rising intonation, ask for clarification, or give a 1-2 word hint). If the learner does not self-correct after one prompt, give the correct form and move on. Build situations that make the learner use the recent expressions and the C1 structures to practise.';
      if (tutorShare > 0.25) system += '\nWARNING: you are talking too much. Make your next turn even shorter (one sentence).';
      const text = await claude({ model: MODEL, system, messages, max_tokens: 200 });
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
  }).listen(PORT, () => console.log(`English Course em http://localhost:${PORT}`));
}
