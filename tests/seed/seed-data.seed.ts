/**
 * TẠO DỮ LIỆU MẪU trên staging (chạy 1 lần trước khi test): npm run seed
 * - Bản ghi đã có (tìm theo Mã) thì bỏ qua -> chạy lại nhiều lần không bị trùng.
 * - Hoạt chất / đối tượng nào không có trong danh mục staging thì bỏ dòng đó và in cảnh báo, bản ghi vẫn được tạo.
 * Danh sách bản ghi: src/seedData.ts
 */
import { test, expect, Actor } from '../../src/fixtures';
import { Role } from '../../src/env';
import { LABELS as L, MSG } from '../../src/ui';
import { ThuocRecord } from '../../src/data';
import { DNA_INHERIT, DNA_SEED, DNB_SEED, HT_CHANGED_DVT, HT_CHANGED_NAME, HT_SEED } from '../../src/seedData';
import { toast, vn } from '../../src/pages/common';
import { TtsForm } from '../../src/pages/form';

test.describe.configure({ mode: 'serial' });
const warn = (m: string) => { console.warn(`[seed] ${m}`); test.info().annotations.push({ type: 'Cảnh báo', description: m }); };

async function exists(a: Actor, code: string) {
  await a.list.goto();
  await a.list.clearAllFilters();
  return (await a.list.find(code)) !== null;
}

/** Điền form; hoạt chất / đối tượng lỗi thì bỏ dòng đó */
async function fillSafe(f: TtsForm, rec: ThuocRecord) {
  const { hoatChat = [], doiTuong = [], ...plain } = rec;
  await f.fill(plain);
  for (const h of hoatChat) {
    try { await f.addHoatChat(h); } catch (e) {
      warn(`${rec.ten}: không chọn được hoạt chất "${h.ten}" (${h.hamLuong} ${h.donVi}) - ${(e as Error).message.split('\n').slice(0, 3).join(' ')}`);
      await f.closeSelect().catch(() => {});
      const n = await f.hoatChat.rows().count(); if (n) await f.hoatChat.remove(n - 1).catch(() => {});
    }
  }
  for (const d of doiTuong) {
    try { await f.addDoiTuong(d); } catch (e) {
      warn(`${rec.ten}: không chọn được đối tượng "${d.nhom}/${d.loai}/${d.dichBenh}" - ${(e as Error).message.split('\n').slice(0, 3).join(' ')}`);
      await f.closeSelect().catch(() => {});
      const n = await f.doiTuong.rows().count(); if (n) await f.doiTuong.remove(n - 1).catch(() => {});
    }
  }
}

async function ensure(a: Actor, rec: ThuocRecord & { edits?: number }) {
  if (await exists(a, rec.ma!)) { console.log(`[seed] Đã có ${rec.ma} - ${rec.ten}, bỏ qua`); return; }
  const f = await a.list.openAdd();
  await fillSafe(f, { ...rec, hoatDong: rec.hoatDong ?? true });
  await f.save();
  // Lưu xong: hoặc toast thành công, hoặc báo trùng Mã (bản ghi đã có nhưng bị bộ lọc Trạng thái/Nguồn ẩn khi tìm) -> coi như đã có
  const okToast = toast(a.page, vn(MSG.addOk));
  const dup = f.dialog.getByText(vn(MSG.maExists)).first();
  await expect(okToast.or(dup)).toBeVisible({ timeout: 15_000 }).catch(() => {});
  if (await dup.isVisible().catch(() => false)) {
    console.log(`[seed] ${rec.ma} - ${rec.ten} đã có trên hệ thống (báo trùng Mã), bỏ qua`);
    await f.cancel().catch(() => f.closeX());
    return;
  }
  if (!(await okToast.isVisible().catch(() => false))) {
    const errs = await f.errorTexts().catch(() => [] as string[]);
    await f.page.screenshot({ path: test.info().outputPath(`seed-${rec.ma}.png`) }).catch(() => {});
    throw new Error(`Không tạo được ${rec.ma} - ${rec.ten}. Lỗi trên form: ${errs.join(' | ') || '(không đọc được, xem ảnh seed-' + rec.ma + '.png)'}`);
  }
  console.log(`[seed] Đã tạo ${rec.ma} - ${rec.ten}`);
  // Tạo thêm dòng lịch sử "Cập nhật" (TC cần bản ghi có >= 3 dòng lịch sử)
  for (let i = 1; i <= (rec.edits || 0); i++) {
    const e = await a.list.openEdit(rec.ma!);
    await e.fillText(L.moTa, `${rec.moTa || 'Dữ liệu mẫu'} (cập nhật ${i})`);
    await e.save();
    // Staging lưu Cập nhật xong không hiện toast -> popup đóng = đã lưu
    await expect(e.dialog).toBeHidden({ timeout: 15_000 });
    await a.page.waitForTimeout(1100);
  }
}

const seedAll = (role: Role, recs: (ThuocRecord & { edits?: number })[]) => async ({ as }: { as: (r: Role) => Promise<Actor> }) => {
  test.setTimeout(15 * 60_000);
  const a = await as(role);
  for (const r of recs) await test.step(`${r.ma} - ${r.ten}`, () => ensure(a, r));
};

test('[seed] Admin Hệ thống - bản ghi Hệ thống', seedAll('HT', HT_SEED));
test('[seed] Admin DN A - bản ghi Doanh nghiệp', seedAll('DNA', DNA_SEED));
test('[seed] Admin DN B - bản ghi Doanh nghiệp', seedAll('DNB', DNB_SEED));

test('[seed] Admin DN A - thêm từ hệ thống (DN kế thừa)', async ({ as }) => {
  test.setTimeout(10 * 60_000);
  const dn = await as('DNA');
  for (const n of DNA_INHERIT) {
    if (await exists(dn, n)) { console.log(`[seed] DN A đã có "${n}", bỏ qua`); continue; }
    const p = await dn.list.openFromSystem();
    await p.search(n);
    await p.tick(n);
    await p.save();
    const overwrite = dn.page.locator('mat-snack-bar-container, .mat-mdc-snack-bar-container, [role="alert"], [role="status"]').filter({ hasText: /cần xác nhận ghi đè/i }).first();
    const done = async () => (await overwrite.isVisible().catch(() => false)) || !(await p.dialog.isVisible().catch(() => false));
    // Lần Lưu đầu đôi khi không có phản hồi (đã thử trên staging) -> bấm Lưu lại nếu popup vẫn mở
    await expect.poll(done, { timeout: 5_000 }).toBeTruthy().catch(() => {});
    if (!(await done()) && (await p.dialog.isVisible())) await p.save();
    await expect.poll(done, { timeout: 15_000 }).toBeTruthy();
    // Bản ghi đã có nhưng bị bộ lọc ẩn -> app báo "cần xác nhận ghi đè" và không lưu: coi như đã có, bỏ qua
    if (await overwrite.isVisible().catch(() => false)) {
      warn(`"${n}" đã có trên DN A (app báo cần xác nhận ghi đè) - bỏ qua`);
      await p.cancel();
      continue;
    }
    // Popup đã đóng -> kiểm tra trong danh sách thay vì dựa vào nội dung toast thành công
    if (!(await exists(dn, n))) throw new Error(`"${n}" chưa có trong danh sách DN A sau khi Lưu`);
    console.log(`[seed] DN A đã thêm từ hệ thống "${n}"`);
  }
});

test('[seed] Admin Hệ thống - đổi Đơn vị tính bản ghi DN A đã lấy về (để có popup Trùng)', async ({ as }) => {
  const a = await as('HT');
  const f = await a.list.openEdit(HT_CHANGED_NAME);
  if ((await f.selectedText(L.dvt)).includes(HT_CHANGED_DVT)) { console.log('[seed] Đã đổi Đơn vị tính trước đó, bỏ qua'); await f.cancel(); return; }
  await f.select(L.dvt, HT_CHANGED_DVT);
  await f.save();
  await expect(f.dialog).toBeHidden({ timeout: 15_000 });
});

test('[seed] Kiểm tra lại dữ liệu mẫu', async ({ as }) => {
  test.setTimeout(15 * 60_000);
  for (const [role, recs] of [['HT', HT_SEED], ['DNA', DNA_SEED], ['DNB', DNB_SEED]] as const) {
    const a = await as(role);
    for (const r of recs) expect.soft(await exists(a, r.ma!), `${role}: thiếu ${r.ma} - ${r.ten}`).toBeTruthy();
  }
});
