import { test, expect } from '../../src/fixtures';
import { T, info } from '../../src/tc';
import { PATHS, PRE } from '../../src/env';
import { UI } from '../../src/ui';
import { navByMenu } from '../../src/helpers';

test.describe('FUNCT - Phân quyền và phạm vi dữ liệu', () => {
  for (const [id, role] of [['FUNCT-1', 'HT'], ['FUNCT-2', 'DNA']] as const) {
    test(T(id), info(id), async ({ as }) => {
      const { page, list } = await as(role, { goto: false });
      await navByMenu(page);
      await list.waitTable();
      expect(await list.rows().count(), 'Lưới không có dữ liệu').toBeGreaterThan(0);
    });
  }

  test(T('FUNCT-3'), info('FUNCT-3'), async ({ as }) => {
    const { page } = await as('DNA_NOQ', { goto: false });
    await page.goto('/');
    for (const t of [/Quản trị hệ thống/, /Danh mục Nguyên vật liệu/]) {
      const m = page.getByRole('menuitem', { name: t }).or(page.getByText(t)).first();
      if (await m.isVisible().catch(() => false)) await m.click();
    }
    await expect(page.getByText(/Thuốc th(?:uỷ|ủy|uy) sản/)).toHaveCount(0);
  });

  test(T('FUNCT-4'), info('FUNCT-4'), async ({ as }) => {
    const { page, list } = await as('DNA_NOQ', { goto: false });
    await page.goto(PATHS.tts);
    await page.waitForLoadState('networkidle').catch(() => {});
    const denied = page.getByText(/403|không có quyền|Không có quyền|Access denied|Forbidden/i).first();
    const moved = !page.url().includes(PATHS.tts);
    const hasDenied = await denied.isVisible().catch(() => false);
    expect(moved || hasDenied, 'Không bị chặn khi truy cập trực tiếp URL').toBeTruthy();
    expect(await list.rows().count()).toBe(0);
  });

  test(T('FUNCT-5'), info('FUNCT-5'), async ({ as }) => {
    const { list } = await as('DNA_VIEW');
    await expect(list.addButton()).toHaveCount(0);
    await expect(list.addFromSystemButton()).toHaveCount(0);
    await expect(list.importButton()).toHaveCount(0);
    const r = await list.mustFind(PRE.dnaName);
    expect(await list.hasIcon(r, 'view')).toBeTruthy();
    expect(await list.hasIcon(r, 'edit')).toBeFalsy();
    expect(await list.hasIcon(r, 'more')).toBeFalsy();
    expect(await list.isSwitchDisabled(r)).toBeTruthy();
  });

  test(T('FUNCT-7'), info('FUNCT-7'), async ({ as }) => {
    const { list } = await as('HT');
    for (const n of PRE.allSourceNames) expect(await list.findAny(n, true), `Admin HT không thấy "${n}"`).not.toBeNull();
  });

  test(T('FUNCT-9'), info('FUNCT-9'), async ({ as }) => {
    const { list } = await as('DNA');
    for (const n of [PRE.dnaName, PRE.dnaInheritedName]) expect(await list.findAny(n), `DN A không thấy "${n}"`).not.toBeNull();
    for (const n of [PRE.dnbName, PRE.nh1Name].filter(Boolean)) expect(await list.findAny(n), `DN A không được thấy "${n}"`).toBeNull();
    await list.search('');
    const src = await list.column(/Nguồn dữ liệu/);
    expect(src.filter((s) => s === 'Hệ thống'), 'Admin DN thấy bản ghi Hệ thống gốc').toEqual([]);
  });
});

test.describe('FUNCT - Tìm kiếm', () => {
  test(T('FUNCT-11'), info('FUNCT-11'), async ({ as }) => {
    const { list } = await as('HT');
    await list.search(PRE.ht2Code);
    expect(await list.column(/Mã thuốc/)).toEqual([PRE.ht2Code]);
    expect(await list.column(/Tên thuốc/)).toEqual([PRE.ht2Name]);
  });

  test(T('FUNCT-12'), info('FUNCT-12'), async ({ as }) => {
    const { list } = await as('HT');
    await list.search(PRE.htCodePrefix);
    const codes = await list.column(/Mã thuốc/);
    for (const c of [PRE.ht1Code, PRE.ht2Code, PRE.ht3Code]) expect(codes).toContain(c);
  });

  test(T('FUNCT-22'), info('FUNCT-22'), async ({ as }) => {
    const { list } = await as('HT');
    await list.search('');
    const all = await list.total();
    await list.search('%');
    const pct = (await list.isEmpty()) ? 0 : await list.total();
    expect(pct, '"%" trả về toàn bộ bản ghi (bị hiểu là ký tự đại diện)').toBeLessThan(all);
    await list.search('_');
    if (!(await list.isEmpty())) {
      const codes = await list.column(/Mã thuốc/); const names = await list.column(/Tên thuốc/);
      codes.forEach((c, i) => expect(`${c} ${names[i]}`, 'Kết quả không chứa "_"').toContain('_'));
    }
  });

  test(T('FUNCT-23'), info('FUNCT-23'), async ({ as }) => {
    const { page, list } = await as('HT');
    let dialog = false;
    page.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
    await list.search('<script>alert(1)</script>');
    await page.waitForTimeout(1000);
    expect(dialog, 'Script đã được thực thi').toBeFalsy();
    await list.expectEmpty();
  });

  test(T('FUNCT-24'), info('FUNCT-24'), async ({ as }) => {
    const { page, list } = await as('HT');
    await list.search('');
    const all = await list.total();
    await list.search("' OR 1=1 --");
    const n = (await list.isEmpty()) ? 0 : await list.total();
    expect(n).toBeLessThan(all);
    await expect(page.getByText(/Lỗi hệ thống|Internal Server Error|500/i)).toHaveCount(0);
  });

  test(T('FUNCT-26'), info('FUNCT-26'), async ({ as }) => {
    const { list } = await as('DNA');
    await list.search(PRE.dnbName);
    await list.expectEmpty();
  });
});
