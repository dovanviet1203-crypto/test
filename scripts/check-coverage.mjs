// Kiểm tra mọi case "Có thể Auto" trong data/testcases.json đều có kịch bản Playwright tương ứng
import fs from 'node:fs';
import path from 'node:path';

const cases = JSON.parse(fs.readFileSync('data/testcases.json', 'utf8'));
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p); else if (p.endsWith('.spec.ts')) files.push(p);
});
walk('tests');
const src = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const found = new Set([...src.matchAll(/['"`]((?:GUI|FUNCT|VALIDATE)-\d+)['"`]/g)].map((m) => m[1]));
const missing = cases.filter((c) => !found.has(c.id));
console.log(`Case "Có thể Auto" trong Excel: ${cases.length}`);
console.log(`Đã có kịch bản:               ${cases.length - missing.length}`);
if (missing.length) { console.log('THIẾU kịch bản cho:', missing.map((c) => c.id).join(', ')); process.exit(1); }
console.log('OK - bao phủ 100% case Auto');
