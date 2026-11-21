// Funções compartilhadas por todas as páginas (dados guardados neste navegador)
const EC = {
  get(k, d){ try { const v = localStorage.getItem('ec_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem('ec_' + k, JSON.stringify(v)); } catch {} },
  today(){ return new Date().toISOString().slice(0,10); },
  esc(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); },

  async api(path, body, retried){
    const pw = (() => { try { return localStorage.getItem('ec_pw') || ''; } catch { return ''; } })();
    const opts = { headers: { 'x-app-password': pw } };
    if (body) { opts.method = 'POST'; opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const r = await fetch(path, opts);
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && d.auth && !retried) {
      const p = prompt('Senha de acesso ao app:');
      if (p) { try { localStorage.setItem('ec_pw', p); } catch {} return EC.api(path, body, true); }
    }
    if (!r.ok && !d.error && (r.status === 404 || r.status === 405)) throw new Error('Esta função precisa do servidor local: abra o app com iniciar.bat (localhost:3000).');
    if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
    return d;
  },
  evaluate(task, payload){ return EC.api('/api/eval', { task, payload }); },

  nav(active){
    const items = [['index.html','Aula'],['prova.html','Prova de nível'],['plano.html','Plano'],['biblioteca.html','Biblioteca'],['escuta.html','Escuta'],['escrita.html','Escrita'],['interesses.html','Interesses'],['ajustes.html','Ajustes']];
    const n = document.createElement('nav'); n.className = 'ecnav'; n.setAttribute('aria-label','Menu principal');
    n.innerHTML = items.map(([h,t]) => `<a href="${h}" ${h===active?'class="on" aria-current="page"':''}>${t}</a>`).join('');
    document.body.prepend(n);
  },

  // Voz britânica do sistema
  voice(){ const v = speechSynthesis.getVoices(), n = EC.get('settings', {}).voiceName; return (n && v.find(x => x.name === n)) || v.find(x => /en-GB/i.test(x.lang) && /female|sonia|libby|hazel|google uk english female/i.test(x.name)) || v.find(x => /en-GB/i.test(x.lang)) || null; },
  speak(text, rate){
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
      if (!SR) return reject(new Error('Este navegador não tem reconhecimento de voz. Use Chrome ou Edge.'));
      const r = new SR(); r.lang = 'en-GB'; r.interimResults = false; r.maxAlternatives = 1;
      let out = { text:'', confidence:1 };
      r.onresult = e => { out = { text: e.results[0][0].transcript, confidence: e.results[0][0].confidence }; };
      r.onerror = e => { if (e.error !== 'no-speech') reject(new Error('Microfone: ' + e.error)); };
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
  persistentErrors(){
    const by = {};
    for (const e of EC.get('errors', [])) { const k = (e.type || '') + '|' + (e.correction || '').toLowerCase().slice(0, 40); (by[k] = by[k] || { ...e, sessions: new Set() }).sessions.add(e.source); }
    return Object.values(by).filter(x => x.sessions.size >= 3).map(x => ({ original: x.original, correction: x.correction, type: x.type, count: x.sessions.size }));
  },
};
speechSynthesis.onvoiceschanged = () => {};

// Memória para o professor: erros persistentes, expressões recentes e estruturas C1 a provocar (6.2, 6.3, 6.4)
EC.loadC1 = () => fetch('/api/c1').then(r => r.json()).then(l => { EC.set('c1inv', l); return l; }).catch(() => EC.get('c1inv', []));
EC.c1Status = () => { const inv = EC.get('c1inv', []), used = EC.get('c1used', {}); return { inv, used, pct: inv.length ? Math.round(inv.filter(x => used[x]).length / inv.length * 100) : 0 }; };
EC.memoryText = function(){
  const parts = [], pe = EC.persistentErrors();
  if (pe.length) parts.push('Persistent errors (repeat in 3+ sessions): ' + pe.map(e => `"${e.original}" -> "${e.correction}"`).join('; '));
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
EC.DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
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
  { id:0, name:'Fase prévia: chegar ao B2', weeks:28 },
  { id:1, name:'Fase 1: consolidar B2 alto', weeks:16 },
  { id:2, name:'Fase 2: passo ao C1', weeks:16 },
  { id:3, name:'Fase 3: C1 consolidado', weeks:16 },
];
EC.TYPES = ['Conversa ou debate','Escuta intensiva','Role-play e repaso'];
// Calcula o plano a partir do nível e do número de aulas por semana
EC.plan = function(level, settings){
  const s = settings || EC.settings(), n = Object.keys(s.classes).length;
  const lv = (level?.overall || 'B2 alto');
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
  const out = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//English Course//PT'];
  const days = ['SU','MO','TU','WE','TH','FR','SA'];
  const add = (title, day, time, mins) => {
    const d = new Date(); d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
    const [h, m] = time.split(':').map(Number), st = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
    const e = new Date(2000,0,1,h,m + mins), et = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`;
    out.push('BEGIN:VEVENT', `UID:${title.replace(/\W/g,'')}${day}@englishcourse`, `DTSTART:${st}`, `DTEND:${et}`, `RRULE:FREQ=WEEKLY;BYDAY=${days[day]}`, `SUMMARY:${title}`);
    for (const l of s.leads) out.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, `TRIGGER:-PT${l}M`, 'END:VALARM');
    out.push('END:VEVENT');
  };
  Object.entries(s.classes).forEach(([d,t]) => add('English Course: aula (30 min)', +d, t, 30));
  (s.listen.days || []).forEach(d => add('English Course: escuta livre (20 min)', d, s.listen.time, 20));
  add('English Course: tarefa de escrita (30 min)', s.write.day, s.write.time, 30);
  out.push('END:VCALENDAR');
  return out.join('\r\n');
};

// ---------- Avisos (funcionam com a página aberta; push real exige servidor e HTTPS) ----------
EC.inQuiet = function(q, d){ const m = d.getHours()*60+d.getMinutes(), f = q.from.split(':'), t = q.to.split(':'); const a = +f[0]*60+ +f[1], b = +t[0]*60+ +t[1]; return a > b ? (m >= a || m < b) : (m >= a && m < b); };
EC.notify = function(title, body){ if (window.Notification && Notification.permission === 'granted') { try { new Notification(title, { body }); } catch {} } };
EC.checkReminders = function(){
  const s = EC.settings(), now = new Date(), fired = EC.get('fired', {}), today = EC.today();
  if (EC.inQuiet(s.quiet, now)) return;
  for (const p of s.pauses || []) if (today >= p.from && today <= p.to) return;
  const type = EC.TYPES[[1,3,5].indexOf(now.getDay())] || 'Conversa';
  const fire = (key, t, b) => { if (!fired[key]) { fired[key] = 1; EC.notify(t, b); } };
  const mins = (hhmm) => { const [h,m] = hhmm.split(':').map(Number); return h*60+m; };
  const nowM = now.getHours()*60 + now.getMinutes();
  const t = s.classes[now.getDay()];
  if (t) for (const l of s.leads) if (nowM === mins(t) - l) fire(today+'a'+l, 'English Course', `Em ${l} min: ${type}, 30 minutos.`);
  if (t && s.second.on && nowM === mins(t) + s.second.hours*60 && !EC.get('sessions', []).some(x => x.date === today)) fire(today+'b', 'English Course', 'Você ainda não começou a aula de hoje. Quer fazê-la agora?');
  if ((s.listen.days || []).includes(now.getDay()) && nowM === mins(s.listen.time)) fire(today+'l', 'English Course', 'Hoje é dia de escuta livre (20 min).');
  if (s.write.day === now.getDay() && nowM === mins(s.write.time)) fire(today+'w', 'English Course', 'Hora da tarefa de escrita da semana.');
  if (now.getDay() === 0 && nowM === 20*60) fire(today+'s', 'English Course', 'Resumo da semana: confira seu plano.');
  EC.set('fired', fired);
};
setInterval(EC.checkReminders, 30000);
