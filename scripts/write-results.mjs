// Ghi kết quả chạy Playwright (reports/results.json) vào file Excel test case (bản Review_TDK_Buoc).
// Cột J/K/L = Lần 1/2/3 (ghi vào ô trống đầu tiên), O = Người test, P = Ngày test, Q = Ghi chú (nối thêm lý do Fail/Skip).
// KHÔNG sửa file gốc - lưu ra bản sao *_KetQua_<yyyymmdd>.xlsx
// Cách dùng: npm run results:excel -- "duong/dan/file.xlsx"   (TESTER="Tên" để ghi cột Người test)
import ExcelJS from 'exceljs';
import fs from 'node:fs';

const file = process.argv[2] || process.env.TC_EXCEL;
const resultFile = 'reports/results.json';
if (!file || !fs.existsSync(file) || !fs.existsSync(resultFile)) {
  console.error(`Cần có file Excel và ${resultFile} (chạy "npm test" trước)`); process.exit(1);
}
const SHEETS = ['GUI sau Review', 'FUNCT sau Review', 'Validate '];

const report = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
const results = new Map();
const visit = (suite) => {
  for (const s of suite.suites || []) visit(s);
  for (const spec of suite.specs || []) {
    const m = spec.title.match(/^\[(GUI|FUNCT|VALIDATE)\]\[([^\]]+)\]/);
    if (!m) continue;
    const t = spec.tests?.[0];
    const last = t?.results?.[t.results.length - 1];
    const status = t?.status === 'expected' || t?.status === 'flaky' ? 'Pass' : t?.status === 'skipped' ? 'Untested' : 'Fail';
    const ann = (t?.annotations || []).find((a) => a.type === 'skip' || a.type === 'fixme');
    const err = last?.error?.message?.split('\n').find((l) => l.trim())?.replace(/\u001b\[\d+m/g, '').slice(0, 180);
    results.set(m[2], { status, note: status === 'Fail' ? `Auto: ${err || 'lỗi'}` : status === 'Untested' ? `Auto: ${ann?.description || 'bỏ qua'}` : '' });
  }
};
visit(report);

const txt = (v) => (v && typeof v === 'object' && 'result' in v ? v.result : v);
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const today = new Date();
let written = 0;
for (const sheet of SHEETS) {
  const ws = wb.getWorksheet(sheet) || wb.worksheets.find((w) => w.name.trim() === sheet.trim());
  if (!ws) continue;
  const kind = String(txt(ws.getCell('F2').value) ?? '').trim();
  let n = 0;
  for (let r = 11; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!String(txt(row.getCell('F').value) ?? '').trim()) continue;
    n++;
    const res = results.get(`${kind}-${n}`);
    if (!res) continue;
    const col = ['J', 'K', 'L'].find((c) => !String(row.getCell(c).value ?? '').trim());
    if (!col) { console.warn(`${kind}-${n}: đã đủ 3 lần test, bỏ qua`); continue; }
    row.getCell(col).value = res.status;
    if (process.env.TESTER) row.getCell('O').value = process.env.TESTER;
    row.getCell('P').value = today;
    row.getCell('P').numFmt = 'dd/mm/yyyy';
    if (res.note) {
      const old = String(row.getCell('Q').value ?? '').trim();
      row.getCell('Q').value = old ? `${old}\n${res.note}` : res.note;
    }
    written++;
  }
}
wb.calcProperties = { ...(wb.calcProperties || {}), fullCalcOnLoad: true };
const d = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
const outFile = file.replace(/\.xlsx$/i, `_KetQua_${d}.xlsx`);
await wb.xlsx.writeFile(outFile);
console.log(`Đã ghi ${written} kết quả -> ${outFile}`);
