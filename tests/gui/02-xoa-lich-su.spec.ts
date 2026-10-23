import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { PRE } from '../../src/env';
import { MSG, UI } from '../../src/ui';
import { required } from '../../src/data';
import { expectInOrder, expectToastTopRightAutoClose, need, rx } from '../../src/helpers';
import { exact } from '../../src/pages/common';

test.describe('GUI - Popup Xác nhận xoá, thông báo xoá, popup Lịch sử thao tác', () => {
  test(T('GUI-48'), info('GUI-48'), async ({ as }) => {
    // Chỉ mở popup rồi Huỷ -> không làm mất bản ghi mẫu
    const { page, list } = await as('HT');
    await list.startDelete(PRE.ht3Name);
    const dlg = list.confirmDialog();
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText(exact('Thông báo')).first()).toBeVisible();
    await expect(dlg).toContainText(rx(MSG.confirmDelete(PRE.ht3Name, PRE.ht3Code)));
    await expect(dlg.locator(UI.dialogClose).first()).toBeVisible();
    await expect(dlg.getByRole('button', { name: /Hu[ỷy]/ })).toBeVisible();
    await expect(dlg.getByRole('button', { name: /Xác nhận/ })).toBeVisible();
    // Popup nằm giữa màn hình
    const b = (await dlg.boundingBox())!; const vp = page.viewportSize()!;
    expect(Math.abs(b.x + b.width / 2 - vp.width / 2)).toBeLessThan(vp.width * 0.1);
    await dlg.getByRole('button', { name: /Hu[ỷy]/ }).click();
    await expect(dlg).toBeHidden();
  });

  test(T('GUI-50'), info('GUI-50'), async ({ as, seed }) => {
    // Dùng bản ghi tự tạo thay cho "Gramozin 20" để không xoá dữ liệu mẫu
    const rec = await seed('HT', required());
    const { page, list } = await as('HT');
    await list.startDelete(rec.ma!);
    await list.confirmDelete();
    await expectToastTopRightAutoClose(page, MSG.deleteOk);
  });

  test(T('GUI-51'), info('GUI-51'), async ({ as }) => {
    need({ HT_USED_CODE: PRE.htUsedCode, HT_USED_NAME: PRE.htUsedName });
    const { page, list } = await as('HT');
    await list.startDelete(PRE.htUsedCode);
    const msg = page.getByText(rx(MSG.inUse(PRE.htUsedName, PRE.htUsedCode))).first();
    await expect(msg).toBeVisible();
    const dlg = page.locator(UI.dialog).filter({ hasText: rx('Không thể xoá') }).last();
    await expect(dlg.getByRole('button', { name: /^\s*Đóng\s*$/ })).toBeVisible();
    await dlg.getByRole('button', { name: /^\s*Đóng\s*$/ }).click();
  });

  test(T('GUI-52'), info('GUI-52'), async ({ as }) => {
    const { list } = await as('HT');
    const h = await list.openHistory(PRE.ht1Name);
    await expect(h.dialog.getByText(/^\s*Lịch sử thao tác\s*$/).first()).toBeVisible();
    await expect(h.dialog.locator(UI.dialogClose).first()).toBeVisible();
    const hs = (await h.dialog.locator('thead th').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
    expectInOrder(hs, ['STT', 'Người xử lý', 'Tài khoản xử lý', 'Thao tác xử lý', 'Nội dung xử lý', 'Thời gian xử lý'], 'Cột Lịch sử');
    await expect.soft(h.dialog.locator(UI.pager).first(), 'Phân trang').toBeVisible();
    await expect(h.dialog.getByRole('button', { name: /^\s*Đóng\s*$/ })).toBeVisible();
  });

  test(T('GUI-54'), info('GUI-54'), async ({ as }) => {
    const { list } = await as('HT');
    const h = await list.openHistory(PRE.ht1Name);
    const rows = await h.rows();
    expect(rows.length, 'Bản ghi chưa có lịch sử').toBeGreaterThan(0);
    for (const r of rows) expect(r.thoiGian).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  });
});
