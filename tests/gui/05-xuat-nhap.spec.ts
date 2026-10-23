import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { EXPORT, MSG, TITLES } from '../../src/ui';
import { readXlsx } from '../../src/excel';
import { expectInOrder, expectToastTopRightAutoClose, rx } from '../../src/helpers';
import { impRow, impRows, prepareImport } from '../../src/importer';
import { vn } from '../../src/pages/common';

const COLS_HT = ['STT', 'Mã thuốc', 'Tên thuốc', 'Phân loại thuốc', 'Đơn vị tính', 'Dạng thuốc', 'Dạng đóng gói', 'Hình thức lưu hành',
  /Số (QĐ|quyết định) lưu hành/i, 'Xuất xứ', /(DN|Doanh nghiệp) vật tư đầu vào/i, 'Hoạt chất', 'Đối tượng phòng trừ', 'Nguồn trích dẫn', 'Mô tả',
  'Đơn vị tạo dữ liệu', 'Nguồn dữ liệu', 'Đơn vị kế thừa', 'Trạng thái'];

test.describe('GUI - Thông báo / file Xuất dữ liệu, màn Nhập dữ liệu', () => {
  test(T('GUI-129'), info('GUI-129'), async ({ as }) => {
    const { page, list } = await as('HT');
    await list.exportFile();
    await expectToastTopRightAutoClose(page, MSG.exportOk);
  });

  test(T('GUI-131'), info('GUI-131'), async ({ as }) => {
    const ht = await as('HT');
    const f1 = await ht.list.exportFile();
    expect(f1.name).toMatch(EXPORT.file);
    const s1 = await readXlsx(f1.path);
    const dn = await as('DNA');
    const f2 = await dn.list.exportFile();
    expect(f2.name).toMatch(EXPORT.file);
    const s2 = await readXlsx(f2.path);
    test.info().annotations.push({ type: 'Sheet', description: `Admin HT: ${s1.map((s) => s.name).join(', ')} | Admin DN: ${s2.map((s) => s.name).join(', ')}` });
    // Sheet Admin HT có cột Đơn vị tạo dữ liệu, sheet Admin DN thì không
    expect(s1[0].header.some((h) => /Đơn vị tạo dữ liệu/.test(h))).toBeTruthy();
    expect(s2[0].header.some((h) => /Đơn vị tạo dữ liệu/.test(h))).toBeFalsy();
  });

  test(T('GUI-132'), info('GUI-132'), async ({ as }) => {
    const { list } = await as('HT');
    const s = (await readXlsx((await list.exportFile()).path))[0];
    expectInOrder(s.header, COLS_HT, 'Cột file xuất (Admin HT)');
  });

  test(T('GUI-133'), info('GUI-133'), async ({ as }) => {
    const { list } = await as('DNA');
    const s = (await readXlsx((await list.exportFile()).path))[0];
    expect(s.header.filter((h) => /Đơn vị tạo dữ liệu|Đơn vị kế thừa/.test(h))).toEqual([]);
    expectInOrder(s.header, COLS_HT.filter((c) => !['Đơn vị tạo dữ liệu', 'Đơn vị kế thừa'].includes(c as string)), 'Cột file xuất (Admin DN)');
  });

  test(T('GUI-136'), info('GUI-136'), async ({ as }) => {
    const { page, list } = await as('HT');
    const imp = await list.openImport();
    await expect(page.getByText(vn(TITLES.importPage)).first()).toBeVisible();
    // Breadcrumb: ... > Thêm Thuốc thuỷ sản từ Excel (mục cha là Danh mục Thuốc thuỷ sản)
    await expect(page.getByText(/Danh mục Thuốc th(?:uỷ|ủy|uy) sản/).first()).toBeVisible();
    await expect(imp.templateLink()).toBeVisible();
    await expect(page.getByText(/B1|Bước 1/).first()).toBeVisible();
    await expect(page.getByText(/B2|Bước 2/).first()).toBeVisible();
    await expect(page.getByText(/dung lượng|MB/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^\s*Nhập dữ liệu\s*$/ }).first()).toBeVisible();
    for (const b of [imp.checkBtn(), imp.cancelBtn(), imp.uploadBtn()]) await expect(b).toBeHidden();
  });

  test(T('GUI-137'), info('GUI-137'), async ({ as }) => {
    const a = await as('HT');
    const { imp } = await prepareImport(a, impRows(5), 'TTS_IMP_002.xlsx');
    await expect(a.page.getByText('TTS_IMP_002.xlsx').first()).toBeVisible();
    await expect(imp.checkBtn()).toBeVisible();
    await expect(imp.cancelBtn()).toBeVisible();
    await expect(imp.uploadBtn()).toBeDisabled();
  });

  test(T('GUI-139'), info('GUI-139'), async ({ as }) => {
    const a = await as('HT');
    const rows = [...impRows(7), ...Array.from({ length: 5 }, () => impRow({ 'Mã Thuốc': '' }))];
    const { imp } = await prepareImport(a, rows, 'TTS_IMP_004.xlsx');
    await imp.check();
    expectInOrder(await imp.headers(), [/Mã thuốc/i, /Tên thuốc/i, /Phân loại thuốc/i, /Đơn vị tính/i], 'Cột bảng import');
    const texts = await imp.rowTexts();
    expect(texts.length).toBe(12);
    for (let i = 0; i < 5; i++) expect(texts[i], `Dòng lỗi phải đưa lên đầu (dòng ${i + 1})`).toMatch(rx(MSG.imp.required));
    expect(texts.slice(5).join('\n')).not.toMatch(rx(MSG.imp.required));
    expect(texts[5]).toMatch(rx(MSG.imp.valid));
    expect(await imp.uploadLabel()).toEqual({ ok: 7, total: 12 });
  });

  test(T('GUI-142'), info('GUI-142'), async ({ as }) => {
    const a = await as('HT');
    const rows = impRows(4);
    rows.splice(2, 0, impRow({ 'Mã Thuốc': '' }));
    const { imp } = await prepareImport(a, rows, 'TTS_IMP_007.xlsx');
    await imp.check();
    await expect(imp.uploadBtn()).toBeDisabled();
    const errIdx = (await imp.rowTexts()).findIndex((t) => rx(MSG.imp.required).test(t));
    expect(errIdx).toBeGreaterThanOrEqual(0);
    await imp.deleteRow(errIdx);
    await expect(imp.uploadBtn()).toBeEnabled();
    const lb = await imp.uploadLabel();
    expect(lb && lb.ok === lb.total, `Label sau khi xoá dòng lỗi: ${JSON.stringify(lb)}`).toBeTruthy();
  });
});
