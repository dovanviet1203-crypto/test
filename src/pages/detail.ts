import { expect, Locator, Page } from '@playwright/test';
import { UI, TITLES, LABELS } from '../ui';
import { norm } from '../data';
import { exact, labelOf, textOf, vn } from './common';

/** Popup Chi tiết Thuốc thuỷ sản */
export class DetailPopup {
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.dialog = page.locator(UI.dialog).filter({ hasText: vn(TITLES.detail) }).last();
  }
  async waitOpen() { await expect(this.dialog).toBeVisible(); }

  label(label: string) { return labelOf(this.dialog, label); }
  /** Giá trị hiển thị của 1 trường = text của khối chứa nhãn trừ đi chính nhãn */
  async value(label: string): Promise<string> {
    const raw = await this.label(label).evaluate((el) => {
      const own = (el.textContent || '').trim();
      let cur: HTMLElement | null = el as HTMLElement;
      for (let i = 0; i < 5 && cur; i++) {
        cur = cur.parentElement;
        if (!cur) break;
        const inp = cur.querySelector('input:not([type=checkbox]), textarea') as HTMLInputElement | null;
        if (inp) return inp.value;
        const txt = (cur.innerText || '').trim();
        if (txt.length > own.length) return txt.slice(txt.indexOf(own) + own.length);
        if (cur.children.length > 1) return '';
      }
      return '';
    });
    return norm(raw.replace(/^\s*\*?\s*:?/, ''));
  }
  /** Bảng con (Hoạt chất / Đối tượng phòng trừ) trên Chi tiết */
  table(title: string): Locator {
    return this.dialog.getByText(exact(title)).first().locator('xpath=following::table[1]');
  }
  async tableHeaders(title: string) { return (await this.table(title).locator('thead th').allInnerTexts()).map(norm).filter(Boolean); }
  tableRows(title: string) { return this.table(title).locator('tbody tr').filter({ has: this.page.locator('td') }).filter({ hasNotText: /Chưa có dữ liệu|Không có dữ liệu/ }); }
  async tableTexts(title: string): Promise<string[]> { return (await this.tableRows(title).allInnerTexts()).map(norm); }
  hoatChatRows() { return this.tableRows(LABELS.hoatChatTitle); }
  doiTuongRows() { return this.tableRows(LABELS.doiTuongTitle); }
  images() { return this.dialog.locator('img'); }
  async editableCount(): Promise<number> {
    return this.dialog.locator('input:not([type=checkbox]):not([type=hidden]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])').count();
  }
  async close() { await this.dialog.getByRole('button', { name: exact('Đóng') }).click(); await expect(this.dialog).toBeHidden(); }
  async closeX() { await this.dialog.locator(UI.dialogClose).first().click(); await expect(this.dialog).toBeHidden(); }
  async text() { return textOf(this.dialog); }
}
