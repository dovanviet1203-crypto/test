import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { PRE } from '../../src/env';
import { MSG, TITLES, UI } from '../../src/ui';
import { need, rx } from '../../src/helpers';
import { exact, vn } from '../../src/pages/common';

test.describe('GUI - Popup Thêm mới từ hệ thống', () => {
  test(T('GUI-114'), info('GUI-114'), async ({ as }) => {
    const { list } = await as('DNA');
    const p = await list.openFromSystem();
    await expect(p.dialog.getByText(new RegExp(`^\\s*${vn(TITLES.fromSystem).source}\\s*$`)).first()).toBeVisible();
    await expect(p.dialog.locator(UI.dialogClose).first()).toBeVisible();
    await expect(p.searchBox()).toBeVisible();
    for (const l of [/^\s*Phân loại thuốc\s*:?\s*$/, /^\s*(Doanh nghiệp|DN) vật tư đầu vào\s*:?\s*$/, /^\s*Hình thức lưu hành\s*:?\s*$/, /^\s*Bộ lọc\s*:?\s*$/])
      await expect(p.dialog.getByText(l).first()).toBeVisible();
    await expect(p.dialog.getByRole('button', { name: /Xo[áa] bộ lọc/ })).toBeVisible();
    await expect(p.dialog.getByRole('button', { name: /Tìm kiếm/ })).toBeVisible();
    await expect(p.dialog.getByText(/Danh sách kết quả/).first()).toBeVisible();
    const c = await p.counter();
    expect(c, 'Không thấy "Chọn tất cả (x/y)"').not.toBeNull();
    expect(c!.sel).toBe(0);
    expect(await p.cards().count()).toBeGreaterThan(0);
    await expect(p.dialog.getByRole('button', { name: /^\s*Hu[ỷy]\s*$/ })).toBeVisible();
    await expect(p.dialog.getByRole('button', { name: exact('Lưu') })).toBeVisible();
  });

  test(T('GUI-116'), info('GUI-116'), async ({ as }) => {
    const { list } = await as('DNA');
    const p = await list.openFromSystem();
    await p.clearTag();
    await p.search(PRE.ht1Name);
    const card = p.card(PRE.ht1Name);
    await expect(card).toBeVisible();
    await expect(card.locator(UI.checkbox).first()).toBeVisible();
    await expect(card).toContainText(PRE.ht1Code);
    for (const t of [/Phân loại thuốc/, /Hoạt chất/, /(Doanh nghiệp|DN) vật tư đầu vào/]) await expect(card).toContainText(t);
    // Checkbox ở góc trên trái, Mã ở bên phải tên
    const cb = (await card.locator(UI.checkbox).first().boundingBox())!;
    const nm = (await card.getByText(PRE.ht1Name, { exact: true }).first().boundingBox())!;
    const cd = (await card.getByText(PRE.ht1Code, { exact: false }).first().boundingBox())!;
    expect(cb.x).toBeLessThan(nm.x);
    expect(cd.x).toBeGreaterThan(nm.x);
  });

  test(T('GUI-120'), info('GUI-120'), async ({ as }) => {
    const { page, list } = await as('DNA');
    const p = await list.openFromSystem();
    await p.save();
    await expect(page.getByText(rx(MSG.pickOne)).first()).toBeVisible();
    await expect(p.dialog).toBeVisible();
  });

  test(T('GUI-121'), info('GUI-121'), async ({ as }) => {
    need({ DNA_INHERITED_HT_CHANGED_NAME: PRE.dnaInhChangedName });
    const { list } = await as('DNA');
    const p = await list.openFromSystem();
    await p.setTag(/Dữ liệu đã thêm/);
    await p.search(PRE.dnaInhChangedName);
    await p.tick(PRE.dnaInhChangedName);
    await p.save();
    const dup = p.dupDialog();
    await expect(dup).toBeVisible();
    await expect(dup.getByText(exact('Thông báo')).first()).toBeVisible();
    await expect(dup.getByText(/Danh sách trùng/).first()).toBeVisible();
    await expect(dup.getByText(/Chọn tất cả\s*\(0\s*\/\s*1\)/).first()).toBeVisible();
    await expect(dup.locator(UI.card).first().locator(UI.checkbox).first()).toBeVisible();
    await expect(dup.getByRole('button', { name: /^\s*Hu[ỷy]\s*$/ })).toBeVisible();
    await expect(dup.getByRole('button', { name: /Xác nhận/ })).toBeVisible();
    await dup.getByRole('button', { name: /^\s*Hu[ỷy]\s*$/ }).click(); // không cập nhật dữ liệu
  });
});
