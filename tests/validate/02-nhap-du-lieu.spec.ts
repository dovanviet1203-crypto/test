import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { D } from '../../src/env';
import { MSG } from '../../src/ui';
import { RUN, name } from '../../src/data';
import { rx } from '../../src/helpers';
import { impRow, prepareImport } from '../../src/importer';
import { ImportRow } from '../../src/excel';

/** Văn bản dòng import chứa mã / giá trị đánh dấu */
const rowWith = (texts: string[], mark: string) => texts.find((t) => t.includes(mark)) || '';
const ERR = new RegExp([MSG.imp.required, MSG.imp.notExist, MSG.imp.exists, MSG.imp.dupFile].map((m) => rx(m).source).join('|'));

test.describe('VALIDATE - Nhập dữ liệu từ Excel', () => {
  test(T('VALIDATE-88'), info('VALIDATE-88'), async ({ as }) => {
    const a = await as('HT');
    const ma = `TS-IMP_01.A${RUN}`;
    const { imp } = await prepareImport(a, [impRow({ 'Mã Thuốc': ma })], 'TTS_IMP_046.xlsx');
    await imp.check();
    const t = rowWith(await imp.rowTexts(), ma);
    expect(t).toMatch(rx(MSG.imp.valid));
    expect(t).not.toMatch(ERR);
  });

  test(T('VALIDATE-89'), info('VALIDATE-89'), async ({ as }) => {
    const a = await as('HT');
    const { imp } = await prepareImport(a, [impRow({ 'Mã Thuốc': '' })], 'TTS_IMP_047.xlsx');
    await imp.check();
    expect((await imp.rowTexts())[0]).toMatch(rx(MSG.imp.required));
    await expect(imp.uploadBtn()).toBeDisabled();
  });

  test(T('VALIDATE-97'), info('VALIDATE-97'), async ({ as }) => {
    const a = await as('HT');
    const r1 = impRow({ 'Phân loại thuốc': '' }); const r2 = impRow({ 'Phân loại thuốc': 'ABC không tồn tại' });
    const { imp } = await prepareImport(a, [r1, r2], 'TTS_IMP_055.xlsx');
    await imp.check();
    const texts = await imp.rowTexts();
    expect(rowWith(texts, r1['Mã Thuốc'])).toMatch(rx(MSG.imp.required));
    expect(rowWith(texts, r2['Mã Thuốc'])).toMatch(rx(MSG.imp.notExist));
  });

  test(T('VALIDATE-102'), info('VALIDATE-102'), async ({ as }) => {
    const a = await as('HT');
    const r1 = impRow({ 'Dạng đóng gói': D.dangDongGoi.slice(0, 2).join(', ') });
    const r2 = impRow({ 'Dạng đóng gói': `${D.dangDongGoi[0]}, Thùng XYZ` });
    const { imp } = await prepareImport(a, [r1, r2], 'TTS_IMP_060.xlsx');
    await imp.check();
    const texts = await imp.rowTexts();
    expect(rowWith(texts, r1['Mã Thuốc'])).not.toMatch(ERR);
    expect(rowWith(texts, r2['Mã Thuốc'])).toMatch(rx(MSG.imp.notExist));
  });

  test(T('VALIDATE-103'), info('VALIDATE-103'), async ({ as }) => {
    const a = await as('HT');
    const base = impRow({ 'Tên Thuốc': name('Thuốc IMP 2HC') });
    const rows = [
      { ...base, 'Hoạt chất': D.hoatChat, 'Hàm lượng': '10', 'Đơn vị tính hoạt chất': D.dvHoatChat, 'Chất chính': 'x' },
      { ...base, 'Hoạt chất': D.hoatChat2, 'Hàm lượng': '5', 'Đơn vị tính hoạt chất': D.dvHoatChat },
    ];
    const { imp } = await prepareImport(a, rows, 'TTS_IMP_061.xlsx');
    await imp.check();
    for (const t of await imp.rowTexts()) expect(t).not.toMatch(ERR);
    await expect(imp.uploadBtn()).toBeEnabled();
  });

  test(T('VALIDATE-104'), info('VALIDATE-104'), async ({ as }) => {
    const a = await as('HT');
    const base: ImportRow = { ...impRow(), 'Hoạt chất': D.hoatChat, 'Hàm lượng': '10', 'Đơn vị tính hoạt chất': D.dvHoatChat, 'Chất chính': 'x' };
    const { imp } = await prepareImport(a, [base, { ...base }], 'TTS_IMP_062.xlsx');
    await imp.check();
    const texts = (await imp.rowTexts()).filter((t) => t.includes(base['Mã Thuốc']));
    expect(texts.length).toBe(2);
    for (const t of texts) expect(t).toMatch(rx(MSG.imp.dupFile));
  });
});
