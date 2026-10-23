import { expect, Locator, Page } from '@playwright/test';
import { UI } from '../ui';
import { norm } from '../data';

export type LogRow = { nguoi: string; taiKhoan: string; thaoTac: string; thoiGian: string; noiDung: string; raw: string[] };

/** Popup Lịch sử thao tác */
export class HistoryPopup {
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.dialog = page.locator(UI.dialog).filter({ hasText: /Lịch sử thao tác/ }).last();
  }
  async waitOpen() { await expect(this.dialog).toBeVisible(); await this.page.waitForLoadState('networkidle').catch(() => {}); }

  async rows(): Promise<LogRow[]> {
    const headers = (await this.dialog.locator('thead th').allInnerTexts()).map(norm);
    const idx = (re: RegExp) => headers.findIndex((h) => re.test(h));
    const iN = idx(/Người xử lý/), iT = idx(/Tài khoản/), iA = idx(/Thao tác/), iG = idx(/Thời gian/), iC = idx(/Nội dung/);
    const trs = this.dialog.locator('tbody tr').filter({ has: this.page.locator('td') });
    const n = await trs.count();
    const out: LogRow[] = [];
    for (let i = 0; i < n; i++) {
      const raw = (await trs.nth(i).locator('td').allInnerTexts()).map(norm);
      if (raw.length < 2) continue;
      out.push({ nguoi: raw[iN] ?? '', taiKhoan: raw[iT] ?? '', thaoTac: raw[iA] ?? '', thoiGian: raw[iG] ?? '', noiDung: raw[iC] ?? '', raw });
    }
    return out;
  }
  async count(action?: RegExp) { return (await this.rows()).filter((r) => !action || action.test(r.thaoTac)).length; }
  async close() {
    const btn = this.dialog.getByRole('button', { name: /Đóng/ });
    if (await btn.count()) await btn.first().click(); else await this.dialog.locator(UI.dialogClose).first().click();
    await expect(this.dialog).toBeHidden();
  }
}

/** Parse "dd/mm/yyyy hh:mm:ss" -> Date (giờ địa phương) */
export function parseVnTime(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]) : null;
}
