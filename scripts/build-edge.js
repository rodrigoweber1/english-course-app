// Gera supabase/functions/api/index.ts juntando prompts.js + edge/handler.ts num arquivo só
// (assim dá para colar no painel do Supabase ou publicar pelo terminal).
// Uso:  node scripts/build-edge.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let prompts = fs.readFileSync(path.join(root, 'prompts.js'), 'utf8').replace(/\nmodule\.exports\s*=[\s\S]*$/, '\n');
const handler = fs.readFileSync(path.join(root, 'edge', 'handler.ts'), 'utf8');
const out = '// @ts-nocheck\n// ARQUIVO GERADO por scripts/build-edge.js a partir de prompts.js e edge/handler.ts. Não edite aqui.\n\n' + prompts + '\n' + handler;
const dir = path.join(root, 'supabase', 'functions', 'api');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.ts'), out);
console.log('Gerado: supabase/functions/api/index.ts (' + Math.round(out.length / 1024) + ' KB)');
