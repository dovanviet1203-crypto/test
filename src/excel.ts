import ExcelJS from 'exceljs';
import { test } from '@playwright/test';
import { norm } from './data';

const txt = (v: any): string => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r: any) => r.text).join('');
    if ('result' in v) return v.result == null ? '' : String(v.result);
    if (v.text) return String(v.text);
  }
  return String(v);
};
/** Bỏ dấu (*) và khoảng trắng thừa ở tiêu đề cột */
export const headerKey = (h: string) => norm(h).replace(/\(\s*\*\s*\)|\*/g, '').trim().toLowerCase();

export type Sheet = { name: string; header: string[]; headerRow: number; rows: string[][] };

/** Đọc file xlsx: mỗi sheet trả về dòng tiêu đề (dòng đầu tiên có ô chứa "Mã") và các dòng dữ liệu phía dưới */
export async function readXlsx(file: string): Promise<Sheet[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const out: Sheet[] = [];
  wb.eachSheet((ws: ExcelJS.Worksheet) => {
    let headerRow = 1;
    for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) {
      const vals = (ws.getRow(r).values as any[]).slice(1).map(txt).map(norm);
      // \b không nhận diện chữ có dấu tiếng Việt nên dùng (\s|$) thay cho \b
      if (vals.some((v) => /^Mã(\s|$)/i.test(v))) { headerRow = r; break; }
    }
    const width = ws.getRow(headerRow).cellCount;
    const header = Array.from({ length: width }, (_, i) => norm(txt(ws.getRow(headerRow).getCell(i + 1).value)));
    const rows: string[][] = [];
    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const v = Array.from({ length: width }, (_, i) => norm(txt(ws.getRow(r).getCell(i + 1).value)));
      if (v.some(Boolean)) rows.push(v);
    }
    out.push({ name: ws.name, header, headerRow, rows });
  });
  return out;
}

/** Cột theo tên tiêu đề (bỏ dấu *), không phân biệt hoa thường */
export function col(s: Sheet, name: string | RegExp): string[] {
  const i = s.header.findIndex((h) => (typeof name === 'string' ? headerKey(h) === headerKey(name) : name.test(h)));
  if (i < 0) throw new Error(`Không thấy cột "${name}" trong sheet ${s.name}. Các cột: ${s.header.join(' | ')}`);
  return s.rows.map((r) => r[i]);
}

/** Một dòng dữ liệu nhập: khoá = tên cột trên file mẫu (VD "Mã Thuốc", "Tên Thuốc", "Phân loại thuốc") */
export type ImportRow = Record<string, string>;

/**
 * Tạo file import từ file mẫu tải về ("Xuất dữ liệu mẫu"): ghi các dòng vào sheet Du_lieu_tai_len
 * ngay dưới dòng tiêu đề (xoá dữ liệu ví dụ có sẵn). Trả về đường dẫn file mới.
 */
export async function buildImport(template: string, rows: ImportRow[], fileName: string): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(template);
  const ws = wb.getWorksheet('Du_lieu_tai_len') || wb.worksheets[0];
  let headerRow = 1;
  for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) {
    const vals = (ws.getRow(r).values as any[]).slice(1).map(txt).map(norm);
    if (vals.some((v) => /^Mã\b/i.test(v))) { headerRow = r; break; }
  }
  const hdr = ws.getRow(headerRow);
  const idx = new Map<string, number>();
  hdr.eachCell((c: ExcelJS.Cell, n: number) => idx.set(headerKey(txt(c.value)), n));
  for (let r = ws.rowCount; r > headerRow; r--) ws.spliceRows(r, 1);
  rows.forEach((row, k) => {
    const target = ws.getRow(headerRow + 1 + k);
    for (const [key, val] of Object.entries(row)) {
      const n = idx.get(headerKey(key)) ?? [...idx.entries()].find(([h]) => h.startsWith(headerKey(key)))?.[1];
      if (!n) throw new Error(`File mẫu không có cột "${key}". Các cột: ${[...idx.keys()].join(' | ')}`);
      target.getCell(n).value = val;
    }
    target.commit();
  });
  const out = test.info().outputPath(fileName);
  await wb.xlsx.writeFile(out);
  return out;
}

/** Tạo file "rác" để kiểm tra định dạng (file.xls, file.csv, file.pdf...) */
export function dummyFile(name: string, content = 'Ma,Ten\nA,B\n'): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('node:fs') as typeof import('node:fs');
  const p = test.info().outputPath(name);
  fs.writeFileSync(p, content);
  return p;
}

/** Ảnh JPG 1x1 hợp lệ */
export function tinyJpg(name = 'anh.jpg'): string {
  const fs = require('node:fs') as typeof import('node:fs');
  const b64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const p = test.info().outputPath(name);
  fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  return p;
}
