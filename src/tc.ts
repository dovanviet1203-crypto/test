import cases from '../data/testcases.json';

export type Kind = 'GUI' | 'FUNCT' | 'VALIDATE';
export type TestCaseMeta = {
  sheet: string;
  kind: Kind;
  row: number;
  id: string;
  name: string;
  pre: string | null;
  steps: string | null;
  data: string | null;
  exp: string | null;
  pri: string | null;
};

const byId = new Map<string, TestCaseMeta>((cases as TestCaseMeta[]).map((c) => [c.id, c]));

export function meta(id: string): TestCaseMeta {
  const c = byId.get(id);
  if (!c) throw new Error(`Không tìm thấy ${id} trong data/testcases.json - chạy "npm run tc:sync" sau khi sửa Excel`);
  return c;
}

/**
 * Tiêu đề test = "[GUI][GUI-1] <Tên test case>" để:
 *  - lọc chạy:   npx playwright test -g "\[GUI-1\]"
 *  - ghi kết quả ngược về Excel (scripts/write-results.mjs) theo ID
 */
export function T(id: string): string {
  const c = meta(id);
  return `[${c.kind}][${c.id}] ${c.name}`;
}

/** Thông tin hiển thị kèm trong HTML report */
export function info(id: string) {
  const c = meta(id);
  return {
    tag: [`@${c.kind}`, `@${(c.pri || 'NA').toLowerCase()}`],
    annotation: [
      { type: 'Tiền điều kiện', description: c.pre || '' },
      { type: 'Các bước', description: c.steps || '' },
      { type: 'Kết quả mong đợi', description: c.exp || '' },
    ],
  };
}
