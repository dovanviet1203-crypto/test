/**
 * DỮ LIỆU MẪU (Tiền điều kiện của file TC Web + Mobile) - tạo bằng `npm run seed`.
 * Giá trị danh mục lấy từ .env (đã khớp dữ liệu đang có trên staging 22/10/2026).
 * Mã KHÔNG chứa hậu tố RUN nên không bị bước dọn dữ liệu của test xoá.
 */
import { D, env } from './env';
import { DoiTuong, HoatChat, ThuocRecord } from './data';

const hc = (ten: string, hamLuong: string, chinh = false): HoatChat => ({ ten, hamLuong, donVi: D.dvHoatChat, chinh });
/** "Nhóm/Loài/Dịch bệnh|Nhóm/Loài/Dịch bệnh|..." */
const dts = (s: string): DoiTuong[] => s.split('|').map((x) => x.split('/').map((y) => y.trim())).map(([nhom, loai, dichBenh]) => ({ nhom, loai, dichBenh }));

const DT3 = dts(env('SEED_DOI_TUONG', `${D.nhomTs}/${D.loaiTs}/${D.dichBenh}|${D.nhomTs}/${D.loaiTs}/${D.dichBenh2}|${D.nhomTs}/${env('LOAI_THUY_SAN_2', 'Cá trắm cỏ')}/${D.dichBenh}`));
/** Hoạt chất trên staging: HC_CAM là hoạt chất có tag "Cấm", HC_THUONG là hoạt chất còn lại */
const HC_THUONG = D.hoatChat;
const HC_CAM = D.hoatChatCam;
const base = { dvt: D.dvt, xuatXu: D.xuatXu, hinhThuc: D.hinhThuc };

/** Bản ghi do Admin Hệ thống tạo */
export const HT_SEED: (ThuocRecord & { edits?: number })[] = [
  { ...base, ma: 'HT_TS_01', ten: 'Conflor 100', phanLoai: D.phanLoai, dnVatTu: D.dnVatTu, soQd: 'TS1-0422', dangThuoc: 'Dung dịch',
    dangDongGoi: [D.dangDongGoi[0]], hoatChat: [hc(HC_CAM, '22.5', true), hc(HC_THUONG, '10')], doiTuong: DT3,
    nguon: 'TT 25/2024', moTa: 'Dữ liệu mẫu auto test', edits: 2 },
  { ...base, ma: 'HT_TS_02', ten: 'Tilfo Super 300', phanLoai: D.phanLoai2, dnVatTu: D.dnVatTu2, hoatChat: [hc(HC_THUONG, '100', true), hc(HC_CAM, '50')] },
  { ...base, ma: 'HT_TS_03', ten: 'Gramozin 20', phanLoai: D.phanLoaiKst, dnVatTu: D.dnVatTu, hoatChat: [hc(HC_THUONG, '20', true)] },
  { ...base, ma: 'HT_TS_04', ten: 'Amitop 325', phanLoai: D.phanLoai, dnVatTu: D.dnVatTu2, hoatChat: [hc(HC_THUONG, '100', true), hc(HC_CAM, '50', true)] },
  { ...base, ma: 'HT_TS_09', ten: 'Gluxide 480', phanLoai: D.phanLoaiKst, dnVatTu: D.dnVatTu, hoatDong: false },
  // DN A thêm bản ghi này về rồi HT đổi Đơn vị tính -> dùng cho popup Trùng dữ liệu (Web GUI-121, FUNCT-202 / Mobile FUNCT-220)
  { ...base, ma: 'HT_TS_05', ten: 'Florcol 50', phanLoai: D.phanLoai, dnVatTu: D.dnVatTu },
];
export const HT_CHANGED_NAME = 'Florcol 50';
export const HT_CHANGED_DVT = D.dvt2;
/** Bản ghi HT mà DN A thêm sẵn về (Nguồn "DN kế thừa") */
export const DNA_INHERIT = ['Conflor 100', HT_CHANGED_NAME];

/** Bản ghi do Admin DN A tạo */
export const DNA_SEED: (ThuocRecord & { edits?: number })[] = [
  { ...base, ma: 'TS_RIFA_01', ten: 'Rifamox 800', phanLoai: D.phanLoai, dnVatTu: D.dnVatTu, soQd: 'TS1-0422', dangThuoc: 'Bột',
    hoatChat: [hc(HC_CAM, '22.5', true), hc(HC_THUONG, '200')], doiTuong: DT3, nguon: 'TT 25/2024', moTa: 'Dữ liệu mẫu auto test', edits: 2 },
  { ...base, ma: 'TS_AZI_01', ten: 'Azimix 5', phanLoai: D.phanLoai2, dnVatTu: D.dnVatTu2, hinhThuc: D.hinhThuc2,
    hoatChat: [hc(HC_THUONG, '50', true), hc(HC_CAM, '5')] },
  { ...base, ma: 'TS_ACTI_01', ten: 'Actimin 25', phanLoai: D.phanLoai, dnVatTu: D.dnVatTu2, hinhThuc: D.hinhThuc2, hoatChat: [hc(HC_THUONG, '25', true)] },
  { ...base, ma: 'TS_GLU_01', ten: 'Gluxide 480 DN', phanLoai: D.phanLoaiKst, dnVatTu: D.dnVatTu, hoatDong: false },
  { ...base, ma: 'TS_GLU_02', ten: 'Gluxide 500', phanLoai: D.phanLoaiKst, dnVatTu: D.dnVatTu },
];

/** Bản ghi do Admin DN B tạo */
export const DNB_SEED: ThuocRecord[] = [
  { ...base, ma: 'TS_DNB_01', ten: 'Thuốc DN B', phanLoai: D.phanLoai, dnVatTu: D.dnVatTu },
];
