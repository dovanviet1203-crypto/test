import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { D, PRE, env } from '../../src/env';
import { LABELS as L, MSG, REQUIRED, TITLES, UI } from '../../src/ui';
import { required } from '../../src/data';
import { expectFieldError, expectInOrder, expectToastTopRightAutoClose, hasAsterisk, need, openAdd } from '../../src/helpers';
import { exact, vn } from '../../src/pages/common';

const PLACEHOLDER: Record<string, RegExp> = {
  [L.ma]: /^Nhập mã thuốc$/i, [L.ten]: /^Nhập tên thuốc$/i, [L.phanLoai]: /^Chọn Phân loại thuốc$/i, [L.dvt]: /^Chọn đơn vị tính$/i,
  [L.dangThuoc]: /^Nhập dạng thuốc$/i, [L.dangDongGoi]: /^Chọn dạng đóng gói$/i, [L.hinhThuc]: /^Chọn hình thức lưu hành$/i,
  [L.xuatXu]: /^Chọn xuất xứ$/i, [L.dnVatTu]: /^Chọn doanh nghiệp vật tư đầu vào$/i, [L.nguon]: /^Nhập nguồn trích dẫn$/i, [L.moTa]: /^Nhập mô tả$/i,
};
const sameRow = async (a: import('@playwright/test').Locator, b: import('@playwright/test').Locator) => {
  const x = (await a.boundingBox())!; const y = (await b.boundingBox())!;
  expect(Math.abs(x.y - y.y), 'Hai trường không cùng hàng').toBeLessThan(12);
  expect(x.x).toBeLessThan(y.x);
};

test.describe('GUI - Popup Thêm mới / Cập nhật / Chi tiết', () => {
  test(T('GUI-58'), info('GUI-58'), async ({ as }) => {
    const { f } = await openAdd(as, 'HT');
    await expect(f.dialog.locator(UI.dialogClose).first()).toBeVisible();
    const rows = [[L.ma, L.ten, L.phanLoai], [L.dvt, L.dangThuoc, L.dangDongGoi], [L.hinhThuc, L.xuatXu, L.dnVatTu]];
    for (const r of rows) { await sameRow(f.label(r[0]), f.label(r[1])); await sameRow(f.label(r[1]), f.label(r[2])); }
    for (const sub of [f.hoatChat, f.doiTuong]) await expect(sub.addButton()).toBeVisible();
    for (const l of [L.nguon, L.moTa, L.hinhAnh]) await expect(f.label(l)).toBeVisible();
    await expect(f.activeCheckbox()).toBeVisible();
    for (const b of [/^\s*Hu[ỷy]\s*$/, /Lưu và (Thêm|Tạo) mới/, /^\s*Lưu\s*$/]) await expect(f.button(b)).toBeVisible();
  });

  test(T('GUI-59'), info('GUI-59'), async ({ as }) => {
    const { f } = await openAdd(as, 'HT');
    for (const l of REQUIRED) expect(await hasAsterisk(f.label(l)), `Thiếu * ở "${l}"`).toBeTruthy();
    for (const [l, re] of Object.entries(PLACEHOLDER)) expect.soft(await f.placeholder(l), `Placeholder "${l}"`).toMatch(re);
  });

  test(T('GUI-83'), info('GUI-83'), async ({ as }) => {
    const { f } = await openAdd(as, 'HT');
    await f.select(L.hinhThuc, D.hinhThuc);
    await expect(f.label(L.soQd)).toBeVisible();
    expect(await hasAsterisk(f.label(L.soQd)), 'Số QĐ không được có *').toBeFalsy();
    expect(await f.placeholder(L.soQd)).toMatch(/^Nhập số quyết định lưu hành$/i);
  });

  test(T('GUI-93'), info('GUI-93'), async ({ as }) => {
    const { f } = await openAdd(as, 'HT');
    await expect(f.hoatChat.addButton()).toBeVisible();
    expectInOrder(await f.hoatChat.headers(), ['Hoạt chất', 'Hàm lượng', /^Đơn vị/, 'Chất chính', 'Thao tác'], 'Cột bảng Hoạt chất');
    await expect(f.hoatChat.area().getByText(/Chưa có dữ liệu|Không có dữ liệu/).first()).toBeVisible();
  });

  test(T('GUI-102'), info('GUI-102'), async ({ as }) => {
    const { list } = await as('HT');
    const f = await list.openEdit(PRE.ht1Name);
    expect(await f.value(L.ma)).toBe(PRE.ht1Code);
    expect(await f.value(L.ten)).toBe(PRE.ht1Name);
    await expect(f.label(L.soQd)).toBeVisible();
    const soQd = env('HT_TS_01_SO_QD', 'TS1-0422');
    if (soQd) expect(await f.value(L.soQd)).toBe(soQd);
    expect(await f.hoatChat.rows().count()).toBeGreaterThan(0);
    expect(await f.doiTuong.rows().count()).toBeGreaterThan(0);
    await expect(f.button(/Lưu và (Thêm|Tạo) mới/)).toHaveCount(0);
    await expect(f.button(/^\s*Hu[ỷy]\s*$/)).toBeVisible();
    await expect(f.button(/^\s*Lưu\s*$/)).toBeVisible();
    await f.cancel();
  });

  test(T('GUI-103'), info('GUI-103'), async ({ as }) => {
    need({ HT_INACTIVE_NAME: PRE.htInactiveName });
    const { list } = await as('HT');
    await list.clearAllFilters();
    const f = await list.openEdit(PRE.htInactiveName);
    expect(await f.isActive()).toBeFalsy();
    await f.cancel();
  });

  test(T('GUI-104'), info('GUI-104'), async ({ as, seed }) => {
    // Sửa Mô tả trên bản ghi tự tạo (không đổi dữ liệu mẫu Conflor 100)
    const rec = await seed('HT', required());
    const { page, list } = await as('HT');
    const f = await list.openEdit(rec.ma!);
    await f.fillText(L.moTa, `Mô tả sửa ${Date.now()}`);
    await f.save();
    await expectToastTopRightAutoClose(page, MSG.editOk);
  });

  test(T('GUI-105'), info('GUI-105'), async ({ as }) => {
    const { list } = await as('HT');
    const f = await list.openEdit(PRE.ht1Name);
    await f.fillText(L.ma, PRE.ht2Code);
    await f.save();
    await expectFieldError(f, L.ma, MSG.maExists);
    await f.cancel();
  });

  test(T('GUI-106'), info('GUI-106'), async ({ as }) => {
    const { list } = await as('HT');
    const d = await list.openDetail(PRE.ht1Name);
    await expect(d.dialog.getByText(new RegExp(`^\\s*${vn(TITLES.detail).source}\\s*$`)).first()).toBeVisible();
    for (const l of [L.ma, L.ten, L.phanLoai, L.dvt, L.dangThuoc, L.dangDongGoi, L.hinhThuc, L.soQd, L.xuatXu])
      await expect(d.label(l), `Thiếu nhãn ${l}`).toBeVisible();
    await expect(d.dialog.getByText(/^\s*\*?\s*(Doanh nghiệp|DN) vật tư đầu vào\s*:?\s*$/).first()).toBeVisible();
    await expect(d.table(L.hoatChatTitle)).toBeVisible();
    await expect(d.table(L.doiTuongTitle)).toBeVisible();
    for (const l of [L.nguon, 'Trạng thái', L.moTa, L.hinhAnh]) await expect(d.label(l), `Thiếu nhãn ${l}`).toBeVisible();
    await expect(d.dialog.getByRole('button', { name: exact('Đóng') })).toBeVisible();
  });

  test(T('GUI-107'), info('GUI-107'), async ({ as }) => {
    const { list } = await as('HT');
    const d = await list.openDetail(PRE.ht1Code);
    expect(await d.editableCount(), 'Chi tiết còn ô nhập sửa được').toBe(0);
  });

  test(T('GUI-111'), info('GUI-111'), async ({ as }) => {
    const { list } = await as('HT');
    const d = await list.openDetail(PRE.ht1Name);
    const t = d.table(L.hoatChatTitle);
    await expect(t.locator(UI.tag).filter({ hasText: /Cấm|Hạn chế/ }).first()).toBeVisible();
    const cbs = t.locator(UI.checkbox);
    const n = await cbs.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const cb = cbs.nth(i);
      const dis = (await cb.isDisabled().catch(() => false)) || /disabled/.test((await cb.getAttribute('class')) || '') || (await cb.getAttribute('aria-disabled')) === 'true'
        || (await cb.locator('input').first().isDisabled().catch(() => false));
      expect(dis, `Checkbox Chất chính dòng ${i + 1} phải disable`).toBeTruthy();
    }
    const hs = await d.tableHeaders(L.hoatChatTitle);
    const iHl = hs.findIndex((h) => /Hàm lượng/.test(h));
    const align = await d.hoatChatRows().first().locator('td').nth(iHl).evaluate((e) => getComputedStyle(e).textAlign);
    expect(['right', 'end']).toContain(align);
  });

  test(T('GUI-112'), info('GUI-112'), async ({ as }) => {
    const { list } = await as('HT');
    const d = await list.openDetail(PRE.ht1Name);
    expectInOrder(await d.tableHeaders(L.doiTuongTitle), [/Nhóm th(?:uỷ|ủy|uy) sản/, /Loài th(?:uỷ|ủy|uy) sản/, /Dịch bệnh, dịch hại/], 'Cột Đối tượng phòng trừ');
  });
});
