import { expect } from '@playwright/test';
import { Actor } from './fixtures';
import { MSG } from './ui';
import { expectToast, vn } from './pages/common';
import { Role } from './env';

type TrackFn = (r: Role, c: string) => void;

/** Admin DN thêm các bản ghi Hệ thống (theo Tên) về DN qua popup Thêm từ hệ thống; đăng ký dọn theo Tên */
export async function addFromSystem(dn: Actor, names: string[], track: TrackFn) {
  const p = await dn.list.openFromSystem();
  await p.clearTag();
  for (const n of names) {
    await p.search(n);
    await p.tick(n);
  }
  await p.save();
  await expectToast(dn.page, vn(MSG.addFromSys(names.length)));
  for (const n of names) track(dn.role, n);
  await expect(p.dialog).toBeHidden();
}

/** Admin HT sửa 1 trường text của bản ghi rồi lưu */
export async function editText(a: Actor, key: string, label: string, value: string) {
  const f = await a.list.openEdit(key);
  await f.fillText(label, value);
  await f.save();
  // Staging lưu Cập nhật xong KHÔNG hiện toast -> bước chuẩn bị chỉ cần popup đóng (case kiểm tra toast tự assert riêng)
  await expect(f.dialog).toBeHidden({ timeout: 15_000 });
}
