/**
 * TẤT CẢ selector dùng chung nằm ở file này.
 * Khi chạy lần đầu trên staging, nếu case nào lỗi do "không tìm thấy phần tử",
 * dùng `npx playwright codegen <BASE_URL>` để xem selector thật rồi sửa tại đây,
 * KHÔNG cần sửa từng file test.
 */
export const UI = {
  // ---- Đăng nhập
  loginUser: 'input[name="username"], input[name="email"], input[type="email"], input[placeholder*="Tài khoản" i], input[placeholder*="Email" i], input[placeholder*="điện thoại" i], input[type="text"]',
  loginPass: 'input[type="password"]',
  loginButton: /đăng nhập/i,

  // ---- Màn Danh sách
  listTitle: /(Danh mục|Danh sách)?\s*Thuốc th(?:uỷ|ủy|uy) sản/i,
  /** Dấu hiệu đã vào đúng màn danh sách: lưới có cột Mã thuốc */
  listMarker: /^\s*Mã thuốc\s*$/i,
  searchBox: 'input[placeholder*="Tìm kiếm" i], input[placeholder*="Nhập mã" i]',
  table: 'table',
  tableRow: 'table tbody tr',
  emptyText: 'Không có dữ liệu',
  pager: '.ant-pagination, .p-paginator, .pagination, [class*="paginat"]',
  pagerItem: '.ant-pagination-item, .p-paginator-page, .page-item, [class*="paginat"] li, [class*="paginat"] button',
  rowSwitch: '[role="switch"], .ant-switch, .p-inputswitch, input[type="checkbox"]',

  // Icon thao tác trên dòng: thử lần lượt các selector, nếu không có thì dùng vị trí nút trong ô Thao tác
  actionView: '[title="Xem"], [aria-label="Xem"], [mattooltip="Xem"], [ptooltip="Xem"], [data-tooltip="Xem"]',
  actionEdit: '[title="Cập nhật"], [aria-label="Cập nhật"], [mattooltip="Cập nhật"], [ptooltip="Cập nhật"], [data-tooltip="Cập nhật"]',
  actionMore: '[title*="mở rộng" i], [aria-label*="mở rộng" i], [aria-label="more" i], [title="Thêm" i], .anticon-more, .anticon-ellipsis, button:has-text("•••"), button:has-text("...")',
  menuItem: '[role="menuitem"], .ant-dropdown-menu-item, .p-menuitem, .mat-mdc-menu-item, .dropdown-item, li',

  // ---- Popup / form
  dialog: '[role="dialog"], .ant-modal-content, .p-dialog, .modal-content, mat-dialog-container',
  dialogClose: '[aria-label="Close" i], [aria-label="Đóng" i], .ant-modal-close, .p-dialog-header-close, .btn-close, button.close',
  control: 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, [role="combobox"], select, .ant-select, .p-dropdown, mat-select',
  textInput: 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea',
  selectTrigger: '[role="combobox"], .ant-select-selector, .p-dropdown, mat-select, select',
  selectClear: '.ant-select-clear, .p-dropdown-clear-icon, [aria-label*="clear" i], [class*="clear"]',
  selectPanel: '.ant-select-dropdown:not(.ant-select-dropdown-hidden), .p-dropdown-panel, .p-multiselect-panel, .ng-dropdown-panel, .el-select-dropdown, .el-popper, .MuiAutocomplete-popper, .MuiPopover-paper, .cdk-overlay-pane, [role="listbox"], .dropdown-menu.show',
  selectSearch: '.ant-select-selection-search-input, .p-dropdown-filter, .p-multiselect-filter, .ng-input input, input[placeholder*="Tìm" i], input[type="search"]',
  selectOption: '[role="option"], .ant-select-item-option, .p-dropdown-item, .p-multiselect-item, .ng-option, .el-select-dropdown__item, .MuiAutocomplete-option, .MuiMenuItem-root, mat-option, .select2-results__option, .vs__dropdown-option, .dropdown-item',
  fieldError: '.ant-form-item-explain-error, .p-error, .invalid-feedback, .mat-mdc-form-field-error, .error-message, [class*="error-text"], [class*="errorMessage"]',
  checkbox: 'input[type="checkbox"], [role="checkbox"], .ant-checkbox, .p-checkbox',

  // ---- Bảng con trong popup (Hoạt chất, Đối tượng phòng trừ)
  subAddButton: /Thêm dòng/,
  subDelete: '[title*="Xoá" i], [title*="Xóa" i], [aria-label*="xoá" i], [aria-label*="xóa" i], .anticon-delete, [class*="trash"], [class*="delete"]',
  fileInput: 'input[type="file"]',
  tag: '.ant-tag, .p-tag, .p-chip, .ant-select-selection-item, [class*="tag"], [class*="chip"]',

  // ---- Popup Thêm từ hệ thống (dạng thẻ)
  card: '.ant-card, .p-card, [class*="card"]',

  // ---- Thông báo
  // App staging dùng Angular Material snack bar: <mat-snack-bar-container class="... toast-success">
  toast: 'mat-snack-bar-container, .mat-mdc-snack-bar-container, .ant-message-notice, .ant-notification-notice, .p-toast-message, .Toastify__toast, .toast, [role="alert"], [role="status"]',
  toastClose: '.ant-notification-notice-close, .p-toast-icon-close, .Toastify__close-button, .btn-close, [aria-label*="close" i], [aria-label*="đóng" i]',
  tooltip: '[role="tooltip"], .ant-tooltip-inner, .p-tooltip-text, .mat-mdc-tooltip',
};

export const LABELS = {
  ma: 'Mã thuốc',
  ten: 'Tên thuốc',
  phanLoai: 'Phân loại thuốc',
  dvt: 'Đơn vị tính',
  dangThuoc: 'Dạng thuốc',
  dangDongGoi: 'Dạng đóng gói',
  hinhThuc: 'Hình thức lưu hành',
  soQd: 'Số quyết định lưu hành',
  xuatXu: 'Xuất xứ',
  dnVatTu: 'Doanh nghiệp vật tư đầu vào',
  nguon: 'Nguồn trích dẫn',
  moTa: 'Mô tả',
  hinhAnh: 'Hình ảnh',
  hoatDong: 'Hoạt động',
  hoatChatTitle: 'Hoạt chất',
  doiTuongTitle: 'Đối tượng phòng trừ',
} as const;

/** 7 trường bắt buộc */
export const REQUIRED = [LABELS.ma, LABELS.ten, LABELS.phanLoai, LABELS.dvt, LABELS.hinhThuc, LABELS.xuatXu, LABELS.dnVatTu];

export const TITLES = {
  add: 'Thêm mới Thuốc thuỷ sản',
  edit: 'Cập nhật Thuốc thuỷ sản',
  detail: 'Chi tiết Thuốc thuỷ sản',
  fromSystem: 'Thêm mới Thuốc thuỷ sản từ hệ thống',
  importPage: 'Thêm Thuốc thuỷ sản từ Excel',
  history: 'Lịch sử thao tác',
};

export const MSG = {
  addOk: 'Thêm mới thành công',
  editOk: 'Cập nhật thành công',
  deleteOk: 'Xoá thành công dữ liệu đã chọn',
  exportOk: 'Xuất dữ liệu thành công',
  empty: (label: string) => `${label} không được để trống!`,
  maExists: 'Mã Thuốc thuỷ sản đã tồn tại!',
  tenExists: 'Tên Thuốc thuỷ sản đã tồn tại!',
  inUse: (ten: string, ma: string) => `Không thể xoá ${ten} [${ma}]. Dữ liệu đang được sử dụng`,
  confirmDelete: (ten: string, ma: string) => `Bạn có chắc chắn muốn xóa ${ten} - [${ma}] không?`,
  fileType: 'Tệp dữ liệu tải lên không đúng định dạng!',
  importType: 'File không đúng định dạng. Vui lòng tải lên file .xlsx.',
  pickOne: 'Vui lòng chọn ít nhất 1 bản ghi để thêm.',
  addFromSys: (n: number) => `Thêm mới thành công ${n} bản ghi đã chọn`,
  importOk: (n: number) => `Thêm mới thành công ${n} bản ghi`,
  imp: { required: 'Dữ liệu bắt buộc', notExist: 'Dữ liệu không tồn tại', exists: 'Dữ liệu đã tồn tại trong hệ thống', dupFile: 'Dữ liệu bị trùng lặp trong file import', valid: 'Hợp lệ' },
};

/** Tên file / sheet khi xuất */
export const EXPORT = {
  file: /DanhSachThuocThuySan.*\.xlsx$/i,
  templateSheets: ['Du_lieu_tai_len', 'Huong_dan', 'DM_tham_chieu'],
};
