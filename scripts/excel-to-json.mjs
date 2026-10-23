// Đọc file Excel test case (bản Review_TDK_Buoc) -> data/testcases.json
// Chỉ lấy case có "x" ở cột R "Có thể Auto" của 3 sheet: GUI sau Review, FUNCT sau Review, Validate
// Cách dùng: npm run tc:sync -- "duong/dan/[Web]_Danh_mục_Thuốc_thuỷ_sản_VGREEN2_Review_TDK_Buoc.xlsx"
import ExcelJS from 'exceljs';
import fs from 'node:fs';

const file = process.argv[2] || process.env.TC_EXCEL;
if (!file || !fs.existsSync(file)) { console.error(`Không thấy file Excel: ${file || '(chưa truyền đường dẫn / TC_EXCEL)'}`); process.exit(1); }
export const SHEETS = ['GUI sau Review', 'FUNCT sau Review', 'Validate '];

const txt = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if ('result' in v) return v.result == null ? null : String(v.result);
    if (v.text) return String(v.text);
  }
  const s = String(v).trim();
  return s === '' ? null : s;
};

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const out = [];
for (const sheet of SHEETS) {
  const ws = wb.getWorksheet(sheet) || wb.worksheets.find((w) => w.name.trim() === sheet.trim());
  if (!ws) { console.error(`Thiếu sheet "${sheet}"`); process.exit(1); }
  const kind = txt(ws.getCell('F2').value);
  let n = 0, auto = 0;
  for (let r = 11; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const exp = txt(row.getCell('F').value);
    if (!exp) continue; // dòng tiêu đề nhóm
    n++; // ID = F2 & "-" & (số dòng có Kết quả mong đợi tính từ dòng 11) - giống công thức cột A
    if (!/^x$/i.test(txt(row.getCell('R').value) || '')) continue;
    auto++;
    out.push({
      sheet: ws.name, kind, row: r, id: `${kind}-${n}`,
      name: txt(row.getCell('B').value), pre: txt(row.getCell('C').value), steps: txt(row.getCell('D').value),
      data: txt(row.getCell('E').value), exp, pri: txt(row.getCell('I').value),
    });
  }
  console.log(`${ws.name}: ${n} case, ${auto} case Auto`);
}
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/testcases.json', JSON.stringify(out, null, 1));
console.log(`Đã ghi data/testcases.json (${out.length} case)`);
