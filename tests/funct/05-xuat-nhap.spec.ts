import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { D, PRE } from '../../src/env';
import { EXPORT, MSG, UI } from '../../src/ui';
import { full } from '../../src/data';
import { col, readXlsx } from '../../src/excel';
import { expectInOrder, rx } from '../../src/helpers';
import { impRow, impRows, prepareImport } from '../../src/importer';
import { dummyFile } from '../../src/excel';
import { expectToast, waitListShown } from '../../src/pages/common';

const TEMPLATE_COLS = [/^Mã Thuốc/i, /^Tên Thuốc/i, /^Phân loại thuốc/i, /^Đơn vị tính \(Thuốc\)/i, /^Dạng thuốc/i, /^Dạng đóng gói/i,
  /^Hình thức lưu hành/i, /^Số QĐ lưu hành/i, /^Xuất xứ/i, /^DN vật tư đầu vào/i, /^Hoạt chất/i, /^Hàm lượng/i, /^Đơn vị tính hoạt chất/i,
  /^Chất chính/i, /^Nhóm th(?:uỷ|ủy|uy) sản/i, /^Loài th(?:uỷ|ủy|uy) sản/i, /^Dịch bệnh, dịch hại/i, /^Nguồn trích dẫn/i, /^Mô tả/i];

test.describe('FUNCT - Xuất dữ liệu', () => {
  test(T('FUNCT-219'), info('FUNCT-219'), async ({ as }) => {
    const { page, list } = await as('HT');
    const total = await list.total();
    const f = await list.exportFile();
    expect(f.name).toMatch(EXPORT.file);
    await expectToast(page, rx(MSG.exportOk));
    const s = (await readXlsx(f.path))[0];
    expect(s.rows.length, 'Số dòng file khác tổng bản ghi trên lưới').toBe(total);
    expect([...new Set(col(s, /Nguồn dữ liệu/))]).toEqual(['Hệ thống']);
    expect([...new Set(col(s, /Đơn vị tạo dữ liệu/))]).toEqual(['Hệ thống']);
    expect([...new Set(col(s, /Trạng thái/))]).toEqual(['Hoạt động']);
  });

  test(T('FUNCT-220'), info('FUNCT-220'), async ({ as }) => {
    const { list } = await as('DNA');
    const s = (await readXlsx((await list.exportFile()).path))[0];
    const names = col(s, /Tên thuốc/i);
    expect(names).toContain(PRE.dnaName);
    for (const n of [PRE.dnbName, PRE.nh1Name].filter(Boolean)) expect(names, `File DN A không được có ${n}`).not.toContain(n);
    expect(col(s, /Nguồn dữ liệu/).filter((v) => v === 'Hệ thống')).toEqual([]);
  });

  test(T('FUNCT-221'), info('FUNCT-221'), async ({ as }) => {
    const { list } = await as('DNA_NOXUAT');
    await expect(list.exportButton()).toHaveCount(0);
  });

  test(T('FUNCT-222'), info('FUNCT-222'), async ({ as }) => {
    const { list } = await as('HT');
    await list.searchAll('');
    const total = await list.total();
    const s = (await readXlsx((await list.exportFile()).path))[0];
    expect(s.rows.length).toBe(total);
    const names = col(s, /Tên thuốc/i);
    for (const n of [PRE.ht1Name, PRE.dnaName, PRE.nh1Name].filter(Boolean)) expect(names).toContain(n);
  });

  test(T('FUNCT-223'), info('FUNCT-223'), async ({ as }) => {
    const { list } = await as('HT');
    await list.filter('Phân loại thuốc', D.phanLoaiKst);
    await list.search('');
    const s = (await readXlsx((await list.exportFile()).path))[0];
    expect([...new Set(col(s, /Phân loại thuốc/))]).toEqual([D.phanLoaiKst]);
    expect(col(s, /Tên thuốc/i)).toContain(PRE.ht3Name);
  });

  test(T('FUNCT-227'), info('FUNCT-227'), async ({ as, seed }) => {
    const rec = await seed('HT', full());
    const { list } = await as('HT');
    await list.search(rec.ma!);
    const s = (await readXlsx((await list.exportFile()).path))[0];
    const i = col(s, /Mã thuốc/).indexOf(rec.ma!);
    expect(i, 'Không có bản ghi trong file').toBeGreaterThanOrEqual(0);
    const v = (c: RegExp) => col(s, c)[i];
    expect(v(/Tên thuốc/)).toBe(rec.ten);
    expect(v(/Phân loại thuốc/)).toBe(rec.phanLoai);
    expect(v(/^Đơn vị tính$/)).toBe(rec.dvt);
    expect(v(/Dạng thuốc/)).toBe(rec.dangThuoc);
    expect(v(/Dạng đóng gói/)).toBe(rec.dangDongGoi!.join(', '));
    expect(v(/Hình thức lưu hành/)).toBe(rec.hinhThuc);
    expect(v(/Số (QĐ|quyết định)/i)).toBe(rec.soQd);
    expect(v(/Xuất xứ/)).toBe(rec.xuatXu);
    expect(v(/vật tư đầu vào/)).toBe(rec.dnVatTu);
    expect(v(/Nguồn trích dẫn/)).toBe(rec.nguon);
    expect(v(/Mô tả/)).toBe(rec.moTa);
    expect(v(/Nguồn dữ liệu/)).toBe('Hệ thống');
    expect(v(/Trạng thái/)).toBe('Hoạt động');
  });
});

test.describe('FUNCT - Nhập dữ liệu từ Excel', () => {
  test(T('FUNCT-235'), info('FUNCT-235'), async ({ as }) => {
    const { list } = await as('HT');
    const imp = await list.openImport();
    const sheets = (await readXlsx(await imp.downloadTemplate())).map((s) => s.name);
    for (const n of EXPORT.templateSheets) expect(sheets).toContain(n);
  });

  test(T('FUNCT-236'), info('FUNCT-236'), async ({ as }) => {
    const { list } = await as('HT');
    const imp = await list.openImport();
    const s = (await readXlsx(await imp.downloadTemplate())).find((x) => x.name === 'Du_lieu_tai_len');
    expect(s, 'Thiếu sheet Du_lieu_tai_len').toBeTruthy();
    expectInOrder(s!.header, TEMPLATE_COLS, 'Cột sheet Du_lieu_tai_len');
    for (const h of s!.header.filter((x) => /^(Mã Thuốc|Tên Thuốc|Phân loại thuốc|Hình thức lưu hành|Xuất xứ|DN vật tư đầu vào)/i.test(x)))
      expect(h, `Cột bắt buộc "${h}" thiếu (*)`).toMatch(/\(\*\)|\*/);
  });

  test(T('FUNCT-243'), info('FUNCT-243'), async ({ as }) => {
    const { page, list } = await as('HT');
    for (const fname of ['file.xls', 'file.csv']) {
      const imp = await list.openImport();
      await imp.choose(dummyFile(fname));
      if (await imp.checkBtn().isVisible().catch(() => false)) await imp.checkBtn().click();
      await expect(page.getByText(rx(MSG.importType)).first(), fname).toBeVisible();
      await expect(imp.rows()).toHaveCount(0);
      await list.goto();
    }
  });

  test(T('FUNCT-251'), info('FUNCT-251'), async ({ as }) => {
    const a = await as('HT');
    const { imp } = await prepareImport(a, impRows(5), 'TTS_IMP_025.xlsx');
    await imp.check();
    await expect(imp.rows()).toHaveCount(5);
    for (const t of await imp.rowTexts()) expect(t).toMatch(rx(MSG.imp.valid));
    expect(await imp.uploadLabel()).toEqual({ ok: 5, total: 5 });
    await expect(imp.uploadBtn()).toBeEnabled();
  });

  test(T('FUNCT-256'), info('FUNCT-256'), async ({ as }) => {
    const a = await as('DNA');
    const { imp } = await prepareImport(a, [impRow({ 'Mã Thuốc': PRE.dnbCode }), impRow({ 'Mã Thuốc': PRE.dnaCode })], 'TTS_IMP_030.xlsx');
    await imp.check();
    const texts = await imp.rowTexts();
    const rowOf = (c: string) => texts.find((t) => t.includes(c)) || '';
    expect(rowOf(PRE.dnaCode)).toMatch(rx(MSG.imp.exists));
    expect(rowOf(PRE.dnbCode)).not.toMatch(rx(MSG.imp.exists));
  });

  for (const [id, role, src] of [['FUNCT-265', 'HT', /Hệ thống/], ['FUNCT-266', 'DNA', /Doanh nghiệp/]] as const) {
    test(T(id), info(id), async ({ as, track }) => {
      const a = await as(role);
      const rows = impRows(5);
      const { imp } = await prepareImport(a, rows, `${id}.xlsx`);
      await imp.check();
      await imp.uploadBtn().click();
      for (const r of rows) track(role, r['Mã Thuốc']);
      await expectToast(a.page, rx(MSG.importOk(5)));
      expect(await waitListShown(a.page)).toBe(true);
      for (const r of rows.slice(0, 2)) {
        const row = await a.list.mustFind(r['Mã Thuốc']);
        expect(await a.list.isRowActive(row)).toBeTruthy();
        expect(await a.list.cell(row, /Nguồn dữ liệu/)).toMatch(src);
        if (role === 'HT') expect(await a.list.cell(row, /Đơn vị tạo dữ liệu/)).toBe('Hệ thống');
      }
    });
  }
});
