import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { D } from '../../src/env';
import { LABELS as L, MSG } from '../../src/ui';
import { RUN, ThuocRecord, required } from '../../src/data';
import { expectFieldError, expectNotSaved, openAdd, rx } from '../../src/helpers';
import { dummyFile, tinyJpg } from '../../src/excel';
import { expectToast } from '../../src/pages/common';

/** Nhập 7 trường bắt buộc (ghi đè theo case) rồi nhấn Lưu */
async function addWith(as: any, over: Partial<ThuocRecord>, before?: (c: Awaited<ReturnType<typeof openAdd>>) => Promise<void>) {
  const c = await openAdd(as, 'HT');
  const rec = required(over);
  if (before) await before(c);
  await c.f.fill(rec);
  await c.f.save();
  return { ...c, rec };
}

test.describe('VALIDATE - Popup Thêm mới: trường hợp lưu thành công', () => {
  const OK: [string, Partial<ThuocRecord>, string?, string?][] = [
    ['VALIDATE-3', { ma: `TS_REG-02.A9_${RUN}` }],
    ['VALIDATE-12', { ten: 'R' }],
    ['VALIDATE-19', { phanLoai: D.phanLoai2 }, L.phanLoai, D.phanLoai2],
    ['VALIDATE-22', { dvt: D.dvt2 }, L.dvt, D.dvt2],
    ['VALIDATE-28', { dangDongGoi: D.dangDongGoi.slice(0, 2) }, L.dangDongGoi, D.dangDongGoi.slice(0, 2).join(', ')],
    ['VALIDATE-30', {}, L.dangThuoc, ''],
    ['VALIDATE-31', { hinhThuc: D.hinhThuc2 }, L.hinhThuc, D.hinhThuc2],
    ['VALIDATE-39', { xuatXu: D.xuatXu2 }, L.xuatXu, D.xuatXu2],
    ['VALIDATE-42', { dnVatTu: D.dnVatTu2 }],
  ];
  for (const [id, over, label, value] of OK) {
    test(T(id), info(id), async ({ as, track }) => {
      const { a, f, rec } = await addWith(as, over);
      await expectToast(a.page, rx(MSG.addOk));
      await expect(f.dialog).toBeHidden();
      track('HT', rec.ma!);
      if (label !== undefined) {
        const d = await a.list.openDetail(rec.ma!);
        expect(await d.value(label), label).toBe(value);
        if (id === 'VALIDATE-30') expect(await d.value(L.dangDongGoi)).toBe('');
      }
    });
  }

  test(T('VALIDATE-53'), info('VALIDATE-53'), async ({ as, track }) => {
    const { a, rec } = await addWith(as, { hinhAnh: [tinyJpg()] });
    await expectToast(a.page, rx(MSG.addOk));
    track('HT', rec.ma!);
    const d = await a.list.openDetail(rec.ma!);
    await expect(d.images().first()).toBeVisible();
  });

  test(T('VALIDATE-58'), info('VALIDATE-58'), async ({ as, track }) => {
    const c = await openAdd(as, 'HT');
    expect(await c.f.isActive(), 'Checkbox Hoạt động phải tích mặc định').toBeTruthy();
    const rec = required();
    await c.f.fill(rec);
    await c.f.save();
    await expectToast(c.a.page, rx(MSG.addOk));
    track('HT', rec.ma!);
    expect(await c.a.list.isRowActive(await c.a.list.mustFind(rec.ma!))).toBeTruthy();
  });
});

test.describe('VALIDATE - Popup Thêm mới: bỏ trống trường bắt buộc', () => {
  const EMPTY: [string, Partial<ThuocRecord>, string][] = [
    ['VALIDATE-5', { ma: '' }, L.ma],
    ['VALIDATE-16', { ten: '' }, L.ten],
    ['VALIDATE-21', { phanLoai: undefined }, L.phanLoai],
    ['VALIDATE-24', { dvt: undefined }, L.dvt],
    ['VALIDATE-38', { hinhThuc: undefined }, L.hinhThuc],
    ['VALIDATE-41', { xuatXu: undefined }, L.xuatXu],
    ['VALIDATE-46', { dnVatTu: undefined }, L.dnVatTu],
  ];
  for (const [id, over, label] of EMPTY) {
    test(T(id), info(id), async ({ as }) => {
      const { a, f } = await addWith(as, over);
      await expectFieldError(f, label, MSG.empty(label));
      await expectNotSaved(a.page, f);
    });
  }

  test(T('VALIDATE-56'), info('VALIDATE-56'), async ({ as }) => {
    const { a, f } = await openAdd(as, 'HT');
    for (const n of ['tai_lieu.pdf', 'chuong_trinh.exe']) {
      await f.upload([dummyFile(n, 'x')]);
      await expect(a.page.getByText(rx(MSG.fileType)).first(), n).toBeVisible();
    }
    await expect(f.dialog.locator('img')).toHaveCount(0);
  });
});

test.describe('VALIDATE - Hoạt chất và Đối tượng phòng trừ', () => {
  test(T('VALIDATE-60'), info('VALIDATE-60'), async ({ as, track }) => {
    const { a, rec } = await addWith(as, { hoatChat: [{ ten: D.hoatChat, hamLuong: '800', donVi: D.dvHoatChat, chinh: true }] });
    await expectToast(a.page, rx(MSG.addOk));
    track('HT', rec.ma!);
    const r = await a.list.mustFind(rec.ma!);
    expect(await a.list.cell(r, /^Hoạt chất$/)).toBe(D.hoatChat);
    const d = await a.list.openDetail(rec.ma!);
    const t = (await d.tableTexts(L.hoatChatTitle)).join('\n');
    for (const s of [D.hoatChat, '800', D.dvHoatChat]) expect(t).toContain(s);
  });

  test(T('VALIDATE-69'), info('VALIDATE-69'), async ({ as }) => {
    const { a, f } = await addWith(as, {}, async (c) => { await c.f.hoatChat.add(); });
    await expect(f.hoatChat.area().getByText(rx(MSG.empty('Hoạt chất'))).first()).toBeVisible();
    await expectNotSaved(a.page, f);
  });

  test(T('VALIDATE-74'), info('VALIDATE-74'), async ({ as, track }) => {
    const { a, rec } = await addWith(as, {}, async (c) => {
      await c.f.addHoatChat({ ten: D.hoatChat, hamLuong: '10', donVi: D.dvHoatChat, chinh: true });
      await c.f.addHoatChat({ ten: D.hoatChat2, hamLuong: '5', donVi: D.dvHoatChat });
      await c.f.hoatChat.remove(1);
      await expect(c.f.hoatChat.rows()).toHaveCount(1);
    });
    await expectToast(a.page, rx(MSG.addOk));
    track('HT', rec.ma!);
    const d = await a.list.openDetail(rec.ma!);
    await expect(d.hoatChatRows()).toHaveCount(1);
    expect((await d.tableTexts(L.hoatChatTitle)).join('\n')).toContain(D.hoatChat);
  });

  test(T('VALIDATE-75'), info('VALIDATE-75'), async ({ as, track }) => {
    const { a, rec } = await addWith(as, { doiTuong: [{ nhom: D.nhomTs, loai: D.loaiTs, dichBenh: D.dichBenh }] });
    await expectToast(a.page, rx(MSG.addOk));
    track('HT', rec.ma!);
    const d = await a.list.openDetail(rec.ma!);
    await expect(d.doiTuongRows()).toHaveCount(1);
    const t = (await d.tableTexts(L.doiTuongTitle))[0];
    for (const s of [D.nhomTs, D.loaiTs, D.dichBenh]) expect(t).toContain(s);
  });

  test(T('VALIDATE-83'), info('VALIDATE-83'), async ({ as }) => {
    const dt = { nhom: D.nhomTs, loai: D.loaiTs, dichBenh: D.dichBenh };
    const { a, f } = await addWith(as, { doiTuong: [dt, dt] });
    await expect(f.doiTuong.area().getByText(/trùng|đã tồn tại/i).first()).toBeVisible();
    await expectNotSaved(a.page, f);
  });

  test(T('VALIDATE-87'), info('VALIDATE-87'), async ({ as, track }) => {
    const { a, rec } = await addWith(as, {}, async (c) => {
      await c.f.addDoiTuong({ nhom: D.nhomTs, loai: D.loaiTs, dichBenh: D.dichBenh });
      await c.f.addDoiTuong({ nhom: D.nhomTs, loai: D.loaiTs, dichBenh: D.dichBenh2 });
      await c.f.doiTuong.remove(0);
      await expect(c.f.doiTuong.rows()).toHaveCount(1);
    });
    await expectToast(a.page, rx(MSG.addOk));
    track('HT', rec.ma!);
    const d = await a.list.openDetail(rec.ma!);
    await expect(d.doiTuongRows()).toHaveCount(1);
    expect((await d.tableTexts(L.doiTuongTitle))[0]).toContain(D.dichBenh2);
  });
});
