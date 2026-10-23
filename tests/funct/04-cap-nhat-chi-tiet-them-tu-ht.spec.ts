import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { D, PATHS, PRE, env } from '../../src/env';
import { LABELS as L, MSG, UI } from '../../src/ui';
import { RUN, code, full, name, required } from '../../src/data';
import { expectFieldError, need, rx } from '../../src/helpers';
import { addFromSystem, editText } from '../../src/flows';
import { expectToast } from '../../src/pages/common';

test.describe('FUNCT - Cập nhật', () => {
  test(T('FUNCT-122'), info('FUNCT-122'), async ({ as }) => {
    const { list } = await as('HT');
    const f = await list.openEdit(PRE.ht1Name);
    const form = {
      ma: await f.value(L.ma), ten: await f.value(L.ten), pl: await f.selectedText(L.phanLoai), dvt: await f.selectedText(L.dvt),
      ht: await f.selectedText(L.hinhThuc), xx: await f.selectedText(L.xuatXu),
    };
    await expect(f.button(/Lưu và (Thêm|Tạo) mới/)).toHaveCount(0);
    await f.cancel();
    const d = await list.openDetail(PRE.ht1Name);
    expect(form.ma).toBe(await d.value(L.ma));
    expect(form.ten).toBe(await d.value(L.ten));
    expect(form.pl).toContain(await d.value(L.phanLoai));
    expect(form.dvt).toContain(await d.value(L.dvt));
    expect(form.ht).toContain(await d.value(L.hinhThuc));
    expect(form.xx).toContain(await d.value(L.xuatXu));
  });

  test(T('FUNCT-123'), info('FUNCT-123'), async ({ as }) => {
    const { list } = await as('HT');
    const r = await list.findAny(PRE.dnaName, true);
    expect(r).not.toBeNull();
    expect(await list.hasIcon(r!, 'edit'), 'Admin HT không được có icon Cập nhật trên bản ghi DN').toBeFalsy();
  });

  test(T('FUNCT-124'), info('FUNCT-124'), async ({ as, seed }) => {
    const rec = await seed('HT', required());
    const a = await as('HT');
    await a.list.search(RUN);
    const pos = (await a.list.column(/Mã thuốc/)).indexOf(rec.ma!);
    const newTen = name('Conflor Plus');
    await editText(a, rec.ma!, L.ten, newTen);
    await a.list.search(RUN);
    expect((await a.list.column(/Mã thuốc/)).indexOf(rec.ma!)).toBe(pos);
    expect(await a.list.cell(a.list.row(rec.ma!), /Tên thuốc/)).toBe(newTen);
  });

  test(T('FUNCT-130'), info('FUNCT-130'), async ({ as, seed }) => {
    const rec = await seed('DNA', required());
    const a = await as('DNA');
    const f = await a.list.openEdit(rec.ma!);
    await f.select(L.xuatXu, D.xuatXu2);
    await f.save();
    await expectToast(a.page, rx(MSG.editOk));
  });

  test(T('FUNCT-131'), info('FUNCT-131'), async ({ as, seed, track }) => {
    const rec = await seed('HT', required({ moTa: 'Mô tả gốc HT' }));
    const dn = await as('DNA');
    await addFromSystem(dn, [rec.ten!], track);
    await editText(dn, rec.ten!, L.moTa, 'Mô tả DN sửa');
    const r = await dn.list.mustFind(rec.ten!);
    expect(await dn.list.cell(r, /Nguồn dữ liệu/)).toMatch(/DN kế thừa/);
    const ht = await as('HT');
    const d = await ht.list.openDetail(rec.ma!);
    expect(await d.value(L.moTa)).toBe('Mô tả gốc HT');
  });

  test(T('FUNCT-133'), info('FUNCT-133'), async ({ as }) => {
    const { list } = await as('HT');
    const f = await list.openEdit(PRE.ht1Name);
    await f.fillText(L.ma, PRE.ht2Code);
    await f.save();
    await expectFieldError(f, L.ma, MSG.maExists);
    await f.cancel();
  });

  test(T('FUNCT-134'), info('FUNCT-134'), async ({ as }) => {
    const { list } = await as('HT');
    const f = await list.openEdit(PRE.ht1Name);
    await f.fillText(L.ten, PRE.ht2Name.toLowerCase());
    await f.save();
    await expectFieldError(f, L.ten, MSG.tenExists);
    await f.cancel();
  });
});

test.describe('FUNCT - Xem chi tiết', () => {
  test(T('FUNCT-153'), info('FUNCT-153'), async ({ as }) => {
    const { list } = await as('HT');
    const d = await list.openDetail(PRE.ht2Name);
    expect(await d.value(L.ten)).toBe(PRE.ht2Name);
    expect(await d.value(L.ma)).toBe(PRE.ht2Code);
  });

  test(T('FUNCT-154'), info('FUNCT-154'), async ({ as, seed }) => {
    const rec = await seed('HT', full());
    const { list } = await as('HT');
    const d = await list.openDetail(rec.ma!);
    for (const [l, v] of [[L.ma, rec.ma], [L.ten, rec.ten], [L.phanLoai, rec.phanLoai], [L.dvt, rec.dvt], [L.dangThuoc, rec.dangThuoc],
      [L.hinhThuc, rec.hinhThuc], [L.soQd, rec.soQd], [L.xuatXu, rec.xuatXu], [L.nguon, rec.nguon], [L.moTa, rec.moTa]] as const)
      expect(await d.value(l), l).toBe(v);
    expect((await d.tableTexts(L.hoatChatTitle)).join('\n')).toContain(D.hoatChat);
    expect((await d.tableTexts(L.doiTuongTitle)).join('\n')).toContain(D.loaiTs);
    await expect(d.dialog.getByText(/^\s*Hoạt động\s*$/).first()).toBeVisible();
  });

  test(T('FUNCT-155'), info('FUNCT-155'), async ({ as }) => {
    const { list } = await as('HT');
    const d = await list.openDetail(PRE.ht1Name);
    const t = d.table(L.hoatChatTitle);
    await expect(t.locator(UI.tag).filter({ hasText: /Cấm|Hạn chế/ }).first()).toBeVisible();
    const cb = t.locator(UI.checkbox).first();
    const dis = (await cb.isDisabled().catch(() => false)) || /disabled/.test((await cb.getAttribute('class')) || '') || (await cb.getAttribute('aria-disabled')) === 'true'
      || (await cb.locator('input').first().isDisabled().catch(() => false));
    expect(dis, 'Checkbox Chất chính phải disable').toBeTruthy();
  });

  test(T('FUNCT-156'), info('FUNCT-156'), async ({ as }) => {
    const n = Number(env('HT_TS_01_DOI_TUONG_COUNT', '3'));
    const { list } = await as('HT');
    const d = await list.openDetail(PRE.ht1Name);
    await expect(d.doiTuongRows()).toHaveCount(n);
    for (const t of await d.tableTexts(L.doiTuongTitle)) expect(t.split(' ').length, 'Dòng đối tượng thiếu dữ liệu').toBeGreaterThan(2);
  });

  test(T('FUNCT-158'), info('FUNCT-158'), async ({ as }) => {
    const { list } = await as('HT');
    for (const n of [PRE.dnaName, PRE.nh1Name].filter(Boolean)) {
      await list.clearAllFilters();
      const d = await list.openDetail(n);
      expect(await d.value(L.ten)).toBe(n);
      expect(await d.editableCount(), 'Chi tiết phải chỉ đọc').toBe(0);
      await d.close();
    }
  });
});

test.describe('FUNCT - Thêm mới từ hệ thống', () => {
  test(T('FUNCT-161'), info('FUNCT-161'), async ({ as }) => {
    const ht = await as('HT');
    await expect(ht.list.addFromSystemButton()).toHaveCount(0);
    const dn = await as('DNA');
    await expect(dn.list.addFromSystemButton().first()).toBeVisible();
  });

  test(T('FUNCT-162'), info('FUNCT-162'), async ({ as }) => {
    const { list } = await as('DNA');
    const p = await list.openFromSystem();
    await p.clearTag();
    for (const n of [PRE.ht1Name, PRE.ht2Name, PRE.ht3Name]) { await p.search(n); await expect(p.card(n), `Thiếu thẻ ${n}`).toBeVisible(); }
    for (const n of [PRE.htInactiveName, PRE.dnbName, PRE.nh1Name, PRE.dnaName].filter(Boolean)) {
      await p.search(n);
      await expect(p.cards().filter({ hasText: n }), `Không được có thẻ ${n}`).toHaveCount(0);
    }
  });

  test(T('FUNCT-189'), info('FUNCT-189'), async ({ as, seed, track }) => {
    const rec = await seed('HT', required());
    const dn = await as('DNA');
    await addFromSystem(dn, [rec.ten!], track);
    await dn.list.search('');
    expect((await dn.list.column(/Tên thuốc/))[0]).toBe(rec.ten);
  });

  test(T('FUNCT-190'), info('FUNCT-190'), async ({ as, seed, track }) => {
    const recs = [await seed('HT', required()), await seed('HT', required()), await seed('HT', required())];
    const dn = await as('DNA');
    const p = await dn.list.openFromSystem();
    await p.clearTag();
    await p.search(RUN);
    for (const r of recs) await p.tick(r.ten!);
    await p.save();
    await expectToast(dn.page, rx(MSG.addFromSys(3)));
    for (const r of recs) track('DNA', r.ten!);
  });

  test(T('FUNCT-196'), info('FUNCT-196'), async ({ as, seed, track }) => {
    const hc = env('HT_ONLY_HOAT_CHAT');
    need({ HOAT_CHAT_PATH: PATHS.hoatChat, HT_ONLY_HOAT_CHAT: hc });
    const rec = await seed('HT', required({ hoatChat: [{ ten: hc, hamLuong: '10', donVi: D.dvHoatChat, chinh: true }] }));
    const dn = await as('DNA');
    await addFromSystem(dn, [rec.ten!], track);
    await dn.page.goto(PATHS.hoatChat);
    await dn.list.search(hc);
    const r = dn.list.row(hc);
    await expect(r).toBeVisible();
    expect(await dn.list.cell(r, /Nguồn dữ liệu/)).toMatch(/DN kế thừa/);
  });

  test(T('FUNCT-202'), info('FUNCT-202'), async ({ as, seed, track }) => {
    const rec = await seed('HT', required());
    const dn = await as('DNA');
    await addFromSystem(dn, [rec.ten!], track);
    const ht = await as('HT');
    const f = await ht.list.openEdit(rec.ma!);
    await f.select(L.dvt, D.dvt2);
    await f.save();
    await expectToast(ht.page, rx(MSG.editOk));
    await dn.list.goto();
    const p = await dn.list.openFromSystem();
    await p.clearTag();
    await p.search(rec.ten!);
    await p.tick(rec.ten!);
    await p.save();
    await expect(p.dupDialog()).toBeVisible();
    await expect(p.dupDialog()).toContainText(/Cần cập nhật 1 thông tin/);
  });

  test(T('FUNCT-203'), info('FUNCT-203'), async ({ as, seed }) => {
    const sharedCode = code('TS_DUP');
    const rec = await seed('HT', required({ ma: sharedCode }));
    await seed('DNA', required({ ma: sharedCode }));
    const dn = await as('DNA');
    const p = await dn.list.openFromSystem();
    await p.clearTag();
    await p.search(rec.ten!);
    await p.tick(rec.ten!);
    await p.save();
    await expect(p.dupDialog()).toBeVisible();
  });
});
