import { Actor } from './fixtures';
import { D } from './env';
import { buildImport, ImportRow } from './excel';
import { ImportPage } from './pages/importPage';
import { code, name } from './data';

/** 1 dòng import hợp lệ (7 trường bắt buộc) theo tên cột của file mẫu */
export function impRow(over: ImportRow = {}): ImportRow {
  const ma = code('TS_IMP');
  return {
    'Mã Thuốc': ma, 'Tên Thuốc': name('Thuốc IMP'), 'Phân loại thuốc': D.phanLoai, 'Đơn vị tính (Thuốc)': D.dvt,
    'Hình thức lưu hành': D.hinhThuc, 'Xuất xứ': D.xuatXu, 'DN vật tư đầu vào': D.dnVatTu,
    ...over,
  };
}
export const impRows = (n: number) => Array.from({ length: n }, () => impRow());

/** Mở màn Nhập dữ liệu, tải file mẫu, tạo file từ các dòng truyền vào và chọn file đó */
export async function prepareImport(a: Actor, rows: ImportRow[], fileName: string): Promise<{ imp: ImportPage; file: string }> {
  const imp = await a.list.openImport();
  const tpl = await imp.downloadTemplate();
  const file = await buildImport(tpl, rows, fileName);
  await imp.choose(file);
  return { imp, file };
}
