import { expect, Locator, Page } from '@playwright/test';
import { UI, LABELS } from '../ui';
import { DoiTuong, HoatChat, ThuocRecord, norm, RUN } from '../data';
import { esc, exact, fieldBox, labelOf, pickOption, textOf, vn } from './common';

/**
 * Mã do test sinh ra (có hậu tố RUN) đã từng được nhập vào form trên từng trang.
 * Fixture `as` dùng danh sách này để dọn dữ liệu kể cả khi app lưu nhầm bản ghi lẽ ra bị chặn.
 */
export const typedCodes = new WeakMap<Page, Set<string>>();
export function rememberCode(page: Page, c: string) {
  const v = c.trim().toUpperCase();
  if (!v.includes(RUN)) return;
  if (!typedCodes.has(page)) typedCodes.set(page, new Set());
  typedCodes.get(page)!.add(v);
}

/**
 * Bảng con trong popup: Hoạt chất / Đối tượng phòng trừ.
 * Không phụ thuộc cấu trúc <table>: tìm ô chọn theo chữ placeholder ("Chọn hoạt chất", "Chọn nhóm thủy sản"...)
 * và luôn điền vào ô CÒN TRỐNG đầu tiên -> dùng lại dòng trống có sẵn (nếu màn tự thêm 1 dòng) thay vì để dòng trống gây lỗi.
 */
export class SubTable {
  constructor(readonly form: TtsForm, readonly title: string) {}
  /** Khung bảng con = tổ tiên gần nhất chứa cả nút "Thêm dòng" lẫn bảng (tiêu đề + nút nằm ở 1 div riêng, bảng là anh em của div đó) */
  area(): Locator {
    return this.form.dialog.getByText(exact(this.title)).first()
      .locator(`xpath=ancestor::*[.//button[contains(normalize-space(.), "Thêm dòng")] and (.//table or .//*[@role="table"] or .//thead)][1]`);
  }
  addButton() { return this.area().getByRole('button', { name: UI.subAddButton }).first(); }
  rows(): Locator {
    const trs = this.area().locator('tbody tr').filter({ has: this.form.page.locator('td') }).filter({ hasNotText: /Chưa có dữ liệu|Không có dữ liệu/ });
    return trs;
  }
  async headers(): Promise<string[]> {
    const th = (await this.area().locator('thead th, [role="columnheader"]').allInnerTexts()).map(norm).filter(Boolean);
    return th.length ? th : (await this.area().innerText()).split('\n').map(norm).filter(Boolean);
  }
  async add() { await this.addButton().click(); }

  /** Ô chọn đang trống có placeholder `ph` (chữ hiển thị hoặc placeholder của input) */
  emptySelect(ph: string): Locator {
    const re = new RegExp(`^\\s*${vn(ph, 'i').source}\\s*$`, 'i');
    return this.area().getByText(re).or(this.area().locator(`input[placeholder="${ph}" i]`)).first();
  }
  hasEmpty(ph: string) { return this.emptySelect(ph).isVisible().catch(() => false); }

  /** Mở ô chọn trống `ph`, gõ để lọc (nếu ô tìm kiếm đang được focus) rồi chọn `value` */
  async pickEmpty(ph: string, value: string) {
    const page = this.form.page;
    const target = this.emptySelect(ph);
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await target.click();
    await page.waitForTimeout(300);
    await this.form.typeFilter(value);
    await pickOption(page, value, `${this.title} - ${ph}`);
    // Dropdown chọn nhiều (vd Dịch bệnh, dịch hại có checkbox) không tự đóng -> chạm ra tiêu đề vùng để đóng
    if (await page.locator(UI.selectOption).first().isVisible().catch(() => false))
      await this.form.dialog.getByText(exact(this.title)).first().click();
  }
  /** Ô nhập text (vd Hàm lượng) của dòng đang điền = ô có placeholder `ph` cuối cùng */
  async typeLast(ph: string, value: string) {
    await this.area().locator(`input[placeholder="${ph}" i]`).last().fill(value);
  }
  /** Checkbox thứ i trong bảng (Chất chính) */
  async check(i: number, v = true) {
    const cb = this.area().locator(UI.checkbox).nth(i < 0 ? (await this.area().locator(UI.checkbox).count()) + i : i);
    const inner = cb.locator('input[type=checkbox]').first();
    const on = (await cb.getAttribute('aria-checked')) === 'true' || /checked/.test((await cb.getAttribute('class')) || '')
      || (await cb.isChecked().catch(() => false)) || (await inner.isChecked().catch(() => false));
    if (on !== v) await cb.click();
  }
  /** Icon xoá (thùng rác) dòng thứ i */
  deleteIcons() { return this.area().locator('button, [role="button"], i, svg, span').filter({ has: this.form.page.locator(UI.subDelete) }).or(this.area().locator(UI.subDelete)); }
  async remove(i: number) {
    const rows = this.rows();
    if ((await rows.count()) > i) {
      const row = rows.nth(i);
      const del = row.locator(UI.subDelete).first();
      await ((await del.count()) ? del : row.locator('td').last().locator('button, i, svg, span').last()).click();
    } else {
      await this.area().locator(UI.subDelete).nth(i).click();
    }
  }
  async rowTexts(): Promise<string[][]> {
    const n = await this.rows().count();
    const out: string[][] = [];
    for (let i = 0; i < n; i++) out.push((await this.rows().nth(i).locator('td').allInnerTexts()).map(norm));
    return out;
  }
  errorTexts() { return this.area().locator(UI.fieldError).allInnerTexts().then((a) => a.map(norm).filter(Boolean)); }
}

/** Popup Thêm mới / Cập nhật Thuốc thuỷ sản */
export class TtsForm {
  readonly dialog: Locator;
  readonly hoatChat: SubTable;
  readonly doiTuong: SubTable;
  constructor(readonly page: Page, readonly title: string) {
    this.dialog = page.locator(UI.dialog).filter({ hasText: vn(title) }).last();
    this.hoatChat = new SubTable(this, LABELS.hoatChatTitle);
    this.doiTuong = new SubTable(this, LABELS.doiTuongTitle);
  }

  async waitOpen() {
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByText(new RegExp(`^\\s*${vn(this.title).source}\\s*$`)).first()).toBeVisible();
  }

  box(label: string) { return fieldBox(this.dialog, label); }
  label(label: string) { return labelOf(this.dialog, label); }
  input(label: string) { return this.box(label).locator(UI.textInput).first(); }
  trigger(label: string) { return this.box(label).locator(UI.selectTrigger).first(); }

  // ---------- nhập liệu
  async fillText(label: string, value: string) {
    const i = this.input(label);
    await i.click();
    await i.fill('');
    if (value) await i.fill(value);
    if (label === LABELS.ma) rememberCode(this.page, value);
  }
  async value(label: string) { return this.input(label).inputValue(); }

  async openSelect(label: string): Promise<Locator> {
    await this.trigger(label).click();
    await expect(this.page.locator(UI.selectPanel).last()).toBeVisible();
    return this.page.locator(UI.selectPanel).last();
  }
  /** Đóng dropdown đang mở: chạm vào tiêu đề popup (không dùng Escape vì có thể đóng luôn popup) */
  async closeSelect() {
    if (await this.page.locator(UI.selectOption).first().isVisible().catch(() => false))
      await this.dialog.getByText(new RegExp(`^\\s*${vn(this.title).source}\\s*$`)).first().click();
  }
  searchInSelect(label: string): Locator {
    const inPanel = this.page.locator(UI.selectPanel).last().locator(UI.selectSearch);
    const inBox = this.box(label).locator('input').first();
    return inPanel.or(inBox).first();
  }
  async select(label: string, value: string) {
    await this.openSelect(label);
    await this.typeFilter(value);
    await pickOption(this.page, value, label);
  }
  /** Dropdown mở ra thường focus sẵn ô tìm kiếm -> gõ để lọc (không dùng fill để tránh chờ 15s khi ô là readonly) */
  async typeFilter(value: string) {
    await this.page.waitForTimeout(250);
    const ok = await this.page.evaluate(() => { const e = document.activeElement as HTMLInputElement | null; return !!e && e.tagName === 'INPUT' && !e.readOnly && !e.disabled; });
    if (ok) { await this.page.keyboard.press('ControlOrMeta+a').catch(() => {}); await this.page.keyboard.insertText(value); }
  }
  /** Combobox chọn nhiều (Dạng đóng gói) */
  async selectMany(label: string, values: string[]) {
    for (const v of values) {
      await this.openSelect(label);
      await this.typeFilter(v);
      await pickOption(this.page, v, label);
    }
    await this.closeSelect();
  }
  async selectedText(label: string): Promise<string> {
    const all = await textOf(this.box(label));
    return norm(all.replace(new RegExp(`^\\s*\\*?\\s*${esc(label)}\\s*\\*?`), ''));
  }
  async placeholder(label: string): Promise<string> {
    const box = this.box(label);
    const inp = box.locator('input[placeholder], textarea[placeholder]').first();
    if (await inp.count()) return norm(await inp.getAttribute('placeholder'));
    return textOf(box.locator('.ant-select-selection-placeholder, .p-dropdown-label.p-placeholder, .p-placeholder, [class*="placeholder"]').first());
  }

  async fill(r: ThuocRecord) {
    const L = LABELS;
    if (r.ma !== undefined) await this.fillText(L.ma, r.ma);
    if (r.ten !== undefined) await this.fillText(L.ten, r.ten);
    if (r.phanLoai !== undefined) await this.select(L.phanLoai, r.phanLoai);
    if (r.dvt !== undefined) await this.select(L.dvt, r.dvt);
    if (r.dangThuoc !== undefined) await this.fillText(L.dangThuoc, r.dangThuoc);
    if (r.dangDongGoi?.length) await this.selectMany(L.dangDongGoi, r.dangDongGoi);
    if (r.hinhThuc !== undefined) await this.select(L.hinhThuc, r.hinhThuc);
    if (r.soQd !== undefined && (await this.label(L.soQd).isVisible().catch(() => false))) await this.fillText(L.soQd, r.soQd);
    if (r.xuatXu !== undefined) await this.select(L.xuatXu, r.xuatXu);
    if (r.dnVatTu !== undefined) await this.select(L.dnVatTu, r.dnVatTu);
    for (const h of r.hoatChat || []) await this.addHoatChat(h);
    for (const d of r.doiTuong || []) await this.addDoiTuong(d);
    if (r.nguon !== undefined) await this.fillText(L.nguon, r.nguon);
    if (r.moTa !== undefined) await this.fillText(L.moTa, r.moTa);
    if (r.hinhAnh?.length) await this.upload(r.hinhAnh);
    if (r.hoatDong !== undefined) await this.setActive(r.hoatDong);
  }

  /** Thêm 1 dòng Hoạt chất (dùng lại dòng trống nếu có): Hoạt chất, Hàm lượng, Đơn vị, Chất chính */
  async addHoatChat(h: HoatChat) {
    const t = this.hoatChat, P = SUB_PH;
    if (!(await t.hasEmpty(P.hoatChat))) await t.add();
    if (h.ten) await t.pickEmpty(P.hoatChat, h.ten);
    if (h.hamLuong) await t.typeLast(P.hamLuong, h.hamLuong);
    if (h.donVi) await t.pickEmpty(P.donVi, h.donVi);
    if (h.chinh) await t.check(-1, true);
  }
  /** Thêm 1 dòng Đối tượng phòng trừ (dùng lại dòng trống nếu có): Nhóm, Loài, Dịch bệnh */
  async addDoiTuong(d: DoiTuong) {
    const t = this.doiTuong, P = SUB_PH;
    if (!(await t.hasEmpty(P.nhom))) await t.add();
    await t.pickEmpty(P.nhom, d.nhom);
    if (d.loai) await t.pickEmpty(P.loai, d.loai);
    if (d.dichBenh) await t.pickEmpty(P.dichBenh, d.dichBenh);
  }

  async upload(files: string[]) {
    await this.dialog.locator(UI.fileInput).first().setInputFiles(files);
  }

  // ---------- checkbox Hoạt động
  activeCheckbox(): Locator {
    return this.dialog.getByRole('checkbox', { name: /^\s*Hoạt động\s*$/ })
      .or(this.dialog.locator('label').filter({ hasText: /^\s*Hoạt động\s*$/ }).locator(UI.checkbox))
      .first();
  }
  async isActive(): Promise<boolean> {
    const cb = this.activeCheckbox();
    if (await cb.evaluate((e) => (e as HTMLInputElement).type === 'checkbox').catch(() => false)) return cb.isChecked();
    const cls = (await cb.getAttribute('class')) || '';
    return /checked/.test(cls) || (await cb.getAttribute('aria-checked')) === 'true';
  }
  async setActive(v: boolean) {
    if ((await this.isActive()) !== v) await this.activeCheckbox().click();
  }

  // ---------- nút
  button(name: string | RegExp) {
    return this.dialog.getByRole('button', { name: typeof name === 'string' ? exact(name) : name });
  }
  async save() { await this.button('Lưu').click(); }
  async saveAndNew() { await this.button(/Lưu và (Thêm|Tạo) mới/).click(); }
  async cancel() { await this.button(/^\s*Hủy\s*$|^\s*Huỷ\s*$/).click(); }
  async closeX() { await this.dialog.locator(UI.dialogClose).first().click(); }

  error(text: string | RegExp) { return this.dialog.getByText(text).first(); }
  async errorTexts(): Promise<string[]> {
    return (await this.dialog.locator(UI.fieldError).allInnerTexts()).map(norm).filter(Boolean);
  }
}

/** Placeholder các ô trong bảng con (đúng chữ trên màn staging) - sửa tại đây nếu đổi */
export const SUB_PH = {
  hoatChat: 'Chọn hoạt chất', hamLuong: 'Nhập hàm lượng', donVi: 'Chọn đơn vị tính',
  nhom: 'Chọn nhóm thủy sản', loai: 'Chọn loài thủy sản', dichBenh: 'Chọn dịch bệnh, dịch hại',
};
