import { expect, Locator, Page, test } from '@playwright/test';
import { PATHS } from '../env';
import { UI, MSG, TITLES } from '../ui';
import { norm } from '../data';
import { esc, exact, pickOption, textOf, toast, vn, waitListShown } from './common';

/** Mục "Xoá" trong menu ••• (chấp nhận cả "Xóa") */
export const DELETE_ITEM = /^\s*X(?:oá|óa|oa)\s*$/i;
import { TtsForm } from './form';
import { DetailPopup } from './detail';
import { HistoryPopup } from './history';
import { FromSystemPopup } from './fromSystem';
import { ImportPage } from './importPage';

let printedPath = false;

/** Màn hình Danh mục Thuốc thuỷ sản */
export class TtsList {
  constructor(readonly page: Page) {}

  /**
   * Mở màn danh mục. Chưa khai báo TTS_PATH thì đi qua menu
   * Quản trị hệ thống >> Danh mục Nguyên vật liệu >> Danh mục Thuốc thuỷ sản, rồi in ra đường dẫn để điền vào .env.
   */
  async goto() {
    if (PATHS.tts && PATHS.tts !== '/') {
      await this.page.goto(PATHS.tts);
    } else {
      await this.page.goto('/');
      for (const t of [/^\s*Quản trị hệ thống\s*$/, /^\s*Danh mục Nguyên vật liệu\s*$/, /^\s*(Danh mục )?Thuốc th(?:uỷ|ủy|uy) sản\s*$/]) {
        const m = this.page.getByRole('menuitem', { name: t }).or(this.page.getByRole('link', { name: t })).or(this.page.getByText(t)).first();
        await m.click({ timeout: 20_000 });
      }
      if (!printedPath) { printedPath = true; console.log(`[info] Đường dẫn màn Thuốc thuỷ sản: ${new URL(this.page.url()).pathname} -> điền vào TTS_PATH trong .env cho nhanh`); }
    }
    if (!(await waitListShown(this.page))) throw new Error(await this.diagnose());
    await this.waitTable();
  }
  /** Mô tả màn hiện tại khi không vào được màn danh mục (để biết sai do đâu) */
  async diagnose(): Promise<string> {
    const url = this.page.url();
    const shot = test.info().outputPath('khong-vao-duoc-man-danh-muc.png');
    await this.page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    const heads = (await this.page.locator('h1, h2, h3, .ant-breadcrumb, [class*="breadcrumb"], [class*="title"]').allInnerTexts().catch(() => []))
      .map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
    const login = /login|dang-nhap|signin/i.test(url) || (await this.page.locator('input[type="password"]').count()) > 0;
    return [
      'Không vào được màn Danh mục Thuốc thuỷ sản.',
      `- URL hiện tại: ${url}`,
      login ? '- Đang ở trang ĐĂNG NHẬP: sai tài khoản/mật khẩu hoặc phiên hết hạn -> xoá thư mục .auth rồi chạy lại, kiểm tra HT_/DNA_/DNB_ USER/PASS và LOGIN_PATH trong .env'
        : `- Tiêu đề / breadcrumb đang thấy: ${heads.join(' | ') || '(không đọc được)'}`,
      PATHS.tts && PATHS.tts !== '/' ? `- TTS_PATH đang là "${PATHS.tts}": kiểm tra lại đường dẫn (mở màn trên trình duyệt rồi chép phần sau ${process.env.BASE_URL})` : '- TTS_PATH đang trống: test đi qua menu',
      `- Ảnh chụp: ${shot}`,
    ].join('\n');
  }
  async waitTable() {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(this.page.locator(UI.table).first()).toBeVisible();
  }

  // ---------- tìm kiếm / lọc
  searchBox() { return this.page.locator(UI.searchBox).first(); }
  async search(keyword: string) {
    await this.searchBox().fill(keyword);
    const btn = this.page.getByRole('button', { name: /Tìm kiếm/ }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
    else await this.searchBox().press('Enter');
    await this.waitTable();
  }
  /** Chọn giá trị cho 1 bộ lọc dạng dropdown trên màn danh sách (Trạng thái, Đơn vị tạo dữ liệu...) */
  async filter(label: string, value: string) {
    const box = this.page.getByText(new RegExp(`^\\s*${esc(label)}\\s*:?\\s*$`)).first()
      .locator('xpath=ancestor::*[.//*[@role="combobox"] or .//select or .//*[contains(@class,"select") or contains(@class,"dropdown")]][1]');
    await box.locator(UI.selectTrigger).first().click();
    await pickOption(this.page, value, label);
  }
  filterBox(label: string): Locator {
    return this.page.getByText(new RegExp(`^\\s*${esc(label)}\\s*:?\\s*$`)).first()
      .locator('xpath=ancestor::*[.//*[@role="combobox"] or .//select or .//*[contains(@class,"select") or contains(@class,"dropdown")]][1]');
  }
  /** Bỏ giá trị đang chọn của 1 bộ lọc (nhấn icon x trong ô) */
  async clearFilter(label: string) {
    const box = this.filterBox(label);
    await box.hover();
    const x = box.locator(UI.selectClear).first();
    if (await x.isVisible().catch(() => false)) await x.click();
  }
  /**
   * Admin HT xem dữ liệu của 1 đơn vị (DN / Nông hộ).
   * Màn thật mặc định lọc "Nguồn dữ liệu = Hệ thống" nên phải bỏ bộ lọc Nguồn, nếu không sẽ không thấy bản ghi của DN.
   */
  async viewUnit(unitName: string, keyword = '') {
    await this.filter('Đơn vị tạo dữ liệu', unitName);
    await this.clearFilter('Nguồn dữ liệu');
    await this.search(keyword);
  }
  /** Số dòng mỗi trang đang chọn ở "Hiển thị [10] hàng trong tổng ..." */
  async pageSize(): Promise<number> {
    const t = await textOf(this.page.getByText(/hàng trong tổng/i).last().locator('xpath=ancestor::*[1]'));
    const m = t.match(/Hiển thị\s*(\d+)/i);
    return m ? Number(m[1]) : 10;
  }
  /** Chọn số dòng mỗi trang ở ô "Hiển thị"; trả về số dòng thực tế đang dùng */
  async setPageSize(n: number): Promise<number> {
    const box = this.page.getByText(/hàng trong tổng/i).last().locator('xpath=ancestor::*[1]');
    const trig = box.locator(UI.selectTrigger).first();
    if (await trig.isVisible().catch(() => false)) {
      await trig.click();
      const opt = this.page.locator(UI.selectOption).filter({ hasText: new RegExp(`^\\s*${n}\\b`) }).first();
      if (await opt.isVisible().catch(() => false)) { await opt.click(); await this.waitTable(); }
      else await this.page.keyboard.press('Escape');
    }
    return this.pageSize();
  }
  async filterAndSearch(filters: Record<string, string>, keyword = '') {
    for (const [k, v] of Object.entries(filters)) await this.filter(k, v);
    await this.search(keyword);
  }

  // ---------- lưới
  rows() { return this.page.locator(UI.tableRow).filter({ has: this.page.locator('td') }); }
  row(text: string): Locator {
    return this.rows().filter({ has: this.page.locator('td').filter({ hasText: exact(text) }) }).first();
  }
  async headers(): Promise<string[]> {
    return (await this.page.locator(`${UI.table} thead th`).allInnerTexts()).map(norm);
  }
  async colIndex(header: string | RegExp): Promise<number> {
    const hs = await this.headers();
    const i = hs.findIndex((h) => (typeof header === 'string' ? h === header : header.test(h)));
    if (i < 0) throw new Error(`Không thấy cột "${header}" trên lưới. Các cột: ${hs.join(' | ')}`);
    return i;
  }
  async cell(row: Locator, header: string | RegExp): Promise<string> {
    return textOf(row.locator('td').nth(await this.colIndex(header)));
  }
  async column(header: string | RegExp): Promise<string[]> {
    const i = await this.colIndex(header);
    return (await this.rows().locator(`td:nth-child(${i + 1})`).allInnerTexts()).map(norm);
  }
  async isEmpty() { return this.page.getByText(UI.emptyText).first().isVisible().catch(() => false); }
  async expectEmpty() { await expect(this.page.getByText(UI.emptyText).first()).toBeVisible(); }

  /** Tìm theo mã và trả về dòng tương ứng (không có -> null) */
  async find(code: string): Promise<Locator | null> {
    await this.search(code);
    return this.waitRow(code);
  }
  /** Đợi lưới tải xong kết quả: thấy dòng có `text` hoặc thấy "Không có dữ liệu" (tối đa 8s) */
  async waitRow(text: string, timeout = 8000): Promise<Locator | null> {
    const r = this.row(text);
    await expect(r.or(this.page.getByText(UI.emptyText).first()).first()).toBeVisible({ timeout }).catch(() => {});
    return (await r.count()) ? r : null;
  }
  async mustFind(code: string): Promise<Locator> {
    let r = await this.find(code);
    if (!r) { await this.page.waitForTimeout(1500); r = await this.find(code); } // lưới có thể đang tải lại sau thao tác trước
    expect(r, `Không tìm thấy bản ghi ${code} trên lưới`).not.toBeNull();
    return r!;
  }

  // ---------- tổng số / phân trang
  async total(): Promise<number> {
    // Màn thật hiển thị: "Hiển thị [10] hàng trong tổng 14 hàng"
    const t = await textOf(this.page.getByText(/tổng\s*(số)?\s*:?\s*\d+/i).last());
    const mm = t.match(/tổng\s*(?:số)?\s*:?\s*(\d[\d.,\s]*)/i);
    if (mm) return Number(mm[1].replace(/\D/g, ''));
    const m = t.match(/(\d[\d.,\s]*)/);
    return m ? Number(m[1].replace(/\D/g, '')) : NaN;
  }
  pager() { return this.page.locator(UI.pager).first(); }
  async gotoPage(n: number) {
    await this.pager().locator(UI.pagerItem).filter({ hasText: exact(String(n)) }).first().click();
    await this.waitTable();
  }
  async currentPage(): Promise<number> {
    const a = this.pager().locator('.ant-pagination-item-active, .p-highlight, .active, [aria-current="page"]').first();
    return Number(await textOf(a));
  }

  // ---------- icon thao tác trên dòng
  actionsCell(row: Locator) { return row.locator('td').last(); }
  private async action(row: Locator, sel: string, fallbackIndex: number): Promise<Locator> {
    const cell = this.actionsCell(row);
    const byAttr = cell.locator(sel).first();
    if (await byAttr.count()) return byAttr;
    return cell.locator('button, a, [role="button"], i, svg').nth(fallbackIndex);
  }
  viewIcon(row: Locator) { return this.action(row, UI.actionView, 0); }
  editIcon(row: Locator) { return this.action(row, UI.actionEdit, 1); }
  moreIcon(row: Locator) { return this.action(row, UI.actionMore, 2); }
  async hasIcon(row: Locator, kind: 'view' | 'edit' | 'more'): Promise<boolean> {
    const sel = kind === 'view' ? UI.actionView : kind === 'edit' ? UI.actionEdit : UI.actionMore;
    return (await this.actionsCell(row).locator(sel).count()) > 0;
  }
  async iconCount(row: Locator): Promise<number> {
    return this.actionsCell(row).locator('button, a, [role="button"]').count();
  }

  async openAdd(): Promise<TtsForm> {
    await this.button(/^\s*\+?\s*Thêm mới\s*$/).click();
    const f = new TtsForm(this.page, TITLES.add);
    await f.waitOpen();
    return f;
  }
  async openEdit(code: string): Promise<TtsForm> {
    const r = await this.mustFind(code);
    await (await this.editIcon(r)).click();
    const f = new TtsForm(this.page, TITLES.edit);
    await f.waitOpen();
    return f;
  }
  async openDetail(code: string): Promise<DetailPopup> {
    const r = await this.mustFind(code);
    await (await this.viewIcon(r)).click();
    const d = new DetailPopup(this.page);
    await d.waitOpen();
    return d;
  }
  async openMenu(row: Locator): Promise<Locator> {
    await (await this.moreIcon(row)).click();
    const menu = this.page.locator('[role="menu"], .ant-dropdown:not(.ant-dropdown-hidden), .p-menu, .mat-mdc-menu-panel, .dropdown-menu.show').last();
    await expect(menu).toBeVisible();
    return menu;
  }
  async menuAction(code: string, item: RegExp) {
    const r = await this.mustFind(code);
    const menu = await this.openMenu(r);
    await menu.locator(UI.menuItem).filter({ hasText: item }).first().click();
  }
  async openHistory(code: string): Promise<HistoryPopup> {
    await this.menuAction(code, /Xem lịch sử thao tác/);
    const h = new HistoryPopup(this.page);
    await h.waitOpen();
    return h;
  }

  // ---------- xoá
  confirmDialog() { return this.page.locator(UI.dialog).filter({ hasText: vn('Bạn có chắc chắn muốn xoá') }).last(); }
  async startDelete(code: string) { await this.menuAction(code, DELETE_ITEM); }
  /** Xoá theo dòng đang hiển thị (không tìm kiếm lại -> giữ nguyên trang/bộ lọc) */
  async startDeleteRow(row: Locator) {
    const menu = await this.openMenu(row);
    await menu.locator(UI.menuItem).filter({ hasText: DELETE_ITEM }).first().click();
  }
  async confirmDelete() {
    await this.confirmDialog().getByRole('button', { name: /Xác nhận/ }).click();
  }
  /** Xoá trọn vẹn 1 bản ghi (dùng cho dọn dữ liệu); trả về false nếu không xoá được */
  async deleteRecord(code: string): Promise<boolean> {
    let r = await this.find(code);
    if (!r) {
      // Bản ghi Ngừng hoạt động có thể bị ẩn bởi bộ lọc Trạng thái mặc định
      try { await this.filter('Trạng thái', 'Ngừng hoạt động'); r = await this.find(code); } catch { /* không có bộ lọc */ }
    }
    if (!r) return true;
    await this.startDelete(code);
    const dlg = this.confirmDialog();
    if (!(await dlg.isVisible({ timeout: 5000 }).catch(() => false))) return false;
    await this.confirmDelete();
    await expect(toast(this.page, vn(MSG.deleteOk))).toBeVisible({ timeout: 15_000 });
    return true;
  }

  // ---------- nút trên thanh công cụ
  button(name: RegExp) { return this.page.getByRole('button', { name }).first(); }
  addFromSystemButton() { return this.page.getByRole('button', { name: /Thêm từ hệ thống/ }); }
  importButton() { return this.page.getByRole('button', { name: /^\s*Nhập dữ liệu\s*$/ }); }
  exportButton() { return this.page.getByRole('button', { name: /^\s*Xuất dữ liệu\s*$/ }); }
  addButton() { return this.page.getByRole('button', { name: /^\s*\+?\s*Thêm mới\s*$/ }); }

  async openFromSystem(): Promise<FromSystemPopup> {
    await this.addFromSystemButton().first().click();
    const p = new FromSystemPopup(this.page);
    await p.waitOpen();
    return p;
  }
  async openImport(): Promise<ImportPage> {
    await this.importButton().first().click();
    const p = new ImportPage(this.page);
    await p.waitOpen();
    return p;
  }
  /** Nhấn [Xuất dữ liệu], trả về đường dẫn file tải về */
  async exportFile(): Promise<{ path: string; name: string }> {
    const [dl] = await Promise.all([this.page.waitForEvent('download', { timeout: 60_000 }), this.exportButton().first().click()]);
    const p = test.info().outputPath(dl.suggestedFilename());
    await dl.saveAs(p);
    return { path: p, name: dl.suggestedFilename() };
  }
  /** Bỏ hết điều kiện lọc mặc định (Nguồn dữ liệu, Đơn vị tạo dữ liệu, Trạng thái) */
  async clearAllFilters() {
    const btn = this.page.getByRole('button', { name: /Xo[áa] bộ lọc/ }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
    for (const l of ['Nguồn dữ liệu', 'Đơn vị tạo dữ liệu', 'Trạng thái']) await this.clearFilter(l).catch(() => {});
  }
  /** Bỏ lọc rồi tìm theo từ khoá (dùng khi cần thấy bản ghi của mọi nguồn) */
  async searchAll(keyword: string) {
    await this.clearAllFilters();
    await this.search(keyword);
  }
  /** Toggle Trạng thái trên dòng */
  rowSwitch(row: Locator) { return row.locator(UI.rowSwitch).first(); }
  async isSwitchDisabled(row: Locator): Promise<boolean> {
    const sw = this.rowSwitch(row);
    if (await sw.isDisabled().catch(() => false)) return true;
    const cls = (await sw.getAttribute('class')) || '';
    return /disabled/.test(cls) || (await sw.getAttribute('aria-disabled')) === 'true';
  }
  /** Dòng theo Tên (khớp đúng) */
  rowByName(n: string) { return this.row(n); }
  async findAny(keyword: string, all = false): Promise<Locator | null> {
    if (all) await this.clearAllFilters();
    await this.search(keyword);
    return this.waitRow(keyword);
  }

  // ---------- trạng thái trên lưới
  async isRowActive(row: Locator): Promise<boolean> {
    const sw = row.locator(UI.rowSwitch).first();
    const aria = await sw.getAttribute('aria-checked');
    if (aria) return aria === 'true';
    const cls = (await sw.getAttribute('class')) || '';
    if (/checked|p-inputswitch-checked/.test(cls)) return true;
    return sw.isChecked().catch(() => false);
  }
}
