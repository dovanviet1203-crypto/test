import { expect, Locator, Page } from '@playwright/test';
import { UI } from '../ui';
import { norm } from '../data';

export const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const exact = (s: string) => new RegExp(`^\\s*${esc(s)}\\s*$`);

/** Hai kiểu đặt dấu tiếng Việt: "xoá" = "xóa", "thuỷ" = "thủy"... */
const PAIRS: [string, string][] = [['oá', 'óa'], ['oà', 'òa'], ['oả', 'ỏa'], ['oã', 'õa'], ['oạ', 'ọa'], ['oé', 'óe'], ['uý', 'úy'], ['uỳ', 'ùy'], ['uỷ', 'ủy'], ['uỹ', 'ũy'], ['uỵ', 'ụy']];
const VARIANT = new Map<string, string>();
for (const [a, b] of PAIRS) for (const [x, y] of [[a, b], [b, a], [a.toUpperCase(), b.toUpperCase()], [b.toUpperCase(), a.toUpperCase()]]) VARIANT.set(x, y);
const VARIANT_RE = new RegExp([...VARIANT.keys()].join('|'), 'g');
export function vnPattern(s: string): string {
  return esc(s.normalize('NFC')).replace(VARIANT_RE, (m) => `(?:${m}|${VARIANT.get(m)})`);
}
/** RegExp khớp chuỗi, không phân biệt kiểu đặt dấu */
export const vn = (s: string, flags = '') => new RegExp(vnPattern(s), flags);

/** Phần tử nhãn của 1 trường (khớp đúng chữ, cho phép dấu * và dấu :) */
export function labelOf(root: Locator, label: string): Locator {
  const re = new RegExp(`^\\s*\\*?\\s*${esc(label)}\\s*\\*?\\s*:?\\s*$`);
  // Bỏ qua khối bao ngoài có chứa ô nhập (khi ô trống, text của khối bao = đúng chữ nhãn)
  const ctl = root.page().locator('input:not([type="checkbox"]):not([type="radio"]), textarea, [role="combobox"], select');
  const tags = 'label, span, div, p, legend, strong, b, th, td';
  // ...và lấy phần tử trong cùng (không có phần tử con nào cũng khớp đúng chữ nhãn)
  const inner = root.page().locator(tags).filter({ hasText: re });
  return root.locator(tags).filter({ hasText: re, hasNot: ctl }).filter({ hasNot: inner }).first();
}

/** Khung chứa trường nhập = tổ tiên gần nhất của nhãn có chứa control nhập liệu */
export function fieldBox(root: Locator, label: string): Locator {
  return labelOf(root, label).locator(
    'xpath=ancestor::*[.//input[not(@type="hidden")] or .//textarea or .//*[@role="combobox"] or .//select][1]',
  );
}

/**
 * App chèn tên danh mục vào giữa câu: "Thêm mới thành công" -> "Thêm mới thuốc thủy sản thành công"
 * -> cho phép chữ chen giữa trước "thành công".
 */
function looseMsg(text: string | RegExp): RegExp {
  const re = typeof text === 'string' ? vn(text) : text;
  return new RegExp(re.source.replace(/ thành công/, '(?: [^\\n]*?)? thành công'), re.flags.includes('i') ? re.flags : re.flags + 'i');
}

export function toast(page: Page, text?: string | RegExp): Locator {
  const t = page.locator(UI.toast);
  return text ? t.filter({ hasText: looseMsg(text) }).first() : t.first();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(toast(page, text)).toBeVisible({ timeout: 15_000 });
}

/** Thông báo nằm góc trên bên phải màn hình */
export async function expectTopRight(page: Page, loc: Locator) {
  const box = await loc.boundingBox();
  const vp = page.viewportSize()!;
  expect(box, 'Không lấy được vị trí thông báo').not.toBeNull();
  expect(box!.x + box!.width / 2).toBeGreaterThan(vp.width / 2);
  expect(box!.y).toBeLessThan(vp.height / 3);
}

/** Đo thời gian tự đóng của thông báo (ms) - trả về -1 nếu sau maxMs vẫn còn */
export async function autoCloseMs(loc: Locator, maxMs = 8000): Promise<number> {
  const start = Date.now();
  try {
    await loc.waitFor({ state: 'hidden', timeout: maxMs });
    return Date.now() - start;
  } catch {
    return -1;
  }
}

export async function textOf(loc: Locator): Promise<string> {
  return norm(await loc.innerText().catch(() => ''));
}

/** Kiểm tra phần tử `below` nằm ngay dưới phần tử `above` (không đè lên) */
export async function expectBelow(above: Locator, below: Locator) {
  const a = await above.boundingBox();
  const b = await below.boundingBox();
  expect(a && b, 'Không lấy được vị trí phần tử').toBeTruthy();
  expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height - 2);
  expect(b!.y - (a!.y + a!.height)).toBeLessThan(60);
}

/** Trả về true nếu màu viền của phần tử thiên về đỏ */
export async function hasRedBorder(loc: Locator): Promise<boolean> {
  return loc.evaluate((el) => {
    const pick = (e: Element | null): string => {
      let cur = e as HTMLElement | null;
      for (let i = 0; i < 4 && cur; i++, cur = cur.parentElement) {
        const c = getComputedStyle(cur).borderColor || '';
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m && +m[1] > 180 && +m[2] < 120 && +m[3] < 120) return 'red';
        const cls = (cur.className || '').toString();
        if (/error|invalid|ng-invalid.*ng-touched|is-invalid|status-error/i.test(cls)) return 'red';
      }
      return '';
    };
    return pick(el) === 'red';
  });
}

/**
 * Chọn 1 giá trị trong dropdown đang mở: khớp đúng chữ -> khớp chứa chữ (không phân biệt hoa thường).
 * Không thấy thì báo lỗi kèm DANH SÁCH GIÁ TRỊ ĐANG CÓ để biết sửa Test data / .env thế nào.
 */
export async function pickOption(page: Page, value: string, field = '') {
  const opts = page.locator(UI.selectOption);
  const exactOpt = opts.filter({ hasText: new RegExp(`^\\s*${vnPattern(value)}\\s*$`, 'i') }).first();
  const looseOpt = opts.filter({ hasText: vn(value, 'i') }).first();
  for (const o of [exactOpt, looseOpt]) {
    if (await o.waitFor({ state: 'visible', timeout: o === exactOpt ? 6000 : 2000 }).then(() => true, () => false)) { await o.click(); return; }
  }
  const visible = (await opts.allInnerTexts().catch(() => [])).map(norm).filter(Boolean);
  const panel = (await page.locator(UI.selectPanel).last().innerText().catch(() => '')).split('\n').map(norm).filter(Boolean);
  const shot = (await import('@playwright/test')).test.info().outputPath(`chon-${field || 'dropdown'}.png`.replace(/[^\w.-]+/g, '_'));
  await page.screenshot({ path: shot }).catch(() => {});
  throw new Error([
    `Không chọn được "${value}"${field ? ` ở trường "${field}"` : ''}.`,
    visible.length ? `- Các lựa chọn đang hiển thị: ${visible.slice(0, 30).join(' | ')}` : '- Không thấy phần tử lựa chọn nào khớp selector UI.selectOption (src/ui.ts).',
    !visible.length && panel.length ? `- Chữ trong khung dropdown đang mở: ${panel.slice(0, 30).join(' | ')} -> dropdown dùng thư viện khác, cần thêm selector vào UI.selectOption` : '',
    '- Nếu giá trị trên staging tên khác: sửa trong .env (PHAN_LOAI, DVT, HINH_THUC, XUAT_XU, DN_VAT_TU...) hoặc src/seedData.ts',
    `- Ảnh chụp: ${shot}`,
  ].filter(Boolean).join('\n'));
}

/** true nếu có ÍT NHẤT 1 phần tử khớp đang hiển thị (tránh lỗi .first() trúng phần tử ẩn, vd mục menu bị thu gọn) */
export async function anyVisible(loc: Locator, max = 30): Promise<boolean> {
  const n = Math.min(await loc.count().catch(() => 0), max);
  for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible().catch(() => false)) return true;
  return false;
}
/** Đợi đến khi màn Danh mục Thuốc thuỷ sản hiển thị: thấy tiêu đề hoặc thấy cột "Mã thuốc" của lưới */
export async function waitListShown(page: Page, timeout = 30_000): Promise<boolean> {
  return expect.poll(async () => (await anyVisible(page.getByText(UI.listTitle))) || (await anyVisible(page.locator('th').filter({ hasText: UI.listMarker }))),
    { timeout, intervals: [300, 500, 1000] }).toBe(true).then(() => true, () => false);
}
