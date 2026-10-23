import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { PRE } from '../../src/env';
import { UI } from '../../src/ui';
import { norm } from '../../src/data';
import { expectInOrder, need } from '../../src/helpers';
import { anyVisible, vn } from '../../src/pages/common';

const FILTERS_HT = ['Nguồn dữ liệu', 'Đơn vị tạo dữ liệu', 'Phân loại thuốc', /(Doanh nghiệp|DN) vật tư đầu vào/, 'Trạng thái'];
const COLS_HT = ['STT', 'Mã thuốc', 'Tên thuốc', 'Phân loại thuốc', 'Hoạt chất', /(DN|Doanh nghiệp) vật tư đầu vào/, 'Đơn vị tạo dữ liệu', 'Nguồn dữ liệu', 'Đơn vị kế thừa', 'Trạng thái', 'Thao tác'];
const COLS_DN = ['STT', 'Mã thuốc', 'Tên thuốc', 'Phân loại thuốc', 'Hoạt chất', /(DN|Doanh nghiệp) vật tư đầu vào/, 'Nguồn dữ liệu', 'Trạng thái', 'Thao tác'];
const SOURCES_HT = ['Hệ thống', 'Doanh nghiệp', 'DN kế thừa', 'Nông hộ', 'NH kế thừa HT', 'NH kế thừa DN'];

const label = (page: import('@playwright/test').Page, l: string | RegExp) =>
  page.getByText(typeof l === 'string' ? new RegExp(`^\\s*${l}\\s*:?\\s*$`) : l).first();

test.describe('GUI - Màn hình Danh sách, vùng tìm kiếm, lưới', () => {
  test(T('GUI-1'), info('GUI-1'), async ({ as }) => {
    const { page, list } = await as('HT');
    await expect(page.getByText(/Danh mục Nguyên vật liệu/).first()).toBeVisible();
    expect(await anyVisible(page.getByText(UI.listTitle))).toBe(true);
    for (const b of [list.importButton(), list.exportButton(), list.addButton()]) await expect(b.first()).toBeVisible();
    await expect(list.addFromSystemButton()).toHaveCount(0);
    for (const f of FILTERS_HT) await expect(label(page, f)).toBeVisible();
    await expect(page.getByRole('button', { name: /Xo[áa] bộ lọc/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Tìm kiếm/ }).first()).toBeVisible();
    expectInOrder(await list.headers(), COLS_HT, 'Cột lưới');
    await expect(list.pager()).toBeVisible();
  });

  test(T('GUI-2'), info('GUI-2'), async ({ as }) => {
    const { page, list } = await as('DNA');
    for (const b of [list.importButton(), list.exportButton(), list.addFromSystemButton(), list.addButton()]) await expect(b.first()).toBeVisible();
    for (const f of ['Nguồn dữ liệu', 'Phân loại thuốc', /(Doanh nghiệp|DN) vật tư đầu vào/, 'Trạng thái']) await expect(label(page, f as any)).toBeVisible();
    await expect(label(page, 'Đơn vị tạo dữ liệu')).toHaveCount(0);
    const hs = await list.headers();
    expectInOrder(hs, COLS_DN, 'Cột lưới');
    expect(hs).not.toContain('Đơn vị tạo dữ liệu');
    expect(hs).not.toContain('Đơn vị kế thừa');
  });

  test(T('GUI-13'), info('GUI-13'), async ({ as }) => {
    const { list } = await as('HT');
    const box = list.filterBox('Nguồn dữ liệu');
    await expect(box).toContainText('Hệ thống');
    await box.hover();
    await expect(box.locator('.ant-tag-close-icon, .ant-select-selection-item-remove, .p-chip-remove-icon, [class*="remove"], [class*="close"]').first()).toBeVisible();
  });

  test(T('GUI-14'), info('GUI-14'), async ({ as }) => {
    const { page, list } = await as('HT');
    await list.filterBox('Nguồn dữ liệu').locator(UI.selectTrigger).first().click();
    const panel = page.locator(UI.selectPanel).last();
    await expect(panel).toBeVisible();
    const opts = (await panel.locator(UI.selectOption).allInnerTexts()).map(norm).filter(Boolean);
    expect(opts).toEqual(SOURCES_HT);
    // Chọn nhiều: có checkbox trong option hoặc listbox cho phép chọn nhiều
    const multi = (await panel.locator(UI.checkbox).count()) > 0 || (await panel.locator('[aria-multiselectable="true"]').count()) > 0
      || (await list.filterBox('Nguồn dữ liệu').locator('.ant-select-multiple, .p-multiselect').count()) > 0;
    expect(multi, 'Nguồn dữ liệu phải cho chọn nhiều (có checkbox)').toBeTruthy();
  });

  test(T('GUI-16'), info('GUI-16'), async ({ as }) => {
    const { page, list } = await as('DNA');
    const box = list.filterBox('Nguồn dữ liệu');
    await expect(box).toContainText(/Chọn nguồn dữ liệu/i);
    await box.locator(UI.selectTrigger).first().click();
    const panel = page.locator(UI.selectPanel).last();
    const opts = (await panel.locator(UI.selectOption).allInnerTexts()).map(norm).filter(Boolean);
    expect(opts).toEqual(['Doanh nghiệp', 'DN kế thừa']);
    await expect(panel.locator(UI.checkbox)).toHaveCount(0);
  });

  test(T('GUI-17'), info('GUI-17'), async ({ as }) => {
    const ht = await as('HT');
    await expect(label(ht.page, 'Đơn vị tạo dữ liệu')).toBeVisible();
    await expect(ht.list.filterBox('Đơn vị tạo dữ liệu')).toContainText('Hệ thống');
    const dn = await as('DNA');
    await expect(label(dn.page, 'Đơn vị tạo dữ liệu')).toHaveCount(0);
  });

  test(T('GUI-34'), info('GUI-34'), async ({ as }) => {
    need({ HT_MULTI_MAIN_NAME: PRE.htMultiMainName, HT_MULTI_MAIN_HOAT_CHAT: PRE.htMultiMainExpected });
    const { list } = await as('HT');
    const r = await list.mustFind(PRE.htMultiMainName);
    const set = (x: string) => x.split(',').map((y) => y.trim()).filter(Boolean).sort();
    expect(set(await list.cell(r, 'Hoạt chất'))).toEqual(set(PRE.htMultiMainExpected));
  });

  test(T('GUI-38'), info('GUI-38'), async ({ as }) => {
    const { list } = await as('HT');
    const r = await list.mustFind(PRE.ht1Name);
    expect(await list.hasIcon(r, 'view')).toBeTruthy();
    expect(await list.hasIcon(r, 'edit')).toBeTruthy();
    expect(await list.hasIcon(r, 'more')).toBeTruthy();
    const menu = await list.openMenu(r);
    await expect(menu.locator(UI.menuItem).filter({ hasText: vn('Xoá') }).first()).toBeVisible();
    await expect(menu.locator(UI.menuItem).filter({ hasText: /Xem lịch sử thao tác/ }).first()).toBeVisible();
  });

  test(T('GUI-39'), info('GUI-39'), async ({ as }) => {
    const { list } = await as('HT');
    for (const n of [PRE.dnaName, PRE.nh1Name].filter(Boolean)) {
      const r = await list.findAny(n, true);
      expect(r, `Không thấy "${n}" sau khi bỏ lọc`).not.toBeNull();
      expect(await list.hasIcon(r!, 'view'), `${n}: thiếu icon Xem`).toBeTruthy();
      expect(await list.hasIcon(r!, 'edit'), `${n}: không được có icon Cập nhật`).toBeFalsy();
      expect(await list.hasIcon(r!, 'more'), `${n}: không được có •••`).toBeFalsy();
    }
  });

  test(T('GUI-40'), info('GUI-40'), async ({ as }) => {
    const { list } = await as('DNA');
    const r = await list.mustFind(PRE.dnaName);
    expect(await list.hasIcon(r, 'view')).toBeTruthy();
    expect(await list.hasIcon(r, 'edit')).toBeTruthy();
    const menu = await list.openMenu(r);
    await expect(menu.locator(UI.menuItem).filter({ hasText: vn('Xoá') }).first()).toBeVisible();
    await expect(menu.locator(UI.menuItem).filter({ hasText: /Xem lịch sử thao tác/ }).first()).toBeVisible();
  });
});
