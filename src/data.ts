import { D } from './env';

/** Hậu tố duy nhất cho mỗi lần chạy, để Mã/Tên không trùng dữ liệu cũ trên staging */
export const RUN = Date.now().toString(36).slice(-5).toUpperCase();
let seq = 0;
const next = () => (++seq).toString(36).toUpperCase();

/** Mã hợp lệ (chữ hoa, số, _ . -), luôn duy nhất và chứa RUN để dọn dữ liệu */
export const code = (prefix = 'TS_AT') => `${prefix}_${RUN}${next()}`.toUpperCase().slice(0, 50);
/** Tên duy nhất */
export const name = (prefix = 'Thuốc AT') => `${prefix} ${RUN}${next()}`;

export type HoatChat = { ten: string; hamLuong?: string; donVi?: string; chinh?: boolean };
export type DoiTuong = { nhom: string; loai?: string; dichBenh?: string };

export type ThuocRecord = {
  ma?: string;
  ten?: string;
  phanLoai?: string;
  dvt?: string;
  dangThuoc?: string;
  dangDongGoi?: string[];
  hinhThuc?: string;
  soQd?: string;
  xuatXu?: string;
  dnVatTu?: string;
  hoatChat?: HoatChat[];
  doiTuong?: DoiTuong[];
  nguon?: string;
  moTa?: string;
  hinhAnh?: string[];
  hoatDong?: boolean;
};

/** Bản ghi chỉ gồm 7 trường bắt buộc (Test data chuẩn: Kháng sinh / lít / Đăng ký lưu hành / Việt Nam / Bayer) */
export function required(over: Partial<ThuocRecord> = {}): ThuocRecord {
  return {
    ma: code(), ten: name(), phanLoai: D.phanLoai, dvt: D.dvt, hinhThuc: D.hinhThuc, xuatXu: D.xuatXu, dnVatTu: D.dnVatTu,
    ...over,
  };
}

/** Bản ghi đầy đủ như Test data FUNCT-95 (TS_FULL_01) - mã/tên được làm duy nhất */
export function full(over: Partial<ThuocRecord> = {}): ThuocRecord {
  return {
    ma: code('TS_FULL'),
    ten: name('Thuốc đầy đủ'),
    phanLoai: D.phanLoai,
    dvt: D.dvt,
    dangThuoc: 'Dung dịch',
    dangDongGoi: [D.dangDongGoi[0]],
    hinhThuc: D.hinhThuc,
    soQd: 'TS1-0422',
    xuatXu: D.xuatXu2,
    dnVatTu: D.dnVatTu,
    hoatChat: [{ ten: D.hoatChat, hamLuong: '800', donVi: D.dvHoatChat, chinh: true }],
    doiTuong: [{ nhom: D.nhomTs, loai: D.loaiTs, dichBenh: D.dichBenh }],
    nguon: 'TT 25/2024',
    moTa: 'Mô tả tự động',
    hoatDong: true,
    ...over,
  };
}

/** Chuẩn hoá chuỗi để so sánh: gộp mọi loại khoảng trắng (kể cả nbsp, thin space) */
export const norm = (s: string | null | undefined) => (s ?? '').replace(/[\s   ]+/g, ' ').trim();
