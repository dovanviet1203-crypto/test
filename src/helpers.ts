import { expect, Page } from '@playwright/test';
import { test, Actor } from './fixtures';
import { ThuocRecord, norm, required } from './data';
import { DetailPopup } from './pages/detail';
import { MSG, UI, LABELS, TITLES } from './ui';
import { TtsForm } from './pages/form';
import { expectToast, toast, vn, waitListShown } from './pages/common';
import { Role } from './env';

/** Bỏ qua test khi thiếu dữ liệu tiền điều kiện (.env) */
export function need(values: Record<string, string | undefined>) {
  const missing = Object.entries(values).filter(([, v]) => !v).map(([k]) => k);
  test.skip(missing.length > 0, `Thiếu tiền điều kiện trong .env: ${missing.join(', ')}`);
}

/** Bước cần kiểm tra bằng mắt / cần module khác -> đánh dấu kiểm thử thủ công */
export function manual(reason: string) {
  test.fixme(true, `Kiểm thử thủ công: ${reason}`);
}

export const rx = (s: string) => vn(s);

export async function expectFieldError(f: TtsForm, label: string, msg: string) {
  await expect(f.box(label).getByText(rx(msg)).first()).toBeVisible();
}
/** Popup vẫn mở, không có toast thành công */
export async function expectNotSaved(page: Page, f: TtsForm) {
  await expect(f.dialog).toBeVisible();
  await expect(toast(page, rx(MSG.addOk))).toHaveCount(0);
}
export async function saveOk(page: Page, f: TtsForm, msg = MSG.addOk) {
  await f.save();
  await expectToast(page, rx(msg));
  await expect(f.dialog).toBeHidden();
}
export { LABELS, MSG, TITLES, UI, norm };

export type Ctx = { a: Actor; f: TtsForm };
type AsFn = (r: Role, o?: { goto?: boolean }) => Promise<Actor>;
type TrackFn = (r: Role, c: string) => void;

export async function openAdd(as: AsFn, role: Role = 'HT'): Promise<Ctx> {
  const a = await as(role);
  return { a, f: await a.list.openAdd() };
}

/** Thêm mới qua popup, lưu thành công, đăng ký dọn. Trả về bản ghi đã lưu */
export async function addViaUi(c: Ctx, track: TrackFn, rec: ThuocRecord, role: Role = 'HT'): Promise<ThuocRecord> {
  await c.f.fill(rec);
  await c.f.save();
  await expectToast(c.a.page, rx(MSG.addOk));
  track(role, rec.ma!.trim());
  await expect(c.f.dialog).toBeHidden();
  return rec;
}

/** Lưu thành công + đăng ký dọn + mở Chi tiết */
export async function saveAndOpenDetail(c: Ctx, track: TrackFn, ma: string, role: Role = 'HT'): Promise<DetailPopup> {
  await c.f.save();
  await expectToast(c.a.page, rx(MSG.addOk));
  track(role, ma.trim());
  await expect(c.f.dialog).toBeHidden();
  return c.a.list.openDetail(ma.trim());
}

/**
 * Case validate dạng "điền 7 trường bắt buộc, thay đổi 1 trường, nhấn Lưu".
 * Trả về form + mã đã dùng để case tự kiểm tra kết quả.
 */
export async function validateAdd(as: AsFn, track: TrackFn, over: Partial<ThuocRecord>, role: Role = 'HT') {
  const c = await openAdd(as, role);
  const rec = required(over);
  await c.f.fill(rec);
  await c.f.save();
  return { ...c, rec };
}

/** Mở menu điều hướng đến màn danh mục (Quản trị hệ thống >> Danh mục Nguyên vật liệu >> ...) */
export async function navByMenu(page: Page) {
  await page.goto('/');
  for (const t of [/Quản trị hệ thống/, /Danh mục Nguyên vật liệu/, /Danh mục Thuốc th(?:uỷ|ủy|uy) sản|Thuốc th(?:uỷ|ủy|uy) sản/]) {
    const m = page.getByRole('menuitem', { name: t }).or(page.getByRole('link', { name: t })).or(page.getByText(t)).first();
    await m.click();
  }
  expect(await waitListShown(page), 'Không mở được màn Danh mục Thuốc thuỷ sản qua menu').toBe(true);
}

/** Các phần tử mong đợi xuất hiện trong `actual` đúng thứ tự (cho phép có phần tử khác xen giữa) */
export function expectInOrder(actual: string[], expected: (string | RegExp)[], what = 'danh sách') {
  let pos = -1;
  for (const e of expected) {
    const i = actual.findIndex((a, k) => k > pos && (typeof e === 'string' ? norm(a).toLowerCase() === e.toLowerCase() : e.test(a)));
    expect(i, `${what}: không thấy "${e}" (sau vị trí ${pos}). Thực tế: ${actual.join(' | ')}`).toBeGreaterThan(pos);
    pos = i;
  }
}
/** Nhãn có dấu * (dạng text hoặc ::before/::after của CSS) */
export async function hasAsterisk(label: import('@playwright/test').Locator): Promise<boolean> {
  return label.evaluate((el) => {
    for (let cur: Element | null = el, i = 0; cur && i < 2; cur = cur.parentElement, i++) {
      if ((cur.textContent || '').includes('*')) return true;
      for (const p of ['::before', '::after']) if ((getComputedStyle(cur, p).content || '').includes('*')) return true;
      if (cur.querySelector('[class*="required"]') || /required/.test((cur as HTMLElement).className || '')) return true;
    }
    return false;
  });
}
/** Toast hiển thị góc trên bên phải và tự tắt sau khoảng 3 giây */
export async function expectToastTopRightAutoClose(page: Page, text: string) {
  const { toast: t, expectTopRight, autoCloseMs } = await import('./pages/common');
  const loc = t(page, rx(text));
  await expect(loc).toBeVisible({ timeout: 15_000 });
  await expectTopRight(page, loc);
  const ms = await autoCloseMs(loc, 9000);
  expect(ms, 'Toast không tự tắt').toBeGreaterThan(0);
  expect(ms, `Toast tự tắt sau ${ms}ms (mong đợi ~3s)`).toBeLessThan(6000);
}
/** Toggle 1 dòng trên lưới và chờ toast */
export async function toggleRow(a: Actor, key: string, toastText = MSG.editOk) {
  const r = await a.list.mustFind(key);
  await a.list.rowSwitch(r).click();
  await expectToast(a.page, rx(toastText));
}
