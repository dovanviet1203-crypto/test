import 'dotenv/config';

export const env = (key: string, fallback = ''): string => (process.env[key] ?? fallback).trim();
export const list = (key: string, fallback = ''): string[] =>
  env(key, fallback).split('|').map((s) => s.trim()).filter(Boolean);

/**
 * Vai trò dùng trong test case (cột Tiền điều kiện):
 *  HT = Admin Hệ thống, DNA / DNB = Admin Doanh nghiệp A / B,
 *  DNA_VIEW = user DN A chỉ có quyền Xem, DNA_NOQ = user DN A không được phân quyền,
 *  DNA_NOXUAT = user DN A không có quyền Xuất dữ liệu.
 * Tài khoản nào chưa khai báo trong .env thì các case dùng tài khoản đó tự SKIP.
 */
export const ROLES = ['HT', 'DNA', 'DNB', 'DNA_VIEW', 'DNA_NOQ', 'DNA_NOXUAT'] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNTS: Record<Role, { user: string; pass: string; displayName: string }> = Object.fromEntries(
  ROLES.map((r) => [r, { user: env(`${r}_USER`), pass: env(`${r}_PASS`), displayName: env(`${r}_DISPLAY_NAME`) }]),
) as any;

export const hasRole = (r: Role) => !!(ACCOUNTS[r].user && ACCOUNTS[r].pass);

export const PATHS = {
  login: env('LOGIN_PATH', '/login'),
  tts: env('TTS_PATH', '/'),
  /** Màn danh mục Hoạt chất (FUNCT-196 kiểm tra hoạt chất được sao chép về DN) */
  hoatChat: env('HOAT_CHAT_PATH'),
};

/** Giá trị danh mục dùng chung đang có trên staging (mặc định theo Test data của file TC) */
export const D = {
  phanLoai: env('PHAN_LOAI', 'Kháng sinh thuỷ sản'),
  phanLoai2: env('PHAN_LOAI_2', 'Sát trùng - khử trùng thuỷ sản'),
  phanLoaiKst: env('PHAN_LOAI_KST', 'Thuốc trị ký sinh trùng thuỷ sản'),
  dvt: env('DVT', 'lít'),
  dvt2: env('DVT_2', 'ml'),
  dangDongGoi: list('DANG_DONG_GOI', 'chai|lọ'),
  hinhThuc: env('HINH_THUC', 'Công bố lưu hành'),
  hinhThuc2: env('HINH_THUC_2', 'Tự sản xuất dùng nội bộ'),
  xuatXu: env('XUAT_XU', 'Việt Nam'),
  xuatXu2: env('XUAT_XU_2', 'Nhật Bản'),
  dnVatTu: env('DN_VAT_TU', 'Công ty TNHH MTV Lucky'),
  dnVatTu2: env('DN_VAT_TU_2', 'Công ty CP ACE Biochem Việt Nam'),
  hoatChat: env('HOAT_CHAT', 'Abamectin (min 90%)'),
  hoatChat2: env('HOAT_CHAT_2', 'HC002'),
  /** Hoạt chất có tag Cấm */
  hoatChatCam: env('HOAT_CHAT_CAM', 'HC002'),
  dvHoatChat: env('DV_HOAT_CHAT', '%'),
  nhomTs: env('NHOM_THUY_SAN', 'Nuôi cá nước ngọt'),
  loaiTs: env('LOAI_THUY_SAN', 'Cá rô phi'),
  dichBenh: env('DICH_BENH', 'Bật gốc'),
  dichBenh2: env('DICH_BENH_2', 'Bệnh chết đào'),
  dnaName: env('DNA_NAME'),
  nh1Name: env('NH1_NAME'),
};

/**
 * Bản ghi mẫu có sẵn trên staging (Tiền điều kiện của file TC).
 * Các case CHỈ ĐỌC dùng trực tiếp; case làm thay đổi dữ liệu (xoá, đổi trạng thái, sửa Mã/Tên)
 * dùng bản ghi do test tự tạo để không phá dữ liệu mẫu.
 * Để trống 1 biến -> các case cần biến đó tự SKIP.
 */
export const PRE = {
  // Hệ thống
  ht1Code: env('HT_TS_01_CODE', 'HT_TS_01'), ht1Name: env('HT_TS_01_NAME', 'Conflor 100'),
  ht2Code: env('HT_TS_02_CODE', 'HT_TS_02'), ht2Name: env('HT_TS_02_NAME', 'Tilfo Super 300'),
  ht3Code: env('HT_TS_03_CODE', 'HT_TS_03'), ht3Name: env('HT_TS_03_NAME', 'Gramozin 20'),
  htCodePrefix: env('HT_CODE_PREFIX', 'HT_TS_0'),
  htInactiveName: env('HT_INACTIVE_NAME', 'Gluxide 480'),
  /** Bản ghi HT có >= 2 hoạt chất chính + 1 phụ (GUI-34) */
  htMultiMainName: env('HT_MULTI_MAIN_NAME', 'Amitop 325'),
  htMultiMainExpected: env('HT_MULTI_MAIN_HOAT_CHAT', 'Abamectin (min 90%), HC002'),
  /** Bản ghi HT đã được dùng ở nghiệp vụ -> không xoá được (GUI-51, FUNCT-82) */
  htUsedCode: env('HT_USED_CODE', 'HT_TS_01'), htUsedName: env('HT_USED_NAME', 'Conflor 100'),
  // Doanh nghiệp
  dnaCode: env('DNA_TS_CODE', 'TS_RIFA_01'), dnaName: env('DNA_TS_NAME', 'Rifamox 800'),
  dnaInheritedName: env('DNA_INHERITED_NAME', 'Tilfo DN A'),
  dnbCode: env('DNB_TS_CODE', 'TS_DNB_01'), dnbName: env('DNB_TS_NAME', 'Thuốc DN B'),
  nh1Name: env('NH1_TS_NAME', 'Thuốc NH1'),
  /** DN A đã thêm từ HT và HT đã sửa bản ghi gốc -> popup Trùng (GUI-121, FUNCT-202) */
  dnaInhChangedName: env('DNA_INHERITED_HT_CHANGED_NAME', ''),
  /** Bản ghi DN A đã thêm từ HT, HT đã thay đổi (FUNCT-92) */
  dnaInhChangedCode: env('DNA_INHERITED_HT_CHANGED_CODE', ''),
  /** Tên các bản ghi mỗi nguồn (FUNCT-7) - phân cách | */
  allSourceNames: list('ALL_SOURCE_NAMES', 'Conflor 100|Rifamox 800|Tilfo DN A|Thuốc NH1|Gramozin NH1|Rifamox NH3'),
};
