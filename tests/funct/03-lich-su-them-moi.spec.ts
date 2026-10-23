import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { ACCOUNTS, D, PRE } from '../../src/env';
import { LABELS as L, MSG, REQUIRED } from '../../src/ui';
import { code, full, name, required } from '../../src/data';
import { addViaUi, expectFieldError, expectNotSaved, need, openAdd, rx } from '../../src/helpers';
import { addFromSystem, editText } from '../../src/flows';
import { parseVnTime } from '../../src/pages/history';
import { expectToast } from '../../src/pages/common';

const recent = (t: string) => {
  const d = parseVnTime(t);
  expect(d, `Thời gian "${t}" sai định dạng`).not.toBeNull();
  expect(Math.abs(Date.now() - d!.getTime()), 'Thời gian log lệch quá 10 phút').toBeLessThan(10 * 60_000);
};

test.describe('FUNCT - Xem lịch sử thao tác', () => {
  test(T('FUNCT-87'), info('FUNCT-87'), async ({ as, track }) => {
    const c = await openAdd(as, 'HT');
    const rec = await addViaUi(c, track, required({ ma: code('TS_LOG') }));
    const rows = await (await c.a.list.openHistory(rec.ma!)).rows();
    expect(rows.length).toBe(1);
    expect(rows[0].thaoTac).toMatch(/Thêm mới/);
    if (ACCOUNTS.HT.displayName) expect(rows[0].nguoi).toBe(ACCOUNTS.HT.displayName);
    recent(rows[0].thoiGian);
  });

  test(T('FUNCT-88'), info('FUNCT-88'), async ({ as, seed, track }) => {
    const rec = await seed('HT', required());
    const a = await as('HT');
    const newMa = code('TS_LOG'); const newTen = name('Conflor Plus');
    const f = await a.list.openEdit(rec.ma!);
    await f.fillText(L.ma, newMa);
    await f.fillText(L.ten, newTen);
    await f.save();
    await expectToast(a.page, rx(MSG.editOk));
    track('HT', newMa);
    const rows = await (await a.list.openHistory(newMa)).rows();
    const upd = rows.find((r) => /Cập nhật/.test(r.thaoTac));
    expect(upd, 'Không có dòng Cập nhật').toBeTruthy();
    expect(upd!.noiDung).toMatch(new RegExp(`Mã thuốc.*${rec.ma}.*→.*${newMa}`));
    expect(upd!.noiDung).toMatch(new RegExp(`Tên thuốc.*${rec.ten}.*→.*${newTen}`));
  });

  test(T('FUNCT-89'), info('FUNCT-89'), async ({ as, seed }) => {
    const rec = await seed('HT', required());
    const a = await as('HT');
    await editText(a, rec.ma!, L.moTa, 'Lần 1');
    await a.page.waitForTimeout(1100);
    await editText(a, rec.ma!, L.moTa, 'Lần 2');
    const rows = await (await a.list.openHistory(rec.ma!)).rows();
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[rows.length - 1].thaoTac).toMatch(/Thêm mới/);
    const ts = rows.map((r) => parseVnTime(r.thoiGian)!.getTime());
    for (let i = 1; i < ts.length; i++) expect(ts[i - 1]).toBeGreaterThanOrEqual(ts[i]);
  });

  test(T('FUNCT-91'), info('FUNCT-91'), async ({ as, seed, track }) => {
    const rec = await seed('HT', required());
    const dn = await as('DNA');
    await addFromSystem(dn, [rec.ten!], track);
    const rows = await (await dn.list.openHistory(rec.ten!)).rows();
    expect(rows.map((r) => r.thaoTac).join('|')).toMatch(/Thêm mới từ Hệ thống/i);
  });

  test(T('FUNCT-92'), info('FUNCT-92'), async ({ as, seed, track }) => {
    const rec = await seed('HT', required());
    const dn = await as('DNA');
    await addFromSystem(dn, [rec.ten!], track);
    const ht = await as('HT');
    await editText(ht, rec.ma!, L.moTa, 'HT thay đổi');
    await dn.list.goto();
    const p = await dn.list.openFromSystem();
    await p.clearTag();
    await p.search(rec.ten!);
    await p.tick(rec.ten!);
    await p.save();
    const dup = p.dupDialog();
    await expect(dup).toBeVisible();
    await dup.getByText(/Chọn tất cả/).first().click();
    await p.confirmDup();
    await expectToast(dn.page, /thành công/);
    const rows = await (await dn.list.openHistory(rec.ten!)).rows();
    expect(rows.map((r) => r.thaoTac).join('|')).toMatch(/Cập nhật theo Hệ thống/i);
  });
});

test.describe('FUNCT - Lưu popup Thêm mới', () => {
  test(T('FUNCT-95'), info('FUNCT-95'), async ({ as, track }) => {
    const c = await openAdd(as, 'HT');
    const rec = await addViaUi(c, track, full());
    const { list } = c.a;
    await list.search('');
    expect((await list.column(/Mã thuốc/))[0], 'Bản ghi mới không ở đầu lưới').toBe(rec.ma);
    const r = await list.mustFind(rec.ma!);
    expect(await list.cell(r, /Đơn vị tạo dữ liệu/)).toBe('Hệ thống');
    expect(await list.cell(r, /Nguồn dữ liệu/)).toMatch(/Hệ thống/);
    const d = await list.openDetail(rec.ma!);
    const expectVal = async (l: string, v: string) => expect(await d.value(l), l).toBe(v);
    await expectVal(L.ma, rec.ma!); await expectVal(L.ten, rec.ten!); await expectVal(L.phanLoai, rec.phanLoai!);
    await expectVal(L.dvt, rec.dvt!); await expectVal(L.dangThuoc, rec.dangThuoc!); await expectVal(L.dangDongGoi, rec.dangDongGoi!.join(', '));
    await expectVal(L.hinhThuc, rec.hinhThuc!); await expectVal(L.soQd, rec.soQd!); await expectVal(L.xuatXu, rec.xuatXu!);
    await expectVal(L.nguon, rec.nguon!); await expectVal(L.moTa, rec.moTa!);
    const hc = (await d.tableTexts(L.hoatChatTitle)).join('\n');
    for (const t of [D.hoatChat, '800', D.dvHoatChat]) expect(hc).toContain(t);
    const dt = (await d.tableTexts(L.doiTuongTitle)).join('\n');
    for (const t of [D.nhomTs, D.loaiTs, D.dichBenh]) expect(dt).toContain(t);
  });

  test(T('FUNCT-96'), info('FUNCT-96'), async ({ as, track }) => {
    const c = await openAdd(as, 'HT');
    const rec = await addViaUi(c, track, required({ ma: code('TS_MIN') }));
    const r = await c.a.list.mustFind(rec.ma!);
    expect(await c.a.list.isRowActive(r)).toBeTruthy();
    const d = await c.a.list.openDetail(rec.ma!);
    for (const l of [L.dangThuoc, L.nguon, L.moTa]) expect(await d.value(l), `${l} phải trống`).toBe('');
  });

  test(T('FUNCT-97'), info('FUNCT-97'), async ({ as, track }) => {
    const c = await openAdd(as, 'DNA');
    const rec = await addViaUi(c, track, required({ ma: code('TS_DNA') }), 'DNA');
    const r = await c.a.list.mustFind(rec.ma!);
    expect(await c.a.list.cell(r, /Nguồn dữ liệu/)).toMatch(/Doanh nghiệp/);
    if (D.dnaName) {
      const ht = await as('HT');
      const r2 = await ht.list.findAny(rec.ma!, true);
      expect(r2).not.toBeNull();
      expect(await ht.list.cell(r2!, /Đơn vị tạo dữ liệu/)).toBe(D.dnaName);
    }
  });

  test(T('FUNCT-98'), info('FUNCT-98'), async ({ as, track }) => {
    const c = await openAdd(as, 'DNA');
    const rec = await addViaUi(c, track, required({ ma: code('TS_PRIV') }), 'DNA');
    const b = await as('DNB');
    expect(await b.list.find(rec.ma!)).toBeNull();
  });

  test(T('FUNCT-100'), info('FUNCT-100'), async ({ as }) => {
    const { a, f } = await openAdd(as, 'HT');
    await f.save();
    for (const l of REQUIRED) await expectFieldError(f, l, MSG.empty(l));
    await expectNotSaved(a.page, f);
  });

  test(T('FUNCT-104'), info('FUNCT-104'), async ({ as, track }) => {
    need({ DNB_TS_CODE: PRE.dnbCode });
    const c = await openAdd(as, 'DNA');
    const rec = required({ ma: PRE.dnbCode });
    await c.f.fill(rec);
    await c.f.save();
    await expectToast(c.a.page, rx(MSG.addOk));
    track('DNA', rec.ten!); // dọn theo Tên (Mã trùng bản ghi của DN B)
  });

  test(T('FUNCT-105'), info('FUNCT-105'), async ({ as, track }) => {
    const c = await openAdd(as, 'DNA');
    const rec = required({ ma: PRE.ht3Code });
    await c.f.fill(rec);
    await c.f.save();
    await expectToast(c.a.page, rx(MSG.addOk));
    track('DNA', rec.ten!);
  });
});
