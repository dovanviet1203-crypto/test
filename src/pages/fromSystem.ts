import { expect, Locator, Page } from '@playwright/test';
import { UI, TITLES } from '../ui';
import { norm } from '../data';
import { exact, textOf, vn } from './common';

/** Popup "Thêm mới Thuốc thuỷ sản từ hệ thống" (danh sách dạng thẻ) + popup Trùng dữ liệu */
export class FromSystemPopup {
  readonly dialog: Locator;
  constructor(readonly page: Page) {
    this.dialog = page.locator(UI.dialog).filter({ hasText: vn(TITLES.fromSystem) }).last();
  }
  async waitOpen() { await expect(this.dialog).toBeVisible(); await this.page.waitForLoadState('networkidle').catch(() => {}); }

  searchBox() { return this.dialog.locator(UI.searchBox).first(); }
  async search(keyword: string) {
    await this.searchBox().fill(keyword);
    const btn = this.dialog.getByRole('button', { name: /Tìm kiếm/ }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click(); else await this.searchBox().press('Enter');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }
  /** Chọn giá trị cho trường "Bộ lọc" (Dữ liệu chưa thêm / Dữ liệu đã thêm) */
  async setTag(value: RegExp) {
    const tag = this.dialog.getByText(value).first();
    if (await tag.isVisible().catch(() => false)) { await tag.click(); return; }
    const box = this.dialog.getByText(/^\s*Bộ lọc\s*:?\s*$/).first().locator('xpath=ancestor::*[.//*[@role="combobox"] or .//select][1]');
    await box.locator(UI.selectTrigger).first().click();
    await this.page.locator(UI.selectOption).filter({ hasText: value }).first().click({ timeout: 8000 });
  }
  async clearTag() {
    const box = this.dialog.getByText(/^\s*Bộ lọc\s*:?\s*$/).first().locator('xpath=ancestor::*[.//*[@role="combobox"] or .//select][1]');
    await box.hover().catch(() => {});
    const x = box.locator(UI.selectClear).first();
    if (await x.isVisible().catch(() => false)) await x.click();
  }
  cards(): Locator { return this.dialog.locator(`.from-system-item, ${UI.card}`).filter({ has: this.page.locator(UI.checkbox) }); }
  card(name: string): Locator { return this.cards().filter({ hasText: exact(name) }).or(this.cards().filter({ hasText: name })).first(); }
  async cardNames(): Promise<string[]> { return (await this.cards().allInnerTexts()).map(norm); }
  async tick(name: string) { await this.card(name).locator(UI.checkbox).first().click(); }
  /** "Chọn tất cả (x/y)" */
  async counter(): Promise<{ sel: number; total: number } | null> {
    const t = await textOf(this.dialog.getByText(/Chọn tất cả\s*\(\d+\s*\/\s*\d+\)/).first());
    const m = t.match(/\((\d+)\s*\/\s*(\d+)\)/);
    return m ? { sel: +m[1], total: +m[2] } : null;
  }
  async save() { await this.dialog.getByRole('button', { name: exact('Lưu') }).click(); }
  async cancel() { await this.dialog.getByRole('button', { name: /^\s*Hủy\s*$|^\s*Huỷ\s*$/ }).click(); }

  /** Popup Thông báo Trùng dữ liệu */
  dupDialog(): Locator { return this.page.locator(UI.dialog).filter({ hasText: /Danh sách trùng/ }).last(); }
  async confirmDup() { await this.dupDialog().getByRole('button', { name: /Xác nhận/ }).click(); }
}
