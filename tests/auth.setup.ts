import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import { ACCOUNTS, hasRole, PATHS, ROLES } from '../src/env';
import { UI } from '../src/ui';

for (const role of ROLES) {
  setup(`Đăng nhập ${role}`, async ({ page }) => {
    setup.skip(!hasRole(role), `Chưa khai báo ${role}_USER / ${role}_PASS trong .env`);
    fs.mkdirSync('.auth', { recursive: true });
    await page.goto(PATHS.login);
    await page.locator(UI.loginUser).first().fill(ACCOUNTS[role].user);
    await page.locator(UI.loginPass).first().fill(ACCOUNTS[role].pass);
    await page.getByRole('button', { name: UI.loginButton }).click();
    try {
      await expect(page.locator(UI.loginPass).first()).toBeHidden({ timeout: 30_000 });
    } catch {
      const msg = (await page.locator(UI.toast).allInnerTexts().catch(() => [])).join(' | ');
      throw new Error(`Đăng nhập ${role} thất bại (vẫn ở màn đăng nhập). Thông báo trên màn: ${msg || '(không có)'} - kiểm tra ${role}_USER / ${role}_PASS và LOGIN_PATH trong .env`);
    }
    await page.context().storageState({ path: `.auth/${role}.json` });
  });
}
