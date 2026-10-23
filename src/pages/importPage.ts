import { expect, Locator, Page, test } from '@playwright/test';
import { UI, TITLES } from '../ui';
import { norm } from '../data';
import { textOf, vn } from './common';

/** Màn "Thêm Thuốc thuỷ sản từ Excel" */
export class ImportPage {
  constructor(readonly page: Page) {}
  title() { return this.page.getByText(new RegExp(`^\\s*${vn(TITLES.importPage).source}\\s*$`)).first(); }
  async waitOpen() { await expect(this.title()).toBeVisible({ timeout: 30_000 }); }

  /** Nhãn "Xuất dữ liệu mẫu" chỉ là chữ thường; link tải thật là tên file mẫu bên cạnh */
  templateLink() { return this.page.getByText(/Template_Import_ThuocThuySan\.xlsx/).first(); }
  async downloadTemplate(): Promise<string> {
    const [dl] = await Promise.all([this.page.waitForEvent('download', { timeout: 60_000 }), this.templateLink().click()]);
    const p = test.info().outputPath(`mau_${dl.suggestedFilename()}`);
    await dl.saveAs(p);
    return p;
  }
  fileInput() { return this.page.locator(UI.fileInput).first(); }
  async choose(file: string | string[]) { await this.fileInput().setInputFiles(file); }
  button(name: RegExp): Locator { return this.page.getByRole('button', { name }).first(); }
  checkBtn() { return this.button(/^\s*Kiểm tra\s*$/); }
  cancelBtn() { return this.button(/^\s*Hu[ỷy]\s*$/); }
  uploadBtn() { return this.button(/Tải lên hệ thống/); }
  async check() { await this.checkBtn().click(); await this.page.waitForLoadState('networkidle').catch(() => {}); await expect(this.table()).toBeVisible({ timeout: 30_000 }); }

  table() { return this.page.locator(UI.table).last(); }
  rows() { return this.table().locator('tbody tr').filter({ has: this.page.locator('td') }); }
  async headers() { return (await this.table().locator('thead th').allInnerTexts()).map(norm).filter(Boolean); }
  async rowTexts(): Promise<string[]> { return (await this.rows().allInnerTexts()).map(norm); }
  /** "Tải lên: x/y bản ghi" */
  async uploadLabel(): Promise<{ ok: number; total: number } | null> {
    const t = await textOf(this.page.getByText(/Tải lên\s*:\s*\d+\s*\/\s*\d+/).first());
    const m = t.match(/(\d+)\s*\/\s*(\d+)/);
    return m ? { ok: +m[1], total: +m[2] } : null;
  }
  async isUploadEnabled() { return this.uploadBtn().isEnabled(); }
  async deleteRow(i: number) {
    const row = this.rows().nth(i);
    const del = row.locator(UI.subDelete).first();
    await ((await del.count()) ? del : row.locator('td').last().locator('button, i, svg').last()).click();
  }
}
