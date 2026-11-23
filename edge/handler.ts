// Edge Function "api" do Supabase: faz o mesmo trabalho do servidor local (servidor.js),
// mas na nuvem e só para quem está logado e autorizado.
// Os prompts vêm de prompts.js (o build junta tudo num arquivo só: supabase/functions/api/index.ts).
//
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   ANTHROPIC_API_KEY  a chave da Claude
//   ALLOWED_EMAILS     e-mails autorizados a usar a IA, separados por vírgula (ex.: voce@exemplo.com)
// Opcionais: TUTOR_MODEL, EVAL_MODEL.

const MODEL = Deno.env.get('TUTOR_MODEL') || 'claude-haiku-5-5';
const EVAL_MODEL = Deno.env.get('EVAL_MODEL') || 'claude-sonnet-5-5';
const SB_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-app-password',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (code: number, obj: unknown) => new Response(JSON.stringify(obj), { status: code, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Confere o login (pergunta ao Supabase quem é o dono do token) e se o e-mail está autorizado
async function authorize(req: Request) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tok) return { err: json(401, { error: 'Please sign in first.', auth: true }) };
  const apikey = Deno.env.get('SUPABASE_ANON_KEY') || req.headers.get('apikey') || '';
  const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey, Authorization: 'Bearer ' + tok } }).catch(() => null);
  if (!r || !r.ok) return { err: json(401, { error: 'Your session has expired. Please sign in again.', auth: true }) };
  const u = await r.json();
  const email = String(u.email || '').toLowerCase();
  const allowed = (Deno.env.get('ALLOWED_EMAILS') || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
  if (!allowed.length) return { err: json(500, { error: 'The ALLOWED_EMAILS secret is not set on the server.' }) };
  if (!allowed.includes(email)) return { err: json(403, { error: 'This account is not authorised to use Emma.' }) };
  return { email };
}

async function addUsage(model: string, u: { input_tokens?: number; output_tokens?: number }) {
  if (!SB_URL || !SERVICE) return;
  try {
    await fetch(SB_URL + '/rest/v1/rpc/add_usage', {
      method: 'POST',
      headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_month: new Date().toISOString().slice(0, 7), p_model: model, p_input: u?.input_tokens || 0, p_output: u?.output_tokens || 0 }),
    });
  } catch { /* o consumo é só informativo */ }
}
async function readUsage() {
  const out: Record<string, Record<string, unknown>> = {};
  if (!SB_URL || !SERVICE) return out;
  try {
    const r = await fetch(SB_URL + '/rest/v1/ai_usage?select=*', { headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE } });
    if (!r.ok) return out;
    for (const x of await r.json()) { (out[x.month] = out[x.month] || {})[x.model] = { input: Number(x.input), output: Number(x.output), calls: Number(x.calls) }; }
  } catch { /* vazio */ }
  return out;
}

async function claude({ model, system, messages, max_tokens }: { model: string; system: string; messages: unknown[]; max_tokens: number }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens, system, messages, thinking: { type: /haiku/.test(model) ? 'disabled' : 'between_tools' } }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'API error');
  await addUsage(model, data.usage);
  return (data.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('').trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const m = url.pathname.match(/\/api\/([^/]*)$/);
  const route = m ? m[1] : '';

  if (route === 'health') return json(200, { remote: true, hasKey: !!Deno.env.get('ANTHROPIC_API_KEY'), hasAllowList: !!Deno.env.get('ALLOWED_EMAILS'), tutorModel: MODEL, evalModel: EVAL_MODEL });

  const a = await authorize(req);
  if (a.err) return a.err;

  if (route === 'usage') return json(200, await readUsage());
  if (route === 'c1') return json(200, C1_INVENTORY);
  if (route === 'feeds') return json(200, Object.keys(FEEDS));
  if (route === 'feed') {
    const name = url.searchParams.get('name') || '';
    if (!FEEDS[name]) return json(404, { error: 'Unknown programme' });
    try { return json(200, await getFeed(name)); } catch (e) { return json(502, { error: String((e as Error).message || e) }); }
  }
  if ((route === 'eval' || route === 'chat') && req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json(500, { error: 'The ANTHROPIC_API_KEY secret is not set on the server.' });
  if (route === 'eval') {
    try {
      const { task, payload } = await req.json();
      if (!TASKS[task]) return json(400, { error: 'Unknown task' });
      const t = TASKS[task](payload || {});
      const text = await claude({ model: EVAL_MODEL, system: t.system, messages: [{ role: 'user', content: t.user }], max_tokens: t.max });
      return json(200, parseJson(text));
    } catch (e) { return json(500, { error: String((e as Error).message || e) }); }
  }
  if (route === 'chat') {
    try {
      const { messages, phase, tutorShare, interests, memory, sessionType, extra } = await req.json();
      const system = buildChatSystem({ phase, interests, memory, sessionType, tutorShare, extra });
      const text = await claude({ model: MODEL, system, messages, max_tokens: phase === 'input' ? 600 : 200 });
      return json(200, { text });
    } catch (e) { return json(500, { error: String((e as Error).message || e) }); }
  }
  return json(404, { error: 'Not found' });
});
