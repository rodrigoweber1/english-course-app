// Funções compartilhadas por todas as páginas (dados guardados neste navegador)
const EC = {
  get(k, d){ try { const v = localStorage.getItem('ec_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem('ec_' + k, JSON.stringify(v)); } catch {} },
  today(){ return new Date().toISOString().slice(0,10); },
  esc(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); },

  async api(path, body, retried){
    const pw = (() => { try { return localStorage.getItem('ec_pw') || ''; } catch { return ''; } })();
    const opts = { headers: { 'x-app-password': pw } };
    const tok = await EC.token(); if (tok) opts.headers['Authorization'] = 'Bearer ' + tok;
    // Na web (fora do localhost) a IA roda na Edge Function do Supabase; no computador, no servidor local
    const remote = EC.remoteApi();
    if (remote) opts.headers['apikey'] = EC.cfg.anonKey;
    if (body) { opts.method = 'POST'; opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    let r;
    try { r = await fetch(remote ? EC.cfg.url.replace(/\/$/, '') + '/functions/v1/' + (EC.cfg.fn || 'api') + path : path, opts); }
    catch { throw new Error(remote ? 'Could not reach the Ask Emma service. Check your internet connection.' : 'This feature needs the local server: start the app with iniciar.bat (localhost:3000).'); }
    const d = await r.json().catch(() => ({}));
    if (remote && r.status === 401 && d.auth) { EC.set('auth', null); location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html')); throw new Error(d.error || 'Please sign in again.'); }
    if (r.status === 401 && d.auth && !retried) {
      const p = prompt('App password:');
      if (p) { try { localStorage.setItem('ec_pw', p); } catch {} return EC.api(path, body, true); }
    }
    if (!r.ok && !d.error && (r.status === 404 || r.status === 405)) throw new Error(remote ? 'The Ask Emma service is not available yet (function not published).' : 'This feature needs the local server: start the app with iniciar.bat (localhost:3000).');
    if (!r.ok) throw new Error(d.error || 'Error ' + r.status);
    return d;
  },
  remoteApi(){ return !!(EC.cfg && EC.authOn) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); },
  evaluate(task, payload){ return EC.api('/api/eval', { task, payload }); },

  nav(active){
    const I = {
      prova: '<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="3"/>',
      index: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
      plano: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 10h18M8 2v4M16 2v4"/>',
      biblioteca: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
      escuta: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
      escrita: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
      interesses: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
      girias: '<path d="M12 3l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z"/>',
      ajustes: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    };
    // Menu em lista suspensa: a logo "E" fica na barra; as páginas ficam dentro do menu
    const groups = [
      ['Start', [['prova.html','Placement test'],['interesses.html','Interests']]],
      ['Practice', [['index.html','Lesson'],['girias.html','Slang'],['escuta.html','Listening'],['escrita.html','Writing']]],
      ['Progress', [['plano.html','Plan'],['biblioteca.html','Library']]],
      ['Account', [['ajustes.html','Settings']]],
    ];
    const email = EC.authOn && EC.session() ? (EC.session().user?.email || '') : '';
    const link = ([h,t]) => `<a href="${h}" role="menuitem" ${h===active?'class="on" aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${I[h.replace('.html','')]}</svg>${t}</a>`;
    const n = document.createElement('nav'); n.className = 'ecnav'; n.setAttribute('aria-label','Main menu');
    n.innerHTML = '<a class="brand" href="index.html" aria-label="Ask Emma, home"><span class="logo" aria-hidden="true">E</span><b>Ask Emma</b></a>' +
      '<span class="ecz"><button type="button" aria-label="Smaller text" title="Smaller text">A−</button><button type="button" aria-label="Larger text" title="Larger text">A+</button></span>' +
      '<button type="button" class="ecmenubtn" id="ecMenuBtn" aria-label="Menu" aria-haspopup="true" aria-expanded="false" aria-controls="ecMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span></button>' +
      '<div class="ecmenu" id="ecMenu" role="menu" aria-label="Pages" hidden>' +
        groups.map(([g, its]) => `<div class="ecgrp" role="none"><span class="ecgh" aria-hidden="true">${g}</span>${its.map(link).join('')}</div>`).join('') +
        (email ? `<div class="ecgrp" role="none"><span class="ecmail" title="${EC.esc(email)}">${EC.esc(email)}</span><button type="button" class="ecout" role="menuitem">Sign out</button></div>` : '') +
      '</div>';
    const [bm, bp] = n.querySelectorAll('.ecz button');
    bm.onclick = () => EC.zoom(-1); bp.onclick = () => EC.zoom(1);
    const btn = n.querySelector('#ecMenuBtn'), menu = n.querySelector('#ecMenu');
    const setOpen = (on, focus) => {
      menu.hidden = !on; btn.setAttribute('aria-expanded', on); btn.querySelector('path').setAttribute('d', on ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16');
      if (on && focus) (menu.querySelector('a.on') || menu.querySelector('a, button')).focus();
    };
    btn.onclick = () => setOpen(menu.hidden, true);
    document.addEventListener('click', e => { if (!menu.hidden && !n.contains(e.target)) setOpen(false); });
    n.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); return; }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !menu.hidden) {
        const items = [...menu.querySelectorAll('a, button')], k = items.indexOf(document.activeElement);
        items[(k + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); e.preventDefault();
      }
    });
    const out = n.querySelector('.ecout'); if (out) out.onclick = () => EC.signOut();
    document.body.prepend(n);
  },

  // Tamanho do texto (A− / A+): níveis de 0.85 a 1.6, guardado neste navegador
  zoom(step){
    const lv = [.85, 1, 1.15, 1.3, 1.45];
    let i = Math.min(lv.length - 1, EC.get('zoomIdx', 1));
    if (step) { i = Math.max(0, Math.min(lv.length - 1, i + step)); EC.set('zoomIdx', i); }
    document.documentElement.style.zoom = lv[i]; document.documentElement.style.setProperty('--z', lv[i]);
  },

  // Voz britânica do sistema
  // As vozes do navegador carregam de forma assíncrona: espera até 1,5 s para não cair na voz padrão (não britânica)
  voicesReady(){
    return new Promise(res => {
      const v = speechSynthesis.getVoices(); if (v.length) return res(v);
      const t = setTimeout(() => res(speechSynthesis.getVoices()), 1500);
      speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); res(speechSynthesis.getVoices()); }, { once: true });
    });
  },
  voice(){
    const v = speechSynthesis.getVoices(), n = EC.get('settings', {}).voiceName, gb = v.filter(x => /en[-_]GB/i.test(x.lang));
    return (n && v.find(x => x.name === n)) || gb.find(x => /natural/i.test(x.name) && /sonia|libby|maisie|hazel|female/i.test(x.name)) || gb.find(x => /female|sonia|libby|hazel|google uk english female/i.test(x.name)) || gb[0] || v.find(x => /^en/i.test(x.lang)) || null;
  },
  // Mesma voz em toda a aplicação (aula, entrevista da prova, biblioteca, ajustes)
  async speak(text, rate){
    await EC.voicesReady();
    return new Promise(res => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = rate || EC.get('settings', {}).rate || 1;
      const v = EC.voice(); if (v) u.voice = v;
      u.onend = u.onerror = () => res(); speechSynthesis.speak(u);
    });
  },
  // Escuta uma frase (para no silêncio). Devolve { text, confidence }
  listen(){
    return new Promise((resolve, reject) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return reject(new Error('This browser has no speech recognition. Please use Chrome or Edge.'));
      const r = new SR(); r.lang = 'en-GB'; r.interimResults = false; r.maxAlternatives = 1;
      let out = { text:'', confidence:1 };
      r.onresult = e => { out = { text: e.results[0][0].transcript, confidence: e.results[0][0].confidence }; };
      r.onerror = e => { if (e.error !== 'no-speech') reject(new Error('Microphone: ' + e.error)); };
      r.onend = () => resolve(out);
      r.start();
    });
  },

  // Repetição espaçada simples (graus: 0 = errei, 1 = difícil, 2 = bom, 3 = fácil)
  srsNext(item, grade){
    const iv = item.interval || 0, ease = item.ease || 2.3;
    let ni, ne = ease;
    if (grade === 0) { ni = 1; ne = Math.max(1.3, ease - .2); item.lapses = (item.lapses || 0) + 1; }
    else { ni = iv ? Math.round(iv * (grade === 1 ? 1.2 : grade === 2 ? ease : ease * 1.3)) : (grade === 3 ? 4 : 2); if (grade === 3) ne = ease + .1; }
    item.interval = Math.max(1, ni); item.ease = ne;
    const d = new Date(); d.setDate(d.getDate() + item.interval); item.due = d.toISOString().slice(0,10);
    return item;
  },

  // Diferenças entre duas frases (palavras): devolve HTML com <del> e <ins>
  diffHtml(a, b){
    const x = a.split(/\s+/), y = b.split(/\s+/), n = x.length, m = y.length;
    const L = Array.from({length:n+1}, () => new Array(m+1).fill(0));
    for (let i=n-1;i>=0;i--) for (let j=m-1;j>=0;j--) L[i][j] = x[i]===y[j] ? L[i+1][j+1]+1 : Math.max(L[i+1][j], L[i][j+1]);
    let i=0,j=0,o=[];
    while (i<n && j<m) { if (x[i]===y[j]) { o.push(EC.esc(x[i])); i++; j++; } else if (L[i+1][j] >= L[i][j+1]) { o.push('<del>'+EC.esc(x[i])+'</del>'); i++; } else { o.push('<ins>'+EC.esc(y[j])+'</ins>'); j++; } }
    while (i<n) o.push('<del>'+EC.esc(x[i++])+'</del>'); while (j<m) o.push('<ins>'+EC.esc(y[j++])+'</ins>');
    return o.join(' ');
  },

  // Registro de erros (6.3), vocabulário (6.2) e tarjetas (6)
  addErrors(list, source){
    const log = EC.get('errors', []);
    for (const e of list || []) log.push({ ...e, source, date: EC.today() });
    EC.set('errors', log);
  },
  addVocab(list){
    const v = EC.get('vocab', []);
    for (const w of list || []) if (w.term && !v.some(x => x.term.toLowerCase() === w.term.toLowerCase())) v.push({ ...w, added: EC.today(), due: EC.today(), interval: 0, ease: 2.3, uses: 0 });
    EC.set('vocab', v);
  },
  addCards(list){
    const c = EC.get('cards', []);
    for (const k of list || []) if (k.title && !c.some(x => x.title === k.title && x.wrong === k.wrong)) c.push({ ...k, added: EC.today(), due: EC.today(), interval: 0, ease: 2.3 });
    EC.set('cards', c);
  },
  // Erro persistente: apareceu em 3 sessões/datas diferentes (explicação curta = tipo + correção)
  persistentErrors(all){ return EC.errorGroups().filter(x => all || x.state !== 'resolved'); },

};
speechSynthesis.onvoiceschanged = () => {};

// Memória para o professor: erros persistentes, expressões recentes e estruturas C1 a provocar (6.2, 6.3, 6.4)
EC.loadC1 = () => EC.api('/api/c1').then(l => { EC.set('c1inv', l); return l; }).catch(() => EC.get('c1inv', []));
EC.c1Status = () => { const inv = EC.get('c1inv', []), used = EC.get('c1used', {}); return { inv, used, pct: inv.length ? Math.round(inv.filter(x => used[x]).length / inv.length * 100) : 0 }; };
EC.memoryText = function(){
  const parts = [], pe = EC.trainingErrors();
  if (pe.length) parts.push('Persistent errors (repeat in 3+ sessions; practise at most these): ' + pe.map(e => `"${e.original}" -> "${e.correction}"` + (e.state === 'relapsed' ? ' (relapsed: the learner had fixed it before)' : '')).join('; '));
  const v = EC.get('vocab', []).filter(x => (x.uses || 0) < 3).slice(-8);
  if (v.length) parts.push('Recent expressions to practise (5-8): ' + v.map(x => x.term).join(', '));
  const c = EC.c1Status(), todo = c.inv.filter(x => !c.used[x]);
  if (todo.length) { const w = Math.floor(Date.now() / (7 * 864e5)); parts.push('C1 structures the learner does not use yet (provoke 1-2 this week): ' + [todo[w % todo.length], todo[(w + 1) % todo.length]].filter((x, i, a) => a.indexOf(x) === i).join('; ')); }
  const lw = EC.get('lastWriting', null); if (lw && !lw.used) { parts.push('The learner recently wrote about: "' + lw.task.slice(0, 140) + '". During the guided conversation ask them to defend the ideas of their text aloud. Their text began: "' + lw.text.slice(0, 200) + '"'); }
  const last = EC.get('sessions', []).slice(-2); if (last.length) parts.push('Previous sessions: ' + last.map(x => x.date + ' (' + x.type + ')').join(', '));
  return parts.join('\n');
};
EC.sessionType = function(){ const s = EC.settings(), days = Object.keys(s.classes).map(Number).sort((a,b)=>a-b), i = days.indexOf(new Date().getDay()); return EC.TYPES[(i < 0 ? 0 : i) % 3]; };

// ---------- Plano de estudos (seção 4.1) e ajustes (8.2) ----------
EC.DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
EC.defaults = () => ({
  classes: { 1:'08:00', 3:'19:30', 5:'13:00' },            // dia da semana (0=dom) -> hora
  leads: [15], dayBefore: null,                              // avisos em minutos antes; ou 'HH:MM' do dia anterior
  second: { on:true, hours:2 },
  listen: { days:[2,4,6], time:'18:00' }, write: { day:4, time:'18:00' },
  quiet: { from:'22:00', to:'07:00' }, pauses: [], planStart: null, rate: 1, voiceName: '',
  budget: 10,
});
EC.settings = () => ({ ...EC.defaults(), ...EC.get('settings', {}) });
EC.PHASES = [
  { id:0, name:'Bridge phase: reach B2', weeks:28 },
  { id:1, name:'Phase 1: consolidate upper B2', weeks:16 },
  { id:2, name:'Phase 2: step up to C1', weeks:16 },
  { id:3, name:'Phase 3: consolidated C1', weeks:16 },
];
EC.TYPES = ['Conversation or debate','Intensive listening','Role-play and review'];
// Calcula o plano a partir do nível e do número de aulas por semana
EC.plan = function(level, settings){
  const s = settings || EC.settings(), n = Object.keys(s.classes).length;
  const lv = (level?.overall || 'B2+');
  let list;
  if (/^B1/.test(lv)) list = [0,1,2,3]; else if (/^B2$/.test(lv)) list = [1,2,3]; else if (/^(C1|C2)/.test(lv)) list = [3]; else list = [1,2,3];
  const factor = n >= 4 ? .85 : n === 3 ? 1 : n === 2 ? 65/48 : 2;
  const phases = list.map(i => { const p = EC.PHASES[i]; let w = p.weeks; if (i === 1 && /^B2$/.test(lv)) w += 8; return { ...p, weeks: Math.round(w * factor) }; });
  const total = phases.reduce((a,p)=>a+p.weeks,0);
  const start = s.planStart ? new Date(s.planStart + 'T00:00') : new Date();
  const paused = (s.pauses || []).reduce((a,p) => a + Math.max(0, Math.round((new Date(p.to) - new Date(p.from)) / 864e5) + 1), 0);
  const end = new Date(start); end.setDate(end.getDate() + total * 7 + paused);
  return { phases, total, start, end, n, minimum: n >= 2, paused };
};
EC.weekNow = function(plan, settings){
  const s = settings || EC.settings();
  let days = Math.floor((new Date() - plan.start) / 864e5);
  for (const p of s.pauses || []) { const a = new Date(p.from), b = new Date(p.to), now = new Date(); if (now > b) days -= Math.round((b - a)/864e5) + 1; else if (now >= a) days -= Math.max(0, Math.round((now - a)/864e5)); }
  return Math.max(0, Math.floor(days / 7)) + 1;
};
EC.icsExport = function(settings){
  const s = settings || EC.settings(), pad = n => String(n).padStart(2,'0');
  const out = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ask Emma//EN','CALSCALE:GREGORIAN'];
  const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const days = ['SU','MO','TU','WE','TH','FR','SA'];
  const add = (title, day, time, mins) => {
    const d = new Date(); d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
    const [h, m] = time.split(':').map(Number), st = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
    const e = new Date(2000,0,1,h,m + mins), et = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`;
    out.push('BEGIN:VEVENT', `UID:${title.replace(/\W/g,'')}${day}@englishcourse`, `DTSTAMP:${stamp}`, `DTSTART:${st}`, `DTEND:${et}`, `RRULE:FREQ=WEEKLY;BYDAY=${days[day]}`, `SUMMARY:${title}`);
    for (const l of s.leads) out.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, `TRIGGER:-PT${l}M`, 'END:VALARM');
    out.push('END:VEVENT');
  };
  Object.entries(s.classes).forEach(([d,t]) => add('Ask Emma: lesson (25 min)', +d, t, 25));
  (s.listen.days || []).forEach(d => add('Ask Emma: free listening (20 min)', d, s.listen.time, 20));
  add('Ask Emma: writing task (30 min)', s.write.day, s.write.time, 30);
  out.push('END:VCALENDAR');
  return out.join('\r\n');
};

// ---------- Erros persistentes: ciclo de vida (ativo -> melhorando -> resolvido -> recaída) ----------
EC.errKey = e => (e.type || '') + '|' + (e.correction || '').toLowerCase().slice(0, 40);
EC.errorGroups = function(){
  const by = {}, st = EC.get('errorStatus', {});
  for (const e of EC.get('errors', [])) { const k = EC.errKey(e); (by[k] = by[k] || { key:k, original:e.original, correction:e.correction, type:e.type, sessions:new Set() }).sessions.add(e.source); }
  return Object.values(by).filter(x => x.sessions.size >= 3).map(x => {
    const s = st[x.key] || {}, clean = (s.clean || []).length;
    let state = clean ? 'improving' : 'active';
    if (s.resolvedAt) state = [...x.sessions].some(src => !(s.seen || []).includes(src)) ? 'relapsed' : 'resolved';
    return { key:x.key, original:x.original, correction:x.correction, type:x.type, count:x.sessions.size, state, clean: state === 'resolved' ? 3 : clean, resolvedAt: s.resolvedAt || null };
  });
};
// Fila de treino: no máximo 5 erros ativos de uma vez (recaídas primeiro, depois os mais frequentes)
EC.trainingErrors = function(){
  const rank = { relapsed:0, improving:1, active:2 };
  return EC.persistentErrors().sort((a,b) => (rank[a.state] - rank[b.state]) || (b.count - a.count)).slice(0, 5);
};
// Aplica o veredito do relatório: avoided (3 aulas diferentes) resolve; repeated zera a contagem
EC.applyErrorChecks = function(checks, list, sid){
  const st = EC.get('errorStatus', {}), groups = EC.errorGroups();
  for (const c of checks || []) {
    const e = list[c.id]; if (!e) continue;
    const s = st[e.key] = st[e.key] || { clean: [] };
    const g0 = groups.find(x => x.key === e.key); if (g0 && g0.state === 'relapsed') { s.clean = []; s.resolvedAt = null; s.seen = []; }
    if (c.status === 'avoided') {
      if (!s.clean.includes(sid)) s.clean.push(sid);
      if (s.clean.length >= 3) { s.resolvedAt = EC.today(); s.seen = []; EC.get('errors', []).forEach(x => { if (EC.errKey(x) === e.key) s.seen.push(x.source); }); s.seen = [...new Set(s.seen)]; }
    } else if (c.status === 'repeated') { s.clean = []; if (s.resolvedAt) { s.resolvedAt = null; s.seen = []; } }
  }
  EC.set('errorStatus', st);
};

// ---------- Temas: o 👍/👎 das aulas orienta a Emma; revisão periódica dos interesses ----------
EC.topicFeedback = function(){
  const r = EC.get('topicRatings', []).filter(x => x.topic);
  const uniq = v => [...new Set(r.filter(x => x.v === v).map(x => x.topic.toLowerCase()))].slice(-8);
  const like = uniq(1).filter(t => !uniq(-1).includes(t)), dislike = uniq(-1);
  let t = '';
  if (like.length) t += 'Topics the learner enjoyed in past lessons (favour similar ones): ' + like.join(', ') + '. ';
  if (dislike.length) t += 'Topics the learner did NOT enjoy (avoid them for now): ' + dislike.join(', ') + '.';
  return t.trim();
};
EC.interestsReviewDue = function(){
  let d = null; try { d = JSON.parse(localStorage.getItem('ec_interests') || 'null'); } catch {}
  if (!d || !d.updated) return null;
  const days = Math.floor((Date.now() - new Date(d.updated)) / 864e5), snooze = EC.get('interestsSnooze', 0);
  return days >= 28 && Date.now() > snooze ? days : null;           // revisão a cada 4 semanas
};
EC.interestsStillFine = function(){
  try { const d = JSON.parse(localStorage.getItem('ec_interests') || 'null'); if (d) { d.updated = new Date().toISOString(); localStorage.setItem('ec_interests', JSON.stringify(d)); } } catch {}
};

// ---------- Provas de checkpoint (semanas 8, 16, 24, 32, 40 do ciclo e avaliação final) ----------
EC.checkpointList = function(){
  const level = EC.get('level', null), s = EC.settings(), p = EC.plan(level, s);
  const offset = p.phases[0].id === 0 ? p.phases[0].weeks : 0;
  const weeks = [8,16,24,32,40].map(w => w + offset).filter(w => w < p.total).concat([p.total]);
  const done = EC.get('checkpoints', {}), wk = EC.weekNow(p, s);
  return weeks.map(w => ({ week: w, final: w === p.total, done: done[w] || null, due: wk >= w && !done[w] }));
};
// Prova pendente mais recente (só depois de a prova de nível existir). As anteriores não feitas ficam como puladas.
EC.checkpointDue = function(){
  if (!EC.get('level', null)) return null;
  const due = EC.checkpointList().filter(c => c.due);
  return due.length ? due[due.length - 1] : null;
};

// ---------- Sugestão de ajuste do plano: só sugere, quem decide é o aluno ----------
EC.localISO = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
EC.scoreTrend = function(){
  const adj = EC.get('planAdjust', {});
  const ss = EC.get('sessions', []).filter(x => typeof x.avgScore === 'number' && (!adj.date || x.date > adj.date));
  if (ss.length < 6) return null;                        // poucos dados: não sugere nada
  const avg = a => a.reduce((t,x) => t + x.avgScore, 0) / a.length;
  return { n: ss.length, recent: +avg(ss.slice(-3)).toFixed(1), prev: +avg(ss.slice(-6,-3)).toFixed(1), last: ss.slice(-6).map(x => x.avgScore) };
};
EC.planSuggestion = function(){
  const adj = EC.get('planAdjust', {});
  if (adj.lastAt && Date.now() - adj.lastAt < 14*864e5) return null;   // no máximo uma sugestão a cada 14 dias
  const t = EC.scoreTrend(); if (!t) return null;
  if (t.recent >= 7.5 && t.recent >= t.prev - 0.3) return { kind:'faster', ...t };
  if (t.recent <= 5 || t.recent <= t.prev - 1.5) return { kind:'slower', ...t };
  return null;
};
EC.shiftPlan = function(days){
  const cur = EC.get('settings', {}), base = cur.planStart ? new Date(cur.planStart + 'T00:00') : new Date();
  base.setDate(base.getDate() + days);
  EC.set('settings', { ...cur, planStart: EC.localISO(base) });
};
EC.answerSuggestion = function(sg, accepted){
  const prev = EC.get('planAdjust', {});
  EC.set('planAdjust', { lastAt: Date.now(), date: EC.today(), accepted, kind: sg.kind, undoDays: accepted ? (sg.kind === 'faster' ? 7 : -7) : 0, log: [...(prev.log || []), { date: EC.today(), kind: sg.kind, accepted }] });
  if (accepted) EC.shiftPlan(sg.kind === 'faster' ? -7 : 7);
};

// ---------- Avisos (funcionam com a página aberta; push real exige servidor e HTTPS) ----------
EC.inQuiet = function(q, d){ const m = d.getHours()*60+d.getMinutes(), f = q.from.split(':'), t = q.to.split(':'); const a = +f[0]*60+ +f[1], b = +t[0]*60+ +t[1]; return a > b ? (m >= a || m < b) : (m >= a && m < b); };
EC.notify = function(title, body){ if (window.Notification && Notification.permission === 'granted') { try { new Notification(title, { body }); } catch {} } };
EC.checkReminders = function(){
  const s = EC.settings(), now = new Date(), fired = EC.get('fired', {}), today = EC.today();
  if (EC.inQuiet(s.quiet, now)) return;
  for (const p of s.pauses || []) if (today >= p.from && today <= p.to) return;
  const type = EC.TYPES[[1,3,5].indexOf(now.getDay())] || 'Conversation';
  const fire = (key, t, b) => { if (!fired[key]) { fired[key] = 1; EC.notify(t, b); } };
  const mins = (hhmm) => { const [h,m] = hhmm.split(':').map(Number); return h*60+m; };
  const nowM = now.getHours()*60 + now.getMinutes();
  const t = s.classes[now.getDay()];
  if (t) for (const l of s.leads) if (nowM === mins(t) - l) fire(today+'a'+l, 'Ask Emma', `In ${l} min: ${type}, 25 minutes.`);
  if (t && s.second.on && nowM === mins(t) + s.second.hours*60 && !EC.get('sessions', []).some(x => x.date === today)) fire(today+'b', 'Ask Emma', "You haven't started today's lesson yet. Shall we do it now?");
  if ((s.listen.days || []).includes(now.getDay()) && nowM === mins(s.listen.time)) fire(today+'l', 'Ask Emma', 'Today is a free-listening day (20 min).');
  if (s.write.day === now.getDay() && nowM === mins(s.write.time)) fire(today+'w', 'Ask Emma', "Time for this week's writing task.");
  if (now.getDay() === 0 && nowM === 20*60) fire(today+'s', 'Ask Emma', 'Weekly summary: check your plan.');
  EC.set('fired', fired);
};
setInterval(EC.checkReminders, 30000);
EC.zoom();


// ---------- Login (Supabase Auth via REST, sem biblioteca) ----------
EC.cfg = window.EC_CONFIG || {};
EC.authOn = !!(EC.cfg.url && EC.cfg.anonKey);          // sem configuração: modo local, sem login
EC.session = () => EC.get('auth', null);
EC.authMsg = d => {
  const m = String(d.error_description || d.msg || d.message || d.error || 'Something went wrong. Please try again.');
  if (/invalid login/i.test(m)) return 'Wrong email or password.';
  if (/not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox.';
  if (/already registered|already been registered/i.test(m)) return 'There is already an account with this email. Try signing in.';
  if (/password.*(short|least|characters)/i.test(m)) return 'Use at least 8 characters for your password.';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Too many attempts. Please wait a minute and try again.';
  if (/same password|different from the old/i.test(m)) return 'Choose a password different from the old one.';
  return m;
};
EC.authFetch = async (path, opts = {}) => {
  let r;
  try { r = await fetch(EC.cfg.url.replace(/\/$/, '') + '/auth/v1' + path, { ...opts, headers: { apikey: EC.cfg.anonKey, 'Content-Type': 'application/json', ...(opts.headers || {}) } }); }
  catch { throw new Error('Could not reach the sign-in service. Check your internet connection.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(EC.authMsg(d));
  return d;
};
EC.setSession = d => {
  const s = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: d.user ? { id: d.user.id, email: d.user.email } : (EC.session()?.user || null) };
  EC.set('auth', s); return s;
};
EC.signIn = async (email, password) => EC.setSession(await EC.authFetch('/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }));
EC.loginUrl = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'login.html';
EC.signUp = async (email, password) => {
  const d = await EC.authFetch('/signup?redirect_to=' + encodeURIComponent(EC.loginUrl()), { method: 'POST', body: JSON.stringify({ email, password }) });
  if (d.access_token) { EC.setSession(d); return { signedIn: true }; }
  return { signedIn: false };
};
EC.recover = email => EC.authFetch('/recover?redirect_to=' + encodeURIComponent(EC.loginUrl()), { method: 'POST', body: JSON.stringify({ email }) });
EC.updatePassword = async password => {
  const s = EC.session(); if (!s) throw new Error('Your link has expired. Please request a new one.');
  await EC.authFetch('/user', { method: 'PUT', headers: { Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify({ password }) });
};
// Devolve um token válido (renova se estiver para vencer); sem sessão, devolve null
EC.token = async () => {
  if (!EC.authOn) return null;
  const s = EC.session(); if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  try { return EC.setSession(await EC.authFetch('/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh_token }) })).access_token; }
  catch { EC.set('auth', null); if (!/login\.html$/.test(location.pathname)) location.replace('login.html'); return null; }
};
EC.signOut = async () => {
  const s = EC.session();
  try { if (s) await EC.authFetch('/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token } }); } catch {}
  EC.set('auth', null); location.href = 'login.html';
};
// Guarda: com o Supabase configurado, só entra quem estiver logado
if (EC.authOn && !/login\.html$/.test(location.pathname) && !EC.session()) location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html'));


// ---------- Backup do progresso ----------
EC.backupKeys = () => Object.keys(localStorage).filter(k => k.startsWith('ec_') && !['ec_auth', 'ec_pw', 'ec_lastBackup'].includes(k));
EC.backupData = () => { const keys = {}; EC.backupKeys().forEach(k => { keys[k] = localStorage.getItem(k); }); return { app: 'english-course', version: 1, date: new Date().toISOString(), keys }; };
EC.backupRestore = obj => {
  if (!obj || obj.app !== 'english-course' || typeof obj.keys !== 'object') throw new Error('This file is not an Ask Emma backup.');
  EC.backupKeys().forEach(k => localStorage.removeItem(k));
  Object.entries(obj.keys).forEach(([k, v]) => { if (/^ec_[\w-]+$/.test(k) && !['ec_auth', 'ec_pw'].includes(k) && typeof v === 'string') localStorage.setItem(k, v); });
  return Object.keys(obj.keys).length;
};

// ---------- Gasto estimado com a IA (preços por milhão de tokens; são estimativas) ----------
EC.PRICES = { haiku: { in: 1, out: 5 }, sonnet: { in: 3, out: 15 } };
EC.costOf = (model, v) => { const p = /haiku/.test(model) ? EC.PRICES.haiku : EC.PRICES.sonnet; return ((v.input || 0) * p.in + (v.output || 0) * p.out) / 1e6; };
EC.totalSpent = u => { let t = 0, calls = 0; Object.values(u || {}).forEach(m => Object.entries(m).forEach(([model, v]) => { t += EC.costOf(model, v); calls += v.calls || 0; })); return { usd: t, calls }; };

// ---------- Feedback do aluno sobre a qualidade da IA ----------
// Pede no momento certo: nas 3 primeiras vezes de cada tipo e depois no máximo a cada 28 dias.
EC.feedbackDue = kind => {
  const l = EC.get('aiFeedback', []).filter(x => x.kind === kind);
  if (l.length < 3) return true;
  const last = l[l.length - 1].date; return (Date.now() - new Date(last).getTime()) / 864e5 >= 28;
};
EC.askFeedback = (el, kind, label, ctx) => {
  if (!el || !EC.feedbackDue(kind)) return;
  const opts = [['fair', 'Fair and useful'], ['harsh', 'Too harsh'], ['generous', 'Too generous'], ['wrong', 'Something looked wrong']];
  el.innerHTML = `<div class="card" style="margin:14px 0"><b>Quick check</b><p style="margin:6px 0 10px">${EC.esc(label)}</p><div class="row" id="fbOpts">${opts.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('')}</div><div id="fbNote" hidden><label for="fbText" style="margin-top:10px">What was it? (optional)</label><input type="text" id="fbText" style="width:100%"><p style="margin-top:10px"><button class="primary" id="fbSave">Save feedback</button></p></div><p class="hint" id="fbDone" role="status"></p></div>`;
  let pick = null;
  const done = msg => { el.querySelector('#fbNote').hidden = true; el.querySelector('#fbOpts').hidden = true; el.querySelector('#fbDone').textContent = msg; };
  const save = note => { const l = EC.get('aiFeedback', []); l.push({ kind, date: new Date().toISOString(), v: pick, note: note || '', ctx: ctx || '' }); EC.set('aiFeedback', l); done('Thank you. Your feedback was saved in Settings, so we can improve Emma.'); };
  el.querySelectorAll('#fbOpts button').forEach(b => b.onclick = () => {
    pick = b.dataset.v;
    if (pick === 'fair') return save('');
    el.querySelector('#fbNote').hidden = false; el.querySelector('#fbText').focus();
  });
  el.querySelector('#fbSave').onclick = () => save(el.querySelector('#fbText').value.trim());
};


// ---------- Versão do app, aviso de versão nova e rodapé ----------
// Para lançar uma versão nova: mude EC.VERSION aqui e "version" em docs/version.json, para o mesmo número.
EC.VERSION = '1.5.3';
try { localStorage.setItem('ecasset', EC.VERSION); } catch {}   // as páginas carregam os arquivos com este número (veja __L nos .html)
EC.footerHtml = () => `Made with <span aria-label="love" role="img">❤️</span> for Mary<span class="ecver"> · v${EC.VERSION}</span>`;
EC.checkUpdate = async () => {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const v = (await r.json()).version;
    if (!v || v === EC.VERSION || document.getElementById('ecupd')) return;
    if (sessionStorage.getItem('ec_updLater') === v) return;
    const b = document.createElement('div'); b.id = 'ecupd'; b.setAttribute('role', 'status');
    b.innerHTML = `<span>A new version of Ask Emma is available (v${EC.esc(v)}; you have v${EC.VERSION}).</span><button type="button" class="primary" id="ecupdGo">Update now</button><button type="button" id="ecupdLater">Later</button>`;
    document.body.appendChild(b);
    b.querySelector('#ecupdGo').onclick = async () => {
      const go = b.querySelector('#ecupdGo'); go.disabled = true; go.textContent = 'Updating…';
      // Baixa de novo os arquivos do app (ignora a cópia guardada no aparelho) e só então recarrega
      const files = ['common.js', 'common.css', 'theme.css', 'config.js', 'version.json', 'index.html', 'login.html', 'plano.html', 'prova.html', 'biblioteca.html', 'escuta.html', 'escrita.html', 'interesses.html', 'ajustes.html'];
      try { await Promise.all(files.map(f => fetch(f, { cache: 'reload' }).catch(() => {}))); } catch {}
      try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch {}
      const u = new URL(location.href); u.searchParams.set('v', v); location.replace(u.toString());
    };
    b.querySelector('#ecupdLater').onclick = () => { try { sessionStorage.setItem('ec_updLater', v); } catch {} b.remove(); };
  } catch {}
};
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('chat')) {              // a tela da aula tem o rodapé dentro do cartão inicial
    const f = document.createElement('footer'); f.className = 'ecfoot'; f.innerHTML = EC.footerHtml(); document.body.appendChild(f);
  }
  document.querySelectorAll('.ecfoot-slot').forEach(e => { e.className = 'ecfoot'; e.innerHTML = EC.footerHtml(); });
  EC.checkUpdate();
  setInterval(EC.checkUpdate, 30 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) EC.checkUpdate(); });
});


// ---------- Backup automático na nuvem (tabela user_data do Supabase, uma linha por conta) ----------
// Grava sozinho, em segundo plano. Um aparelho sem progresso recebe a cópia da nuvem ao entrar.
EC.cloudSkip = ['ec_auth', 'ec_pw', 'ec_lastBackup', 'ec_lesson', 'ec_zoomIdx', 'ec_cloudStamp', 'ec_cloudHash', 'ec_cloudUser', 'ec_cloudErr'];
EC.cloudKeys = () => Object.keys(localStorage).filter(k => k.startsWith('ec_') && !EC.cloudSkip.includes(k));
EC.hasProgress = () => ['ec_interests', 'ec_level', 'ec_sessions', 'ec_errors', 'ec_vocab', 'ec_writings', 'ec_cards', 'ec_checkpoints', 'ec_placement_draft', 'ec_checkpoint_draft'].some(k => { try { const v = localStorage.getItem(k); return !!v && v !== '[]' && v !== '{}' && v !== 'null'; } catch { return false; } });
EC.cloudBlob = () => { const keys = {}; EC.cloudKeys().sort().forEach(k => { keys[k] = localStorage.getItem(k); }); return keys; };
EC.hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return s.length + ':' + h; };
EC.cloudOn = () => !!(EC.authOn && EC.session() && !/login\.html$/.test(location.pathname));
EC.cloudReq = async (path, opts = {}) => {
  const t = await EC.token(); if (!t) throw new Error('not signed in');
  const r = await fetch(EC.cfg.url.replace(/\/$/, '') + '/rest/v1' + path, { ...opts, headers: { apikey: EC.cfg.anonKey, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error('cloud ' + r.status);
  return r.status === 204 ? null : r.json();
};
EC.cloudGet = async full => (await EC.cloudReq('/user_data?select=' + (full ? 'data,updated_at' : 'updated_at') + '&limit=1'))[0] || null;
EC.cloudPush = async force => {
  if (!EC.cloudOn() || EC.cloudBusy) return 'skip';
  EC.cloudBusy = true;
  try {
    const uid = EC.session().user?.id, mine = EC.get('cloudUser', null);
    if (!uid || (mine && mine !== uid)) return 'otheruser';
    if (!EC.hasProgress()) return 'empty';
    const keys = EC.cloudBlob(), h = EC.hash(JSON.stringify(keys));
    if (!force && h === EC.get('cloudHash', null)) return 'same';
    const cur = await EC.cloudGet(false);
    if (cur && !force && cur.updated_at !== EC.get('cloudStamp', null)) { EC.cloudConflictBanner(); return 'conflict'; }
    const rows = await EC.cloudReq('/user_data?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ user_id: uid, data: { version: 1, keys } }) });
    EC.set('cloudStamp', rows[0].updated_at); EC.set('cloudHash', h); EC.set('cloudUser', uid); EC.set('cloudErr', null);
    return 'saved';
  } catch (e) { EC.set('cloudErr', String(e.message || e)); return 'error'; }
  finally { EC.cloudBusy = false; }
};
EC.cloudRestore = async () => {
  const row = await EC.cloudGet(true); if (!row) return false;
  const keys = row.data?.keys || {};
  EC.cloudKeys().forEach(k => localStorage.removeItem(k));
  Object.entries(keys).forEach(([k, v]) => { if (/^ec_[\w-]+$/.test(k) && !EC.cloudSkip.includes(k) && typeof v === 'string') localStorage.setItem(k, v); });
  EC.set('cloudStamp', row.updated_at); EC.set('cloudHash', EC.hash(JSON.stringify(EC.cloudBlob()))); EC.set('cloudUser', EC.session().user?.id || null); EC.set('cloudErr', null);
  return true;
};
EC.cloudConflictBanner = () => {
  if (document.getElementById('ecsync')) return;
  const b = document.createElement('div'); b.id = 'ecsync'; b.setAttribute('role', 'alert');
  b.innerHTML = '<span>Your cloud backup has newer changes from another device.</span><button type="button" class="primary" id="ecsyncCloud">Use the cloud copy</button><button type="button" id="ecsyncHere">Keep this device</button>';
  document.body.appendChild(b);
  b.querySelector('#ecsyncCloud').onclick = async () => { b.querySelector('#ecsyncCloud').disabled = true; try { if (await EC.cloudRestore()) location.reload(); } catch { b.remove(); } };
  b.querySelector('#ecsyncHere').onclick = async () => { await EC.cloudPush(true); b.remove(); };
};
EC.cloudInit = async () => {
  if (!EC.cloudOn()) return;
  try {
    const uid = EC.session().user?.id, mine = EC.get('cloudUser', null);
    if (!uid || (mine && mine !== uid)) return;        // os dados deste aparelho são de outra conta
    const cur = await EC.cloudGet(false);
    if (!cur) { await EC.cloudPush(); return; }
    const dirty = EC.hash(JSON.stringify(EC.cloudBlob())) !== EC.get('cloudHash', null), newer = cur.updated_at !== EC.get('cloudStamp', null);
    if (!EC.hasProgress() || (!dirty && newer)) { if (await EC.cloudRestore()) location.reload(); return; }
    if (newer) EC.cloudConflictBanner(); else await EC.cloudPush();
  } catch (e) { EC.set('cloudErr', String(e.message || e)); }
};
document.addEventListener('DOMContentLoaded', () => {
  if (!EC.cloudOn()) return;
  setTimeout(EC.cloudInit, 800);
  setInterval(() => EC.cloudPush(), 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) EC.cloudPush(); });
});
