import { test as base, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'node:fs';
import { ACCOUNTS, hasRole, Role } from './env';
import { TtsList } from './pages/list';
import { typedCodes } from './pages/form';
import { ThuocRecord } from './data';
import { expectToast, vn } from './pages/common';
import { MSG } from './ui';

export type Actor = { role: Role; page: Page; list: TtsList; ctx: BrowserContext };

export const authFile = (r: Role) => `.auth/${r}.json`;

type Fx = {
  /** Mở phiên đăng nhập theo vai trò (dùng lại storageState do auth.setup tạo) và vào màn Danh mục */
  as: (role: Role, opts?: { goto?: boolean }) => Promise<Actor>;
  /** Tạo bản ghi qua UI và tự xoá khi test kết thúc */
  seed: (role: Role, rec: ThuocRecord) => Promise<ThuocRecord>;
  /** Đăng ký mã cần dọn sau test (khi bản ghi được tạo ngay trong bước test) */
  track: (role: Role, code: string) => void;
};

export const test = base.extend<Fx>({
  as: async ({ browser, track }, use) => {
    const opened: Actor[] = [];
    await use(async (role, opts = {}) => {
      if (!hasRole(role)) test.skip(true, `Chưa cấu hình tài khoản ${role} trong .env`);
      if (!fs.existsSync(authFile(role))) test.skip(true, `Đăng nhập ${role} thất bại ở bước setup`);
      const ctx = await (browser as Browser).newContext({ storageState: authFile(role), acceptDownloads: true });
      const page = await ctx.newPage();
      const list = new TtsList(page);
      if (opts.goto !== false) await list.goto();
      const a = { role, page, list, ctx };
      opened.push(a);
      return a;
    });
    for (const a of opened) {
      for (const p of a.ctx.pages()) for (const c of typedCodes.get(p) || []) track(a.role, c);
      await a.ctx.close().catch(() => {});
    }
  },

  track: async ({ browser }, use) => {
    const todo: { role: Role; code: string }[] = [];
    const seen = new Set<string>();
    await use((role, code) => { const k = `${role}|${code}`; if (!seen.has(k)) { seen.add(k); todo.push({ role, code }); } });
    // Dọn dữ liệu: mỗi vai trò mở 1 context mới, xoá ngược thứ tự tạo
    const byRole = new Map<Role, string[]>();
    for (const t of todo.reverse()) byRole.set(t.role, [...(byRole.get(t.role) || []), t.code]);
    for (const [role, codes] of byRole) {
      if (!fs.existsSync(authFile(role))) continue;
      const ctx = await (browser as Browser).newContext({ storageState: authFile(role) });
      const list = new TtsList(await ctx.newPage());
      try {
        await list.goto();
        for (const c of codes) {
          const ok = await list.deleteRecord(c).catch(() => false);
          if (!ok) console.warn(`[cleanup] Không xoá được ${c} (${role}) - xoá tay trên staging`);
        }
      } catch (e) {
        console.warn(`[cleanup] ${role}: ${(e as Error).message}`);
      } finally {
        await ctx.close();
      }
    }
  },

  seed: async ({ as, track }, use) => {
    await use(async (role, rec) => {
      const a = await as(role);
      const f = await a.list.openAdd();
      await f.fill(rec);
      await f.save();
      await expectToast(a.page, vn(MSG.addOk));
      track(role, rec.ma!.trim());
      await a.ctx.close();
      return rec;
    });
  },
});

export { expect };
export { ACCOUNTS };
