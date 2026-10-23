import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { D, PRE } from '../../src/env';
import { LABELS as L, MSG } from '../../src/ui';
import { RUN, code, required } from '../../src/data';
import { need, rx, toggleRow } from '../../src/helpers';
import { expectToast, toast } from '../../src/pages/common';

test.describe('FUNCT - Hiển thị lưới', () => {
  test(T('FUNCT-59'), info('FUNCT-59'), async ({ as, seed }) => {
    const r1 = await seed('HT', required({ ma: code('TS_SORT') }));
    const r2 = await seed('HT', required({ ma: code('TS_SORT') }));
    const { list } = await as('HT');
    await list.search(`TS_SORT_${RUN}`);
    expect((await list.column(/Mã thuốc/)).slice(0, 2)).toEqual([r2.ma, r1.ma]);
    expect((await list.column(/^STT$/)).slice(0, 2)).toEqual(['1', '2']);
  });

  test(T('FUNCT-60'), info('FUNCT-60'), async ({ as, seed }) => {
    // Bản ghi tự tạo đứng ở STT 2, sửa Mô tả rồi kiểm tra vẫn ở STT 2
    const r1 = await seed('HT', required({ ma: code('TS_POS') }));
    await seed('HT', required({ ma: code('TS_POS') }));
    const { page, list } = await as('HT');
    const f = await list.openEdit(r1.ma!);
    await f.fillText(L.moTa, 'Cập nhật mô tả');
    await f.save();
    await expectToast(page, rx(MSG.editOk));
    await list.search(`TS_POS_${RUN}`);
    expect((await list.column(/Mã thuốc/))[1]).toBe(r1.ma);
  });

  test(T('FUNCT-63'), info('FUNCT-63'), async ({ as }) => {
    const { list } = await as('HT');
    const r = await list.mustFind(PRE.ht2Name);
    const row = {
      ma: await list.cell(r, /Mã thuốc/), ten: await list.cell(r, /Tên thuốc/), pl: await list.cell(r, /Phân loại/),
      hc: await list.cell(r, /^Hoạt chất$/), dn: await list.cell(r, /vật tư đầu vào/),
    };
    const d = await list.openDetail(PRE.ht2Name);
    expect(await d.value(L.ma)).toBe(row.ma);
    expect(await d.value(L.ten)).toBe(row.ten);
    expect(await d.value(L.phanLoai)).toBe(row.pl);
    const dn = (await d.value(L.dnVatTu).catch(() => '')) || (await d.value('DN vật tư đầu vào'));
    expect(dn).toBe(row.dn);
    // Cột Hoạt chất trên lưới = các hoạt chất chính trong Chi tiết
    for (const h of row.hc.split(',').map((s) => s.trim()).filter(Boolean)) expect((await d.tableTexts(L.hoatChatTitle)).join('\n')).toContain(h);
  });

  test(T('FUNCT-64'), info('FUNCT-64'), async ({ as, seed }) => {
    const rec = await seed('HT', required({
      hoatChat: [{ ten: D.hoatChat, hamLuong: '10', donVi: D.dvHoatChat, chinh: true }, { ten: D.hoatChat2, hamLuong: '5', donVi: D.dvHoatChat, chinh: false }],
    }));
    const { page, list } = await as('HT');
    const f = await list.openEdit(rec.ma!);
    await f.hoatChat.check(0, false);
    await f.hoatChat.check(1, true);
    await f.save();
    await expectToast(page, rx(MSG.editOk));
    const r = await list.mustFind(rec.ma!);
    expect(await list.cell(r, /^Hoạt chất$/)).toBe(D.hoatChat2);
  });

  test(T('FUNCT-65'), info('FUNCT-65'), async ({ as }) => {
    const { list } = await as('HT');
    const unit = async (n: string) => { const r = await list.findAny(n, true); expect(r, `Không thấy ${n}`).not.toBeNull(); return list.cell(r!, /Đơn vị tạo dữ liệu/); };
    expect(await unit(PRE.ht1Name)).toBe('Hệ thống');
    if (D.dnaName) expect(await unit(PRE.dnaName)).toBe(D.dnaName);
    if (D.nh1Name) expect(await unit(PRE.nh1Name)).toBe(D.nh1Name);
  });
});

test.describe('FUNCT - Chuyển trạng thái trên lưới', () => {
  test(T('FUNCT-70'), info('FUNCT-70'), async ({ as, seed }) => {
    // Thay "Gramozin 20" bằng bản ghi Hệ thống tự tạo để không đổi trạng thái dữ liệu mẫu
    const rec = await seed('HT', required());
    const a = await as('HT');
    const list = a.list;
    await list.filter('Trạng thái', 'Hoạt động').catch(() => {});
    await toggleRow(a, rec.ma!);
    await list.search(rec.ma!);
    expect(await list.find(rec.ma!), 'Bản ghi vẫn còn trong danh sách đang lọc Hoạt động').toBeNull();
    await list.filter('Trạng thái', 'Ngừng hoạt động');
    const r = await list.mustFind(rec.ma!);
    expect(await list.isRowActive(r)).toBeFalsy();
  });

  test(T('FUNCT-71'), info('FUNCT-71'), async ({ as, seed }) => {
    const rec = await seed('HT', required({ hoatDong: false }));
    const a = await as('HT');
    await a.list.filter('Trạng thái', 'Ngừng hoạt động');
    await toggleRow(a, rec.ma!);
    await a.list.clearFilter('Trạng thái');
    const r = await a.list.mustFind(rec.ma!);
    expect(await a.list.isRowActive(r)).toBeTruthy();
  });

  test(T('FUNCT-72'), info('FUNCT-72'), async ({ as, seed }) => {
    const rec = await seed('DNA', required());
    const a = await as('DNA');
    await toggleRow(a, rec.ma!);
    await a.list.clearFilter('Trạng thái');
    const r = await a.list.mustFind(rec.ma!);
    expect(await a.list.isRowActive(r)).toBeFalsy();
  });

  test(T('FUNCT-74'), info('FUNCT-74'), async ({ as }) => {
    need({ HT_INACTIVE_NAME: PRE.htInactiveName });
    const { list } = await as('DNA');
    const p = await list.openFromSystem();
    await p.clearTag();
    await p.search(PRE.htInactiveName);
    await expect(p.card(PRE.htInactiveName)).toHaveCount(0);
  });

  test(T('FUNCT-75'), info('FUNCT-75'), async ({ as }) => {
    const { list } = await as('HT');
    const r = await list.findAny(PRE.dnaName, true);
    expect(r).not.toBeNull();
    const before = await list.isRowActive(r!);
    expect(await list.isSwitchDisabled(r!), 'Toggle bản ghi DN phải disable với Admin HT').toBeTruthy();
    await list.rowSwitch(r!).click({ force: true }).catch(() => {});
    expect(await list.isRowActive(r!)).toBe(before);
  });
});

test.describe('FUNCT - Xoá', () => {
  test(T('FUNCT-77'), info('FUNCT-77'), async ({ as, seed }) => {
    const rec = await seed('HT', required());
    const { page, list } = await as('HT');
    await list.startDelete(rec.ma!);
    await list.confirmDelete();
    await expectToast(page, rx(MSG.deleteOk));
    expect(await list.find(rec.ma!)).toBeNull();
  });

  test(T('FUNCT-78'), info('FUNCT-78'), async ({ as, seed }) => {
    const rec = await seed('DNA', required());
    const { page, list } = await as('DNA');
    await list.startDelete(rec.ma!);
    await list.confirmDelete();
    await expectToast(page, rx(MSG.deleteOk));
    expect(await list.find(rec.ma!)).toBeNull();
  });

  test(T('FUNCT-80'), info('FUNCT-80'), async ({ as, seed, track }) => {
    const rec = await seed('HT', required());
    const dn = await as('DNA');
    const p = await dn.list.openFromSystem();
    await p.search(rec.ten!);
    await p.tick(rec.ten!);
    await p.save();
    await expectToast(dn.page, rx(MSG.addFromSys(1)));
    track('DNA', rec.ten!);
    const ht = await as('HT');
    await ht.list.startDelete(rec.ma!);
    await ht.list.confirmDelete();
    await expectToast(ht.page, rx(MSG.deleteOk));
    await dn.list.goto();
    const r = await dn.list.mustFind(rec.ten!);
    expect(await dn.list.cell(r, /Nguồn dữ liệu/)).toMatch(/DN kế thừa/);
  });

  test(T('FUNCT-82'), info('FUNCT-82'), async ({ as }) => {
    need({ HT_USED_CODE: PRE.htUsedCode, HT_USED_NAME: PRE.htUsedName });
    const { page, list } = await as('HT');
    await list.startDelete(PRE.htUsedName);
    await expect(page.getByText(rx(MSG.inUse(PRE.htUsedName, PRE.htUsedCode))).first()).toBeVisible();
    await page.getByRole('button', { name: /^\s*Đóng\s*$/ }).first().click();
    await expect(toast(page, rx(MSG.deleteOk))).toHaveCount(0);
    expect(await list.find(PRE.htUsedCode)).not.toBeNull();
  });

  test(T('FUNCT-83'), info('FUNCT-83'), async ({ as }) => {
    const { list } = await as('HT');
    for (const n of [PRE.dnaName, PRE.nh1Name].filter(Boolean)) {
      const r = await list.findAny(n, true);
      expect(r, `Không thấy ${n}`).not.toBeNull();
      expect(await list.hasIcon(r!, 'more'), `${n}: không được có •••/Xoá`).toBeFalsy();
    }
  });
});
