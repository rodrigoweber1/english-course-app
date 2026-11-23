// Gera os ícones do app (logo "E" da Enma) em docs/: favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png
// Uso:  node scripts/make-icons.js   (sem dependências: desenha os pixels e grava o PNG com o zlib do Node)
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const out = path.join(__dirname, '..', 'docs');

// Desenho em um quadrado de 64 x 64: fundo com degradê índigo e um "E" branco feito de barras
const BG1 = [0x63, 0x66, 0xF1], BG2 = [0x37, 0x30, 0xA3];
const E = [[20, 16, 7, 32], [20, 16, 24, 7], [20, 29.5, 19, 6.5], [20, 41, 24, 7]];   // x, y, largura, altura

fs.writeFileSync(path.join(out, 'favicon.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Ask Enma">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366F1"/><stop offset="1" stop-color="#3730A3"/></linearGradient></defs>
  <rect width="64" height="64" rx="18" fill="url(#g)"/>
  <g fill="#fff">${E.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`).join('')}</g>
</svg>
`);

const inRound = (x, y, X, Y, W, H, r) => {
  if (x < X || x > X + W || y < Y || y > Y + H) return false;
  const cx = x < X + r ? X + r : x > X + W - r ? X + W - r : x, cy = y < Y + r ? Y + r : y > Y + H - r ? Y + H - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
function pixel(u, v, radius) {                       // u, v em 0..64 -> [r, g, b, a] (0..1 de cobertura tratada fora)
  if (!inRound(u, v, 0, 0, 64, 64, radius)) return null;
  for (const [x, y, w, h] of E) if (inRound(u, v, x, y, w, h, 1.5)) return [255, 255, 255];
  const t = (u + v) / 128;
  return BG1.map((c, i) => c + (BG2[i] - c) * t);
}
function png(size, radius) {
  const SS = 4, raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = pixel((px + (sx + .5) / SS) / size * 64, (py + (sy + .5) / SS) / size * 64, radius);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4, n = SS * SS;
      raw[o] = a ? Math.round(r / a) : 0; raw[o + 1] = a ? Math.round(g / a) : 0; raw[o + 2] = a ? Math.round(b / a) : 0; raw[o + 3] = Math.round(a / n * 255);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// Aba do navegador: cantos arredondados. Tela inicial dos celulares: quadrado cheio (o sistema arredonda sozinho).
fs.writeFileSync(path.join(out, 'favicon-32.png'), png(32, 18));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), png(180, 0));
fs.writeFileSync(path.join(out, 'icon-192.png'), png(192, 0));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512, 0));
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'Ask Enma', short_name: 'Ask Enma', description: 'Daily English speaking practice with Enma',
  start_url: 'index.html', scope: './', display: 'standalone', background_color: '#EEF2FF', theme_color: '#4F46E5',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }, { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
}, null, 2) + '\n');
console.log('Ícones gerados em docs/');
